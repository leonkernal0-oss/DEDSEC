import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Device } from '../types';
import { Terminal as TermIcon, Send, Trash2, Download, AlertCircle, Copy } from 'lucide-react';

interface PowerShellTerminalProps {
  device: Device | null;
}

export function PowerShellTerminal({ device }: PowerShellTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const deviceRef = useRef<Device | null>(null);

  // Keep device ref updated
  useEffect(() => {
    deviceRef.current = device;
  }, [device]);

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

    // Delay fit to ensure container is sized
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

    // Handle keyboard input
    term.onData((data) => {
      if (data === '\r') {
        handleCommand(inputValue);
      } else if (data === '\u007f') {
        setInputValue(prev => prev.slice(0, -1));
        term.write('\b \b');
      } else if (data >= ' ') {
        setInputValue(prev => prev + data);
        term.write(data);
      }
    });

    // Welcome message
    const dev = deviceRef.current;
    if (dev && dev.status === 'online') {
      printWelcome(term, dev);
    } else if (dev) {
      term.writeln('\r\n\x1b[31m  Device is offline. Cannot establish terminal session.\x1b[0m');
      term.writeln('\x1b[90m  Last seen: ' + new Date(dev.lastSeen).toLocaleString() + '\x1b[0m');
    } else {
      term.writeln('\r\n\x1b[90m  No device selected. Choose a device to start a PowerShell session.\x1b[0m');
    }

    return () => {
      window.removeEventListener('resize', handleResize);
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

  const printWelcome = (term: XTerminal, dev: Device) => {
    term.writeln('');
    term.writeln('\x1b[36m  ================================================\x1b[0m');
    term.writeln(`\x1b[36m  |\x1b[0m  \x1b[1;37mPowerShell Remote Session\x1b[0m`);
    term.writeln(`\x1b[36m  |\x1b[0m  \x1b[90mConnected to:\x1b[0m ${dev.name}`);
    term.writeln(`\x1b[36m  |\x1b[0m  \x1b[90mHostname:\x1b[0m    ${dev.hostname}`);
    term.writeln(`\x1b[36m  |\x1b[0m  \x1b[90mOS:\x1b[0m         ${dev.os}`);
    term.writeln(`\x1b[36m  |\x1b[0m  \x1b[90mLocation:\x1b[0m   ${dev.location.city}, ${dev.location.country}`);
    term.writeln('\x1b[36m  ================================================\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[32m  Windows PowerShell\x1b[0m');
    term.writeln('\x1b[90m  Copyright (C) Microsoft Corporation. All rights reserved.\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[90m  Type "help" for available commands.\x1b[0m');
    term.writeln('');
    writePrompt(term, dev);
  };

  const writePrompt = (term: XTerminal, dev: Device) => {
    term.write(`\r\n\x1b[34mPS ${dev.hostname}\\Users\\Admin>\x1b[0m `);
  };

  const handleCommand = (cmd: string) => {
    const term = xtermRef.current;
    const dev = deviceRef.current;
    if (!term || !dev || dev.status !== 'online') return;

    term.writeln('');
    setInputValue('');

    if (cmd.trim()) {
      setCommandHistory(prev => [...prev, cmd]);
      setHistoryIndex(-1);
      processCommand(term, cmd.trim(), dev);
    }

    writePrompt(term, dev);
  };

  const processCommand = (term: XTerminal, cmd: string, dev: Device) => {
    const lowerCmd = cmd.toLowerCase().trim();

    if (lowerCmd === 'cls' || lowerCmd === 'clear') {
      term.clear();
      return;
    }

    if (lowerCmd.startsWith('echo ')) {
      term.writeln(`\r\n${cmd.slice(5)}`);
      return;
    }

    if (lowerCmd === 'help') {
      term.writeln('');
      term.writeln('\x1b[33m  Available commands:\x1b[0m');
      term.writeln('  \x1b[36mGet-Process\x1b[0m       List running processes');
      term.writeln('  \x1b[36mGet-Service\x1b[0m       List services');
      term.writeln('  \x1b[36mGet-ComputerInfo\x1b[0m  System information');
      term.writeln('  \x1b[36mGet-NetIPAddress\x1b[0m  Network configuration');
      term.writeln('  \x1b[36mGet-Volume\x1b[0m        Disk volumes');
      term.writeln('  \x1b[36mdir / ls\x1b[0m          List directory');
      term.writeln('  \x1b[36msysteminfo\x1b[0m        System information');
      term.writeln('  \x1b[36mtasklist\x1b[0m          Running tasks');
      term.writeln('  \x1b[36mipconfig\x1b[0m          Network configuration');
      term.writeln('  \x1b[36mwhoami\x1b[0m            Current user');
      term.writeln('  \x1b[36mhostname\x1b[0m          Computer hostname');
      term.writeln('  \x1b[36mdate\x1b[0m              Current date/time');
      term.writeln('  \x1b[36mping <host>\x1b[0m       Ping a host');
      term.writeln('  \x1b[36mcls / clear\x1b[0m       Clear terminal');
      return;
    }

    if (lowerCmd.startsWith('ping ')) {
      const host = cmd.slice(5);
      term.writeln('');
      term.writeln(`  Pinging ${host} with 32 bytes of data:`);
      term.writeln(`  Reply from 142.250.80.46: bytes=32 time=12ms TTL=118`);
      term.writeln(`  Reply from 142.250.80.46: bytes=32 time=11ms TTL=118`);
      term.writeln(`  Reply from 142.250.80.46: bytes=32 time=13ms TTL=118`);
      term.writeln(`  Reply from 142.250.80.46: bytes=32 time=12ms TTL=118`);
      term.writeln('');
      term.writeln(`  Ping statistics for ${host}:`);
      term.writeln('      Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)');
      return;
    }

    if (lowerCmd === 'dir' || lowerCmd === 'ls') {
      term.writeln('');
      term.writeln(`  Directory of C:\\Users\\Admin`);
      term.writeln('');
      term.writeln('  01/15/2024  10:30 AM    <DIR>          .');
      term.writeln('  01/15/2024  10:30 AM    <DIR>          ..');
      term.writeln('  01/15/2024  09:00 AM    <DIR>          Desktop');
      term.writeln('  01/14/2024  03:22 PM    <DIR>          Documents');
      term.writeln('  01/14/2024  03:22 PM    <DIR>          Downloads');
      term.writeln('  01/10/2024  11:45 AM    <DIR>          Pictures');
      term.writeln('  01/12/2024  08:15 AM    <DIR>          Projects');
      term.writeln('                 0 File(s)              0 bytes');
      term.writeln('                 7 Dir(s)  234,567,890,123 bytes free');
      return;
    }

    if (lowerCmd === 'get-process' || lowerCmd === 'tasklist') {
      term.writeln('');
      term.writeln('\x1b[33m  Handles  NPM(K)    PM(K)      WS(K)   CPU(s)     Id  ProcessName\x1b[0m');
      term.writeln('  -------  ------    -----      -----   ------     --  -----------');
      term.writeln('      312      18    12456      24576     2.34   1234  chrome');
      term.writeln('      187      12     8920      15432     0.89   5678  explorer');
      term.writeln('       95       8     4560       8900     0.12   9012  svchost');
      term.writeln('      456      24    45678      67890    12.45   3456  powershell');
      term.writeln('      123      10     6780      12340     0.56   7890  notepad');
      term.writeln('');
      return;
    }

    if (lowerCmd === 'get-service') {
      term.writeln('');
      term.writeln('\x1b[33m  Status   Name               DisplayName\x1b[0m');
      term.writeln('  ------   ----               -----------');
      term.writeln('  Running  Audiosrv           Windows Audio');
      term.writeln('  Running  Dhcp               DHCP Client');
      term.writeln('  Running  Dnscache           DNS Client');
      term.writeln('  Running  WinRM              Windows Remote Management');
      term.writeln('  Stopped  RemoteRegistry     Remote Registry');
      term.writeln('');
      return;
    }

    if (lowerCmd === 'get-computerinfo' || lowerCmd === 'systeminfo') {
      term.writeln('');
      term.writeln(`  Host Name:                 ${dev.hostname}`);
      term.writeln(`  OS Name:                   ${dev.os}`);
      term.writeln(`  OS Version:                10.0.22621 Build 22621`);
      term.writeln(`  System Type:               x64-based PC`);
      term.writeln(`  Processor:                 Intel Core i7-12700K`);
      term.writeln(`  Total Physical Memory:     32,768 MB`);
      term.writeln(`  Available Physical Memory: ${(32768 * (1 - dev.ram / 100)).toFixed(0)} MB`);
      term.writeln(`  Network:                   ${dev.ip}`);
      term.writeln('');
      return;
    }

    if (lowerCmd === 'get-netipaddress' || lowerCmd === 'ipconfig') {
      term.writeln('');
      term.writeln('  Windows IP Configuration');
      term.writeln('');
      term.writeln('  Ethernet adapter Ethernet:');
      term.writeln(`     IPv4 Address. . . . . . . . . . . : ${dev.ip}`);
      term.writeln('     Subnet Mask . . . . . . . . . . . : 255.255.255.0');
      term.writeln('     Default Gateway . . . . . . . . . : 192.168.1.1');
      term.writeln('     DNS Servers . . . . . . . . . . . : 8.8.8.8');
      term.writeln('');
      return;
    }

    if (lowerCmd === 'get-volume') {
      term.writeln('');
      term.writeln('\x1b[33m  Drive  Label       SizeRemaining    Size  Health\x1b[0m');
      term.writeln('  -----  -----       -------------    ----  ------');
      term.writeln('  C      System      234.5 GB         500 GB   Healthy');
      term.writeln('  D      Data        890.2 GB         1000 GB  Healthy');
      term.writeln('');
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

    // Unknown command
    term.writeln(`\r\n\x1b[31m  '${cmd}' is not recognized as a command.\x1b[0m`);
    term.writeln(`\x1b[90m  Type 'help' for available commands.\x1b[0m`);
  };

  const handleSendCommand = () => {
    if (inputValue.trim()) {
      handleCommand(inputValue);
    }
  };

  const handleClearTerminal = () => {
    xtermRef.current?.clear();
    const dev = deviceRef.current;
    if (dev && dev.status === 'online') {
      writePrompt(xtermRef.current!, dev);
    }
  };

  const handleCopyOutput = () => {
    navigator.clipboard?.writeText(commandHistory.join('\n'));
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
            <span className="w-2 h-2 rounded-full bg-green-400 pulse-online" />
            <TermIcon className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-slate-200">PowerShell</span>
          </div>
          <span className="text-xs text-slate-600">|</span>
          <span className="text-xs text-slate-500">{device.hostname}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyOutput}
            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
            title="Copy output"
          >
            <Copy className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={handleClearTerminal}
            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
            title="Clear terminal"
          >
            <Trash2 className="w-4 h-4 text-slate-400" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
            title="Export log"
          >
            <Download className="w-4 h-4 text-slate-400" />
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
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (commandHistory.length > 0) {
                const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
                setHistoryIndex(newIndex);
                setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
              }
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
              } else {
                setHistoryIndex(-1);
                setInputValue('');
              }
            }
          }}
          placeholder="Type a PowerShell command..."
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
