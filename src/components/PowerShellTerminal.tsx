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

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
      theme: {
        background: '#0f172a',
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
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    // Handle keyboard input
    term.onData((data) => {
      if (data === '\r') {
        // Enter key
        handleCommand(inputValue);
      } else if (data === '\u007f') {
        // Backspace
        setInputValue(prev => prev.slice(0, -1));
        term.write('\b \b');
      } else if (data >= ' ') {
        setInputValue(prev => prev + data);
        term.write(data);
      }
    });

    // Welcome message
    if (device && device.status === 'online') {
      printWelcome(term, device);
    } else if (device) {
      term.writeln('\r\n\x1b[31m⚠ Device is offline. Cannot establish terminal session.\x1b[0m');
      term.writeln('\x1b[90m  Last seen: ' + new Date(device.lastSeen).toLocaleString() + '\x1b[0m');
    } else {
      term.writeln('\r\n\x1b[90mNo device selected. Choose a device from the sidebar to start a PowerShell session.\x1b[0m');
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [device]);

  // Refit on container size changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fitAddonRef.current?.fit();
    }, 100);
    return () => clearTimeout(timer);
  }, [device]);

  const printWelcome = (term: XTerminal, dev: Device) => {
    term.writeln('');
    term.writeln('\x1b[36m╔══════════════════════════════════════════════════════╗\x1b[0m');
    term.writeln(`\x1b[36m║\x1b[0m  \x1b[1;37mPowerShell Remote Session\x1b[0m                          \x1b[36m║\x1b[0m`);
    term.writeln(`\x1b[36m║\x1b[0m  \x1b[90mConnected to:\x1b[0m ${dev.name.padEnd(37)}\x1b[36m║\x1b[0m`);
    term.writeln(`\x1b[36m║\x1b[0m  \x1b[90mHostname:\x1b[0m    ${dev.hostname.padEnd(37)}\x1b[36m║\x1b[0m`);
    term.writeln(`\x1b[36m║\x1b[0m  \x1b[90mOS:\x1b[0m         ${dev.os.padEnd(37)}\x1b[36m║\x1b[0m`);
    term.writeln(`\x1b[36m║\x1b[0m  \x1b[90mLocation:\x1b[0m   ${dev.location.city.padEnd(37)}\x1b[36m║\x1b[0m`);
    term.writeln('\x1b[36m╚══════════════════════════════════════════════════════╝\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[32mWindows PowerShell\x1b[0m');
    term.writeln('\x1b[90mCopyright (C) Microsoft Corporation. All rights reserved.\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[90mTry the new cross-platform PowerShell: https://aka.ms/pscore6\x1b[0m');
    term.writeln('');
    writePrompt(term, dev);
  };

  const writePrompt = (term: XTerminal, dev: Device) => {
    term.write(`\r\n\x1b[34mPS ${dev.hostname}\\Users\\Admin>\x1b[0m `);
  };

  const handleCommand = (cmd: string) => {
    const term = xtermRef.current;
    if (!term || !device || device.status !== 'online') return;

    term.writeln('');
    setInputValue('');

    if (cmd.trim()) {
      setCommandHistory(prev => [...prev, cmd]);
      setHistoryIndex(-1);
      processCommand(term, cmd.trim(), device);
    }

    writePrompt(term, device);
  };

  const processCommand = (term: XTerminal, cmd: string, dev: Device) => {
    const lowerCmd = cmd.toLowerCase().trim();

    // Simulated command responses
    const responses: Record<string, () => string[]> = {
      'help': () => [
        '\x1b[33mAvailable simulated commands:\x1b[0m',
        '  \x1b[36mGet-Process\x1b[0m       - List running processes',
        '  \x1b[36mGet-Service\x1b[0m       - List services',
        '  \x1b[36mGet-ComputerInfo\x1b[0m  - Show system information',
        '  \x1b[36mGet-NetIPAddress\x1b[0m  - Show network configuration',
        '  \x1b[36mGet-Volume\x1b[0m        - Show disk volumes',
        '  \x1b[36mdir / ls\x1b[0m          - List directory',
        '  \x1b[36mcls / clear\x1b[0m       - Clear terminal',
        '  \x1b[36msysteminfo\x1b[0m        - System information',
        '  \x1b[36mtasklist\x1b[0m          - Running tasks',
        '  \x1b[36mipconfig\x1b[0m          - Network configuration',
        '  \x1b[36mwhoami\x1b[0m            - Current user',
        '  \x1b[36mhostname\x1b[0m          - Computer hostname',
        '  \x1b[36mdate\x1b[0m              - Current date/time',
        '  \x1b[36mecho\x1b[0m              - Print text',
        '  \x1b[36mping\x1b[0m              - Ping a host',
        '',
      ],
      'get-process': () => [
        '',
        '\x1b[33mHandles  NPM(K)    PM(K)      WS(K)   CPU(s)     Id  SI ProcessName\x1b[0m',
        '-------  ------    -----      -----   ------     --  -- -----------',
        '    312      18    12456      24576     2.34   1234   1 chrome',
        '    187      12     8920      15432     0.89   5678   1 explorer',
        '     95       8     4560       8900     0.12   9012   1 svchost',
        '    456      24    45678      67890    12.45   3456   1 powershell',
        '    123      10     6780      12340     0.56   7890   1 notepad',
        '     67       6     2340       4560     0.03   2345   1 dwm',
        '',
      ],
      'get-service': () => [
        '',
        '\x1b[33mStatus   Name               DisplayName\x1b[0m',
        '------   ----               -----------',
        'Running  Audiosrv           Windows Audio',
        'Running  Dhcp               DHCP Client',
        'Running  Dnscache           DNS Client',
        'Running  LanmanServer       Server',
        'Running  LanmanWorkstation  Workstation',
        'Stopped  RemoteRegistry     Remote Registry',
        'Running  WinRM              Windows Remote Management',
        'Running  W32Time            Windows Time',
        '',
      ],
      'get-computerinfo': () => [
        '',
        `WindowsProductName     : ${dev.os}`,
        `WindowsVersion         : 10.0.22621`,
        `OsArchitecture         : 64-bit`,
        `CsName                 : ${dev.hostname}`,
        `CsProcessors           : Intel Core i7-12700K`,
        `CsTotalPhysicalMemory  : 34359738368 (32 GB)`,
        `OsLastBootUpTime       : ${new Date(Date.now() - 86400000 * 3).toISOString()}`,
        `TimeZone               : (UTC-05:00) Eastern Time`,
        '',
      ],
      'get-netipaddress': () => [
        '',
        '\x1b[33mIPAddress      InterfaceAlias        AddressFamily\x1b[0m',
        '---------      ----------------        -------------',
        `${dev.ip.padEnd(15)}Ethernet                IPv4`,
        `::1              Loopback                IPv6`,
        'fe80::1          Ethernet                IPv6',
        '',
      ],
      'get-volume': () => [
        '',
        '\x1b[33mDriveLetter  FileSystemLabel  SizeRemaining    Size  HealthStatus\x1b[0m',
        '-----------  ---------------  -------------    ----  ------------',
        'C            System           234.5 GB         500 GB   Healthy',
        'D            Data             890.2 GB         1000 GB  Healthy',
        'E            Backup           456.7 GB         500 GB   Healthy',
        '',
      ],
      'dir': () => [''],
      'ls': () => [''],
      'systeminfo': () => [
        '',
        `Host Name:                 ${dev.hostname}`,
        `OS Name:                   ${dev.os}`,
        `OS Version:                10.0.22621 Build 22621`,
        `System Manufacturer:       Custom Build`,
        `System Model:              Desktop PC`,
        `System Type:               x64-based PC`,
        `Processor(s):              1 Processor(s) Installed. Intel Core i7-12700K`,
        `Total Physical Memory:     32,768 MB`,
        `Available Physical Memory: ${(32768 * (1 - dev.ram / 100)).toFixed(0)} MB`,
        `Virtual Memory: Max Size:  65,536 MB`,
        `Network Card(s):           1 NIC(s) Installed.`,
        '',
      ],
      'tasklist': () => [
        '',
        '\x1b[33mImage Name                     PID Session Name        Mem Usage\x1b[0m',
        '========================= ======== ================ ============',
        'System Idle Process              0 Services                  8 K',
        'System                           4 Services                144 K',
        'chrome.exe                    1234 Console                24576 K',
        'explorer.exe                  5678 Console                15432 K',
        'powershell.exe                3456 Console                67890 K',
        'svchost.exe                   9012 Services                8900 K',
        'notepad.exe                   7890 Console                12340 K',
        '',
      ],
      'ipconfig': () => [
        '',
        'Windows IP Configuration',
        '',
        '',
        'Ethernet adapter Ethernet:',
        '',
        `   IPv4 Address. . . . . . . . . . . : ${dev.ip}`,
        '   Subnet Mask . . . . . . . . . . . : 255.255.255.0',
        '   Default Gateway . . . . . . . . . : 192.168.1.1',
        '   DNS Servers . . . . . . . . . . . : 8.8.8.8',
        '                                       8.8.4.4',
        '',
      ],
      'whoami': () => ['', `${dev.hostname}\\Admin`, ''],
      'hostname': () => ['', dev.hostname, ''],
      'date': () => ['', new Date().toString(), ''],
      'cls': () => [],
      'clear': () => [],
    };

    // Handle special commands
    if (lowerCmd === 'cls' || lowerCmd === 'clear') {
      term.clear();
      return;
    }

    if (lowerCmd.startsWith('echo ')) {
      const text = cmd.slice(5);
      term.writeln(`\r\n${text}`);
      return;
    }

    if (lowerCmd.startsWith('ping ')) {
      const host = cmd.slice(5);
      term.writeln('');
      term.writeln(`Pinging ${host} with 32 bytes of data:`);
      term.writeln(`Reply from 142.250.80.46: bytes=32 time=12ms TTL=118`);
      term.writeln(`Reply from 142.250.80.46: bytes=32 time=11ms TTL=118`);
      term.writeln(`Reply from 142.250.80.46: bytes=32 time=13ms TTL=118`);
      term.writeln(`Reply from 142.250.80.46: bytes=32 time=12ms TTL=118`);
      term.writeln('');
      term.writeln(`Ping statistics for ${host}:`);
      term.writeln('    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),');
      term.writeln('Approximate round trip times in milli-seconds:');
      term.writeln('    Minimum = 11ms, Maximum = 13ms, Average = 12ms');
      return;
    }

    if (lowerCmd === 'dir' || lowerCmd === 'ls') {
      term.writeln('');
      term.writeln(` Directory of C:\\Users\\Admin`);
      term.writeln('');
      term.writeln('01/15/2024  10:30 AM    <DIR>          .');
      term.writeln('01/15/2024  10:30 AM    <DIR>          ..');
      term.writeln('01/15/2024  09:00 AM    <DIR>          Desktop');
      term.writeln('01/14/2024  03:22 PM    <DIR>          Documents');
      term.writeln('01/14/2024  03:22 PM    <DIR>          Downloads');
      term.writeln('01/10/2024  11:45 AM    <DIR>          Pictures');
      term.writeln('01/12/2024  08:15 AM    <DIR>          Projects');
      term.writeln('               0 File(s)              0 bytes');
      term.writeln('               7 Dir(s)  234,567,890,123 bytes free');
      return;
    }

    // Check for matching command
    const handler = responses[lowerCmd];
    if (handler) {
      const lines = handler();
      lines.forEach(line => term.writeln(line));
      return;
    }

    // Unknown command
    term.writeln(`\x1b[31m'${cmd}' is not recognized as an internal or external command,\x1b[0m`);
    term.writeln(`\x1b[31moperable program or batch file.\x1b[0m`);
    term.writeln(`\x1b[90mType 'help' for available commands.\x1b[0m`);
  };

  const handleSendCommand = () => {
    if (inputValue.trim()) {
      handleCommand(inputValue);
    }
  };

  const handleClearTerminal = () => {
    xtermRef.current?.clear();
    if (device && device.status === 'online') {
      writePrompt(xtermRef.current!, device);
    }
  };

  const handleCopyOutput = () => {
    // In a real app, this would copy terminal buffer
    navigator.clipboard?.writeText(commandHistory.join('\n'));
  };

  if (!device) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center">
            <TermIcon className="w-10 h-10 text-slate-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-300">No Device Selected</h3>
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
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-300">Device Offline</h3>
            <p className="text-sm text-slate-500 mt-1">
              Cannot connect to {device.name}. Device is currently offline.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-900">
      {/* Terminal Toolbar */}
      <div className="h-10 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <TermIcon className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-300">PowerShell - {device.name}</span>
          </div>
          <span className="text-xs text-slate-500">|</span>
          <span className="text-xs text-slate-500">{device.hostname}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyOutput}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            title="Copy output"
          >
            <Copy className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={handleClearTerminal}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            title="Clear terminal"
          >
            <Trash2 className="w-4 h-4 text-slate-400" />
          </button>
          <button
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
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

      {/* Input bar (alternative to typing in terminal) */}
      <div className="h-10 bg-slate-800/80 border-t border-slate-700 flex items-center px-3 gap-2 shrink-0">
        <span className="text-xs text-blue-400 font-mono">PS&gt;</span>
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
          className="p-1.5 rounded bg-blue-600/20 hover:bg-blue-600/30 transition-colors"
          title="Send command"
        >
          <Send className="w-4 h-4 text-blue-400" />
        </button>
      </div>
    </div>
  );
}
