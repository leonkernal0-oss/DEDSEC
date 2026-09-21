import { Device } from '../types';
import {
  FolderOpen,
  File,
  ChevronRight,
  Download,
  Upload,
  Trash2,
  Plus,
  AlertCircle,
  Home,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { useState } from 'react';

interface FileManagerProps {
  device: Device | null;
}

interface FileItem {
  name: string;
  type: 'folder' | 'file';
  size?: string;
  modified: string;
  icon?: string;
}

const DEMO_FILES: Record<string, FileItem[]> = {
  'C:\\Users\\Admin': [
    { name: 'Desktop', type: 'folder', modified: '2024-01-15 10:30' },
    { name: 'Documents', type: 'folder', modified: '2024-01-14 15:22' },
    { name: 'Downloads', type: 'folder', modified: '2024-01-15 09:45' },
    { name: 'Pictures', type: 'folder', modified: '2024-01-10 11:45' },
    { name: 'Videos', type: 'folder', modified: '2024-01-08 16:30' },
    { name: 'Music', type: 'folder', modified: '2024-01-05 14:20' },
    { name: 'Projects', type: 'folder', modified: '2024-01-12 08:15' },
    { name: 'notes.txt', type: 'file', size: '2.4 KB', modified: '2024-01-15 11:00' },
    { name: 'todo.md', type: 'file', size: '1.1 KB', modified: '2024-01-14 09:30' },
  ],
  'C:\\Users\\Admin\\Desktop': [
    { name: 'project.zip', type: 'file', size: '45.2 MB', modified: '2024-01-15 10:00' },
    { name: 'screenshot.png', type: 'file', size: '1.8 MB', modified: '2024-01-14 16:45' },
    { name: 'report.docx', type: 'file', size: '3.2 MB', modified: '2024-01-13 11:20' },
    { name: 'backup', type: 'folder', modified: '2024-01-10 09:00' },
  ],
  'C:\\Users\\Admin\\Documents': [
    { name: 'Work', type: 'folder', modified: '2024-01-14 15:22' },
    { name: 'Personal', type: 'folder', modified: '2024-01-12 10:15' },
    { name: 'resume.pdf', type: 'file', size: '256 KB', modified: '2024-01-10 14:30' },
    { name: 'budget.xlsx', type: 'file', size: '128 KB', modified: '2024-01-08 09:45' },
  ],
  'C:\\Users\\Admin\\Downloads': [
    { name: 'installer.exe', type: 'file', size: '89.4 MB', modified: '2024-01-15 09:45' },
    { name: 'photo_001.jpg', type: 'file', size: '3.2 MB', modified: '2024-01-14 18:30' },
    { name: 'archive.zip', type: 'file', size: '156 MB', modified: '2024-01-13 12:00' },
    { name: 'video.mp4', type: 'file', size: '245 MB', modified: '2024-01-12 16:20' },
    { name: 'document.pdf', type: 'file', size: '1.5 MB', modified: '2024-01-11 10:15' },
  ],
};

export function FileManager({ device }: FileManagerProps) {
  const [currentPath, setCurrentPath] = useState('C:\\Users\\Admin');
  const [pathHistory, setPathHistory] = useState<string[]>(['C:\\Users\\Admin']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  if (!device) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0e1a]">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="w-20 h-20 mx-auto bg-slate-800/60 rounded-2xl flex items-center justify-center border border-slate-700/40">
            <FolderOpen className="w-10 h-10 text-slate-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">No Device Selected</h3>
            <p className="text-sm text-slate-500 mt-1">
              Select a device to browse its files
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
              Cannot access files. Device is offline.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const files = DEMO_FILES[currentPath] || [];
  const filteredFiles = searchQuery
    ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    const newHistory = [...pathHistory.slice(0, historyIndex + 1), path];
    setPathHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setSelectedFiles([]);
    setSearchQuery('');
  };

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentPath(pathHistory[historyIndex - 1]);
      setSelectedFiles([]);
    }
  };

  const goForward = () => {
    if (historyIndex < pathHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentPath(pathHistory[historyIndex + 1]);
      setSelectedFiles([]);
    }
  };

  const goHome = () => {
    navigateTo('C:\\Users\\Admin');
  };

  const pathParts = currentPath.split('\\');

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0e1a]">
      {/* Toolbar */}
      <div className="h-14 bg-[#0d1225] border-b border-slate-800/80 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            disabled={historyIndex === 0}
            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={goForward}
            disabled={historyIndex === pathHistory.length - 1}
            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={goHome}
            className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <Home className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Path breadcrumb */}
        <div className="flex-1 mx-4 flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/40 overflow-x-auto">
          {pathParts.map((part, i) => (
            <div key={i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="w-3 h-3 text-slate-600" />}
              <button
                onClick={() => navigateTo(pathParts.slice(0, i + 1).join('\\'))}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                {part}
              </button>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-800/40 border border-slate-700/40 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 w-40"
            />
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="h-10 bg-[#0d1225]/60 border-b border-slate-800/60 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors">
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
          {selectedFiles.length > 0 && (
            <button className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              Delete ({selectedFiles.length})
            </button>
          )}
        </div>
        <div className="text-xs text-slate-500">
          {filteredFiles.length} items
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-[1fr,100px,150px] gap-4 px-3 py-2 text-xs font-medium text-slate-500 border-b border-slate-800/60">
            <span>Name</span>
            <span>Size</span>
            <span>Modified</span>
          </div>

          {/* Files */}
          {filteredFiles.map((file) => (
            <div
              key={file.name}
              onClick={() => {
                if (file.type === 'folder') {
                  navigateTo(`${currentPath}\\${file.name}`);
                } else {
                  setSelectedFiles([file.name]);
                }
              }}
              className={`
                grid grid-cols-[1fr,100px,150px] gap-4 px-3 py-2.5 rounded-lg cursor-pointer transition-all
                ${selectedFiles.includes(file.name)
                  ? 'bg-blue-600/10 border border-blue-500/20'
                  : 'hover:bg-slate-800/40 border border-transparent'
                }
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  file.type === 'folder'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {file.type === 'folder' ? (
                    <FolderOpen className="w-4 h-4" />
                  ) : (
                    <File className="w-4 h-4" />
                  )}
                </div>
                <span className="text-sm text-slate-200 truncate">{file.name}</span>
              </div>
              <span className="text-xs text-slate-500 flex items-center">
                {file.size || '—'}
              </span>
              <span className="text-xs text-slate-500 flex items-center">
                {file.modified}
              </span>
            </div>
          ))}

          {filteredFiles.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {searchQuery ? 'No files match your search' : 'This folder is empty'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="h-8 bg-[#0d1225] border-t border-slate-800/80 flex items-center justify-between px-4 shrink-0">
        <span className="text-[11px] text-slate-500">
          Connected to {device.name} • {currentPath}
        </span>
        <span className="text-[11px] text-slate-500">
          {selectedFiles.length > 0 ? `${selectedFiles.length} selected` : 'Ready'}
        </span>
      </div>
    </div>
  );
}
