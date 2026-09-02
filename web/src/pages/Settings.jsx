import React, { useState, useEffect } from 'react';
import { 
  FolderDown, 
  Sun, 
  Moon, 
  Monitor, 
  Bell, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Folder
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { Modal } from '../components/Modal';

export const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [settings, setSettings] = useState(() => storageService.getSettings());
  const [folderNotice, setFolderNotice] = useState('');
  const [clearModalOpen, setClearModalOpen] = useState(false);

  useEffect(() => {
    storageService.saveSettings(settings);
  }, [settings]);

  // Folder Selection Handler
  const handleChooseFolder = async () => {
    setFolderNotice('');
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await window.showDirectoryPicker();
        if (handle && handle.name) {
          const updated = { ...settings, downloadLocation: 'custom', folderPath: handle.name };
          setSettings(updated);
          setFolderNotice(`Selected folder: ${handle.name}`);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setFolderNotice('Folder selection is available in the desktop version.');
        }
      }
    } else {
      setFolderNotice('Folder selection is available in the desktop version.');
    }
  };

  const handleSelectDefaultLocation = () => {
    setSettings(prev => ({ ...prev, downloadLocation: 'default', folderPath: 'Downloads' }));
    setFolderNotice('');
  };

  const handleToggleAutoSave = () => {
    setSettings(prev => ({ ...prev, autoSaveHistory: !prev.autoSaveHistory }));
  };

  const handleToggleNotifyComplete = () => {
    setSettings(prev => ({ ...prev, notifyComplete: !prev.notifyComplete }));
  };

  const handleToggleNotifyFailed = () => {
    setSettings(prev => ({ ...prev, notifyFailed: !prev.notifyFailed }));
  };

  const handleConfirmClearHistory = () => {
    storageService.clearHistory();
    setClearModalOpen(false);
    showToast({
      type: 'success',
      title: 'History Cleared',
      message: 'Download history cleared.'
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 space-y-8">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-3xl font-extrabold theme-text-primary tracking-tight">Settings</h1>
        <p className="theme-text-secondary text-sm mt-1">Customize your download and notification preferences.</p>
      </div>

      {/* SECTION 1: DOWNLOAD LOCATION */}
      <div className="rounded-2xl glass-panel p-6 shadow-lg space-y-5">
        <div className="flex items-center gap-2.5 border-b border-slate-700/40 pb-3">
          <FolderDown className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-semibold theme-text-primary">Download Location</h2>
        </div>

        <div className="space-y-4 pt-1">
          {/* Default Downloads */}
          <div 
            onClick={handleSelectDefaultLocation}
            className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              settings.downloadLocation === 'default'
                ? 'bg-brand-500/10 border-brand-500 theme-text-primary'
                : 'btn-secondary border-slate-700/40'
            }`}
          >
            <div>
              <p className="text-sm font-semibold">Default Downloads</p>
              <p className="text-xs theme-text-muted mt-0.5">Save files directly to browser default downloads folder</p>
            </div>
            {settings.downloadLocation === 'default' && (
              <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
            )}
          </div>

          {/* Choose Folder */}
          <div className="p-4 rounded-xl btn-secondary border-slate-700/40 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold theme-text-primary">Choose Folder</p>
                <p className="text-xs theme-text-secondary mt-0.5">
                  Current path: <span className="font-mono text-brand-400">{settings.folderPath || 'Downloads'}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleChooseFolder}
                className="btn-secondary text-xs px-4 py-2 shrink-0 flex items-center gap-2"
              >
                <Folder className="w-4 h-4 text-brand-400" /> Choose Folder
              </button>
            </div>

            {folderNotice && (
              <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                {folderNotice}
              </p>
            )}
          </div>

          {/* Auto Save to History Toggle */}
          <div className="flex items-center justify-between py-3 border-t border-slate-700/40">
            <div>
              <p className="text-sm font-semibold theme-text-primary">Auto Save to History</p>
              <p className="text-xs theme-text-secondary">Automatically add completed downloads to History</p>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoSave}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                settings.autoSaveHistory ? 'bg-brand-600 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md block"></span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: THEME */}
      <div className="rounded-2xl glass-panel p-6 shadow-lg space-y-5">
        <div className="flex items-center gap-2.5 border-b border-slate-700/40 pb-3">
          <Moon className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-semibold theme-text-primary">Theme</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Light Theme */}
          <label 
            className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
              theme === 'light'
                ? 'bg-brand-500/10 border-brand-500 theme-text-primary'
                : 'btn-secondary border-slate-700/40'
            }`}
          >
            <input 
              type="radio" 
              name="theme" 
              value="light" 
              checked={theme === 'light'} 
              onChange={() => setTheme('light')}
              className="hidden" 
            />
            <Sun className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium">Light</span>
          </label>

          {/* Dark Theme */}
          <label 
            className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
              theme === 'dark'
                ? 'bg-brand-500/10 border-brand-500 theme-text-primary'
                : 'btn-secondary border-slate-700/40'
            }`}
          >
            <input 
              type="radio" 
              name="theme" 
              value="dark" 
              checked={theme === 'dark'} 
              onChange={() => setTheme('dark')}
              className="hidden" 
            />
            <Moon className="w-5 h-5 text-brand-400" />
            <span className="text-sm font-medium">Dark</span>
          </label>

          {/* System Default */}
          <label 
            className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
              theme === 'system'
                ? 'bg-brand-500/10 border-brand-500 theme-text-primary'
                : 'btn-secondary border-slate-700/40'
            }`}
          >
            <input 
              type="radio" 
              name="theme" 
              value="system" 
              checked={theme === 'system'} 
              onChange={() => setTheme('system')}
              className="hidden" 
            />
            <Monitor className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium">System Default</span>
          </label>
        </div>
      </div>

      {/* SECTION 3: NOTIFICATIONS */}
      <div className="rounded-2xl glass-panel p-6 shadow-lg space-y-5">
        <div className="flex items-center gap-2.5 border-b border-slate-700/40 pb-3">
          <Bell className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-semibold theme-text-primary">Notifications</h2>
        </div>

        <div className="space-y-4 pt-1">
          {/* Download Complete */}
          <div className="flex items-center justify-between py-2 border-b border-slate-700/40">
            <div>
              <p className="text-sm font-semibold theme-text-primary">Download Complete</p>
              <p className="text-xs theme-text-secondary">Show notification toast when video finishes downloading</p>
            </div>
            <button
              type="button"
              onClick={handleToggleNotifyComplete}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                settings.notifyComplete ? 'bg-brand-600 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md block"></span>
            </button>
          </div>

          {/* Download Failed */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold theme-text-primary">Download Failed</p>
              <p className="text-xs theme-text-secondary">Show notification toast when video download fails</p>
            </div>
            <button
              type="button"
              onClick={handleToggleNotifyFailed}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                settings.notifyFailed ? 'bg-brand-600 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md block"></span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 4: CLEAR HISTORY */}
      <div className="rounded-2xl glass-panel p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-700/40 pb-3">
          <Trash2 className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-semibold theme-text-primary">Clear History</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
          <div>
            <p className="text-sm font-semibold theme-text-primary">Clear all download history.</p>
            <p className="text-xs theme-text-secondary mt-0.5">Permanently remove all download records from history.</p>
          </div>
          <button
            type="button"
            onClick={() => setClearModalOpen(true)}
            className="btn-danger text-xs px-4 py-2.5 shrink-0 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Clear All History
          </button>
        </div>
      </div>

      {/* CONFIRMATION DIALOG MODAL */}
      <Modal
        isOpen={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        title="Clear all download history?"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              This action cannot be undone.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setClearModalOpen(false)}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmClearHistory}
              className="btn-danger text-xs px-4 py-2"
            >
              Clear History
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
