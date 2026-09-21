import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Device } from '../types';
import { Terminal as TermIcon, Send, Trash2, Download, AlertCircle, Copy, Plug, PlugZap } from 'lucide-react';

interface PowerShellTerminalProps {
  device: Device | null;
}

export function PowerShellTerminal({ device }: PowerShellTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
      theme: {
        background: '#0a0e1a',
        foreground: '#e2e8f0',
        cursor: '#3b82f6',
        selectionBackground: '#1e40af40',
        black: '#1e293b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e2e8f0',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#f8fafc',
      },
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    setTimeout(() => {
      try { fitAddon.fit(); } catch(e) {}
    }, 100);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle resize
    const handleResize = () => {
      try { fitAddon.fit(); } catch(e) {}
    };
    window.addEventListener('resize', handleResize);

    // If device is available and online, try to connect via WebSocket
    if (device && device.status === 'online' && device.tunnelUrl) {
      connectToTerminal(term, device);
    } else if (device && device.status !== 'online') {
      term.writeln('\r\n\x1b[31m  Device is offline. Cannot establish terminal session.\x1b[0m');
    } else {
      term.writeln('\r\n\x1b[90m  No device selected. Choose a device to start a PowerShell session.\x1b[0m');
      term.writeln('\x1b[90m  Click "Add Device" in the top right to register a PC.\x1b[0m');
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      term.dispose();
    };
  }, [device?.id]);

  // Refit when device changes
  useEffect(() => {
    const timer = setTimeout(() => {
      try { fitAddonRef.current?.fit(); } catch(e) {}
    }, 150);
    return () => clearTimeout(timer);
  }, [device]);

  const connectToTerminal = (term: XTerminal, dev: Device) => {
    term.writeln('');
    term.writeln('\x1b[36m  ================================================\x1b[0m');
    term.writeln(`\x1b[36m  |\x1b[0m  \x1b[1;37mRemoteDesk Terminal\x1b[0m`);
    term.writeln(`\x1b[36m  |\x1b[0m  \x1b[90mConnecting to:\x1b[0m ${dev.name}`);
    term.writeln(`\x1b[36m  |\x1b[0m  \x1b[90mTunnel:\x1b[0m ${dev.tunnelUrl}`);
    term.writeln('\x1b[36m  ================================================\x1b[0m');
    term.writeln('');

    // Build WebSocket URL for terminal
    // The setup script should also expose a terminal WebSocket endpoint
    const wsUrl = dev.tunnelUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');
    
    // Try connecting to a terminal WebSocket endpoint
    // In production, the setup script would run a WebSocket server for terminal access
    const terminalWsUrl = `${wsUrl}/terminal`;
    
    term.writeln('\x1b[33m  [*] Attempting WebSocket connection...\x1b[0m');
    term.writeln(`\x1b[90m  URL: ${terminalWsUrl}\x1b[0m`);
    term.writeln('');

    try {
      const ws = new WebSocket(terminalWsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionError('');
        term.writeln('\x1b[32m  [OK] Connected! Type commands below.\x1b[0m');
        term.writeln('\x1b[90m  (You can also use the input bar at the bottom)\x1b[0m');
        term.writeln('');
        writePrompt(term, dev);
      };

      ws.onmessage = (event) => {
        term.write(event.data);
      };

      ws.onerror = () => {
        setConnectionError('WebSocket connection failed');
        term.writeln('\x1b[31m  [!] WebSocket connection failed.\x1b[0m');
        term.writeln('');
        showFallbackInfo(term, dev);
      };

      ws.onclose = () => {
        setIsConnected(false);
        term.writeln('\r\n\x1b[33m  Connection closed.\x1b[0m');
      };

      // Handle terminal input
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        } else {
          // Fallback: simulate commands locally
          handleLocalCommand(term, data, dev);
        }
      });

      // Timeout - if not connected in 5 seconds, show fallback
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          setConnectionError('Connection timeout');
          showFallbackInfo(term, dev);
        }
      }, 5000);

    } catch (e) {
      setConnectionError('Failed to create WebSocket');
      showFallbackInfo(term, dev);
    }
  };

  const showFallbackInfo = (term: XTerminal, dev: Device) => {
    term.writeln('\x1b[33m  ────────────────────────────────────────────────\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[33m  [INFO] Direct WebSocket terminal not available.\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[90m  The setup script creates a VNC tunnel but not a\x1b[0m');
    term.writeln('\x1b[90m  terminal WebSocket. To get full terminal access:\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[36m  Option 1: Use Screen Control (VNC)\x1b[0m');
    term.writeln('\x1b[90m  → Open PowerShell from the remote desktop\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[36m  Option 2: Upgrade the setup script\x1b[0m');
    term.writeln('\x1b[90m  → Add a WebSocket terminal server to the script\x1b[0m');
    term.writeln('\x1b[90m  → Example: python -m websockify 6081 localhost:5901\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[33m  ────────────────────────────────────────────────\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[90m  Device: ' + dev.name + '\x1b[0m');
    term.writeln('\x1b[90m  Tunnel: ' + dev.tunnelUrl + '\x1b[0m');
    term.writeln('\x1b[90m  Status: ' + (isConnected ? 'Connected' : 'Not connected') + '\x1b[0m');
    term.writeln('');
    writePrompt(term, dev);
    
    // Enable local command simulation
    enableLocalMode(term, dev);
  };

  const enableLocalMode = (term: XTerminal, dev: Device) => {
    let currentInput = '';
    
    term.onData((data) => {
      if (data === '\r') {
        term.writeln('');
        processLocalCommand(term, currentInput.trim(), dev);
        currentInput = '';
        writePrompt(term, dev);
      } else if (data === '\u007f') {
        if (currentInput.length > 0) {
          currentInput = currentInput.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data >= ' ') {
        currentInput += data;
        term.write(data);
      }
    });
  };

  const handleLocalCommand = (term: XTerminal, data: string, dev: Device) => {
    // This is called when WebSocket is not connected
    // Just ignore - the enableLocalMode handler will process it
  };

  const writePrompt = (term: XTerminal, dev: Device) => {
    term.write(`\r\n\x1b[34mPS ${dev.hostname}\\Users\\Admin>\x1b[0m `);
  };

  const processLocalCommand = (term: XTerminal, cmd: string, dev: Device) => {
    if (!cmd) return;
    
    const lowerCmd = cmd.toLowerCase();

    if (lowerCmd === 'help') {
      term.writeln('');
      term.writeln('\x1b[33m  Available commands (simulated):\x1b[0m');
      term.writeln('  \x1b[36mhelp\x1b[0m             Show this help');
      term.writeln('  \x1b[36mdir / ls\x1b[0m         List files');
      term.writeln('  \x1b[36mwhoami\x1b[0m           Show current user');
      term.writeln('  \x1b[36mhostname\x1b[0m         Show hostname');
      term.writeln('  \x1b[36msysteminfo\x1b[0m       Show system info');
      term.writeln('  \x1b[36mipconfig\x1b[0m         Show network info');
      term.writeln('  \x1b[36mdate\x1b[0m             Show date/time');
      term.writeln('  \x1b[36mecho <text>\x1b[0m      Print text');
      term.writeln('  \x1b[36mcls / clear\x1b[0m      Clear screen');
      term.writeln('');
      term.writeln('\x1b[90m  Note: For real commands, connect via VNC and\x1b[0m');
      term.writeln('\x1b[90m  open PowerShell on the remote desktop.\x1b[0m');
      return;
    }

    if (lowerCmd === 'cls' || lowerCmd === 'clear') {
      term.clear();
      return;
    }

    if (lowerCmd === 'whoami') {
      term.writeln(`\r\n  ${dev.hostname}\\Admin`);
      return;
    }

    if (lowerCmd === 'hostname') {
      term.writeln(`\r\n  ${dev.hostname}`);
      return;
    }

    if (lowerCmd === 'date') {
      term.writeln(`\r\n  ${new Date().toString()}`);
      return;
    }

    if (lowerCmd.startsWith('echo ')) {
      term.writeln(`\r\n  ${cmd.slice(5)}`);
      return;
    }

    if (lowerCmd === 'systeminfo') {
      term.writeln('');
      term.writeln(`  Host Name:        ${dev.hostname}`);
      term.writeln(`  OS:               ${dev.os}`);
      term.writeln(`  Tunnel URL:       ${dev.tunnelUrl}`);
      term.writeln(`  Last Seen:        ${new Date(dev.lastSeen).toLocaleString()}`);
      term.writeln('');
      return;
    }

    if (lowerCmd === 'ipconfig') {
      term.writeln('');
      term.writeln('  Ethernet adapter:');
      term.writeln(`     IP Address:  ${dev.ip}`);
      term.writeln('     Tunnel:      ' + dev.tunnelUrl);
      term.writeln('');
      return;
    }

    if (lowerCmd === 'dir' || lowerCmd === 'ls') {
      term.writeln('');
      term.writeln('  Directory of C:\\Users\\Admin');
      term.writeln('');
      term.writeln('  01/15/2024  10:30 AM    <DIR>          Desktop');
      term.writeln('  01/14/2024  03:22 PM    <DIR>          Documents');
      term.writeln('  01/14/2024  03:22 PM    <DIR>          Downloads');
      term.writeln('  01/10/2024  11:45 AM    <DIR>          Pictures');
      term.writeln('');
      return;
    }

    term.writeln(`\r\n\x1b[31m  '${cmd}' - Use VNC screen control for real commands.\x1b[0m`);
    term.writeln(`\x1b[90m  Type 'help' for available simulated commands.\x1b[0m`);
  };

  const handleSendCommand = () => {
    const term = xtermRef.current;
    if (!term || !device) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(inputValue + '\r\n');
    } else {
      // Local mode
      term.writeln('');
      processLocalCommand(term, inputValue.trim(), device);
      writePrompt(term, device);
    }
    setInputValue('');
  };

  const handleClearTerminal = () => {
    xtermRef.current?.clear();
    if (device && device.status === 'online') {
      writePrompt(xtermRef.current!, device);
    }
  };

  if (!device) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0e1a]">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="w-20 h-20 mx-auto bg-slate-800/60 rounded-2xl flex items-center justify-center border border-slate-700/40">
            <TermIcon className="w-10 h-10 text-slate-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">No Device Selected</h3>
            <p className="text-sm text-slate-500 mt-1">
              Select a device to open a remote PowerShell session
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (device.status !== 'online') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0e1a]">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">Device Offline</h3>
            <p className="text-sm text-slate-500 mt-1">
              Cannot connect to {device.name}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0e1a]">
      {/* Terminal Toolbar */}
      <div className="h-12 bg-[#0d1225] border-b border-slate-800/80 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <PlugZap className="w-4 h-4 text-green-400" />
            ) : (
              <Plug className="w-4 h-4 text-slate-500" />
            )}
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 pulse-online' : 'bg-slate-600'}`} />
            <span className="text-sm font-medium text-slate-200">PowerShell</span>
          </div>
          <span className="text-xs text-slate-600">|</span>
          <span className="text-xs text-slate-500">{device.hostname}</span>
          {connectionError && (
            <>
              <span className="text-xs text-slate-600">|</span>
              <span className="text-xs text-amber-400">{connectionError}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearTerminal}
            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
            title="Clear terminal"
          >
            <Trash2 className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div className="flex-1 overflow-hidden">
        <div ref={terminalRef} className="w-full h-full" />
      </div>

      {/* Input bar */}
      <div className="h-11 bg-[#0d1225] border-t border-slate-800/80 flex items-center px-4 gap-3 shrink-0">
        <span className="text-xs text-blue-400 font-mono font-bold">PS&gt;</span>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendCommand();
          }}
          placeholder="Type a command..."
          className="flex-1 bg-transparent text-sm text-slate-200 font-mono outline-none placeholder:text-slate-600"
        />
        <button
          onClick={handleSendCommand}
          className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 transition-colors border border-blue-500/20"
          title="Send command"
        >
          <Send className="w-4 h-4 text-blue-400" />
        </button>
      </div>
    </div>
  );
}
