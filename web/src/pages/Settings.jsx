import React, { useState } from 'react';
import { 
  FolderDown, 
  Sun, 
  Moon, 
  Monitor, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw,
  Volume2
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { Modal } from '../components/Modal';

export const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [settings, setSettings] = useState(() => storageService.getSettings());
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const handleSelectDefaultLocation = () => {
    const updated = { ...settings, downloadLocation: 'default', folderPath: 'Downloads' };
    setSettings(updated);
    storageService.saveSettings(updated);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    setSettings(prev => {
      const updated = { ...prev, theme: newTheme };
      storageService.saveSettings(updated);
      return updated;
    });
  };

  const handleToggleAutoSave = () => {
    setSettings(prev => {
      const updated = { ...prev, autoSaveHistory: !prev.autoSaveHistory };
      storageService.saveSettings(updated);
      return updated;
    });
  };

  const handleToggleNotifyComplete = () => {
    setSettings(prev => {
      const updated = { ...prev, notifyComplete: !prev.notifyComplete };
      storageService.saveSettings(updated);
      return updated;
    });
  };

  const handleToggleNotifyFailed = () => {
    setSettings(prev => {
      const updated = { ...prev, notifyFailed: !prev.notifyFailed };
      storageService.saveSettings(updated);
      return updated;
    });
  };

  const handleToggleNotifySound = () => {
    setSettings(prev => {
      const updated = { ...prev, notifySound: prev.notifySound === false ? true : false };
      storageService.saveSettings(updated);
      return updated;
    });
  };

  const handleConfirmResetSettings = () => {
    const defaults = storageService.resetSettings();
    setSettings(defaults);
    setTheme('system');
    setResetModalOpen(false);

    showToast({
      type: 'success',
      title: '✓ Settings Reset',
      message: 'All settings have been restored to their defaults.'
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-4 md:py-10 px-3 md:px-6 space-y-4 md:space-y-8">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold theme-text-primary tracking-tight">Settings</h1>
        <p className="theme-text-secondary text-xs md:text-sm mt-0.5 md:mt-1">Customize your download and notification preferences.</p>
      </div>

      {/* SECTION 1: DOWNLOADS CARD */}
      <div className="rounded-xl md:rounded-2xl glass-panel p-3.5 md:p-6 shadow-lg space-y-3.5 md:space-y-5">
        <div className="flex items-center gap-2 md:gap-2.5 border-b border-slate-700/40 pb-2.5 md:pb-3">
          <FolderDown className="w-4 h-4 md:w-5 md:h-5 text-brand-400" />
          <h2 className="text-base md:text-lg font-semibold theme-text-primary">Download Preferences</h2>
        </div>

        <div className="space-y-3 md:space-y-4 pt-1">
          {/* Default Downloads */}
          <div 
            onClick={handleSelectDefaultLocation}
            className="p-3 md:p-4 rounded-lg md:rounded-xl border flex items-center justify-between cursor-pointer transition-all bg-brand-500/10 border-brand-500 theme-text-primary"
          >
            <div>
              <p className="text-xs md:text-sm font-semibold">Default Downloads</p>
              <p className="text-[11px] md:text-xs theme-text-muted mt-0.5">Save files directly to browser default downloads folder</p>
            </div>
            <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-brand-400 shrink-0" />
          </div>

          {/* Auto Save to History Toggle */}
          <div className="flex items-center justify-between py-2 md:py-3 border-t border-slate-700/40">
            <div>
              <p className="text-xs md:text-sm font-semibold theme-text-primary">Auto Save to History</p>
              <p className="text-[11px] md:text-xs theme-text-secondary">Automatically add completed downloads to History</p>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoSave}
              className={`w-10 h-5 md:w-12 md:h-6 flex items-center rounded-full p-0.5 md:p-1 transition-colors duration-200 ${
                settings.autoSaveHistory !== false ? 'bg-brand-600 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-white shadow-md block"></span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: THEME CARD */}
      <div className="rounded-xl md:rounded-2xl glass-panel p-3.5 md:p-6 shadow-lg space-y-3.5 md:space-y-5">
        <div className="flex items-center gap-2 md:gap-2.5 border-b border-slate-700/40 pb-2.5 md:pb-3">
          <Moon className="w-4 h-4 md:w-5 md:h-5 text-brand-400" />
          <h2 className="text-base md:text-lg font-semibold theme-text-primary">Theme</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-3 pt-1">
          {/* Light Theme */}
          <label 
            onClick={() => handleThemeChange('light')}
            className={`p-3 md:p-4 rounded-lg md:rounded-xl border flex items-center gap-2.5 md:gap-3 cursor-pointer transition-all ${
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
              onChange={() => handleThemeChange('light')}
              className="hidden" 
            />
            <Sun className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
            <span className="text-xs md:text-sm font-medium">Light</span>
          </label>

          {/* Dark Theme */}
          <label 
            onClick={() => handleThemeChange('dark')}
            className={`p-3 md:p-4 rounded-lg md:rounded-xl border flex items-center gap-2.5 md:gap-3 cursor-pointer transition-all ${
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
              onChange={() => handleThemeChange('dark')}
              className="hidden" 
            />
            <Moon className="w-4 h-4 md:w-5 md:h-5 text-brand-400" />
            <span className="text-xs md:text-sm font-medium">Dark</span>
          </label>

          {/* System Default */}
          <label 
            onClick={() => handleThemeChange('system')}
            className={`p-3 md:p-4 rounded-lg md:rounded-xl border flex items-center gap-2.5 md:gap-3 cursor-pointer transition-all ${
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
              onChange={() => handleThemeChange('system')}
              className="hidden" 
            />
            <Monitor className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
            <span className="text-xs md:text-sm font-medium">System Default</span>
          </label>
        </div>
      </div>

      {/* SECTION 3: NOTIFICATIONS CARD */}
      <div className="rounded-xl md:rounded-2xl glass-panel p-3.5 md:p-6 shadow-lg space-y-3.5 md:space-y-5">
        <div className="flex items-center gap-2 md:gap-2.5 border-b border-slate-700/40 pb-2.5 md:pb-3">
          <Bell className="w-4 h-4 md:w-5 md:h-5 text-brand-400" />
          <h2 className="text-base md:text-lg font-semibold theme-text-primary">Notifications</h2>
        </div>

        <div className="space-y-3 md:space-y-4 pt-1">
          {/* Download Complete */}
          <div className="flex items-center justify-between py-1.5 md:py-2 border-b border-slate-700/40">
            <div>
              <p className="text-xs md:text-sm font-semibold theme-text-primary">Download Complete</p>
              <p className="text-[11px] md:text-xs theme-text-secondary">Show notification toast when video finishes downloading</p>
            </div>
            <button
              type="button"
              onClick={handleToggleNotifyComplete}
              className={`w-10 h-5 md:w-12 md:h-6 flex items-center rounded-full p-0.5 md:p-1 transition-colors duration-200 ${
                settings.notifyComplete !== false ? 'bg-brand-600 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-white shadow-md block"></span>
            </button>
          </div>

          {/* Download Failed */}
          <div className="flex items-center justify-between py-1.5 md:py-2 border-b border-slate-700/40">
            <div>
              <p className="text-xs md:text-sm font-semibold theme-text-primary">Download Failed</p>
              <p className="text-[11px] md:text-xs theme-text-secondary">Show notification toast when video download fails</p>
            </div>
            <button
              type="button"
              onClick={handleToggleNotifyFailed}
              className={`w-10 h-5 md:w-12 md:h-6 flex items-center rounded-full p-0.5 md:p-1 transition-colors duration-200 ${
                settings.notifyFailed !== false ? 'bg-brand-600 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-white shadow-md block"></span>
            </button>
          </div>

          {/* Notification Sound */}
          <div className="flex items-center justify-between py-1.5 md:py-2">
            <div>
              <p className="text-xs md:text-sm font-semibold theme-text-primary flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-400 inline" />
                Notification Sound
              </p>
              <p className="text-[11px] md:text-xs theme-text-secondary">Play a sound when a notification appears</p>
            </div>
            <button
              type="button"
              onClick={handleToggleNotifySound}
              className={`w-10 h-5 md:w-12 md:h-6 flex items-center rounded-full p-0.5 md:p-1 transition-colors duration-200 ${
                settings.notifySound !== false ? 'bg-brand-600 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-white shadow-md block"></span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 4: RESET ALL SETTINGS CARD */}
      <div className="rounded-xl md:rounded-2xl glass-panel p-3.5 md:p-6 shadow-lg space-y-3 md:space-y-4">
        <div className="flex items-center gap-2 md:gap-2.5 border-b border-slate-700/40 pb-2.5 md:pb-3">
          <RotateCcw className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
          <h2 className="text-base md:text-lg font-semibold theme-text-primary">Reset All Settings</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 pt-1">
          <div>
            <p className="text-xs md:text-sm font-semibold theme-text-primary">Reset all settings to default values.</p>
            <p className="text-[11px] md:text-xs theme-text-secondary mt-0.5">Restore original preferences. Download history will not be deleted.</p>
          </div>
          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            className="btn-danger text-[11px] md:text-xs px-3.5 md:px-4 py-2 md:py-2.5 shrink-0 flex items-center gap-1.5 md:gap-2 self-end sm:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4" /> Reset All Settings
          </button>
        </div>
      </div>

      {/* CONFIRMATION DIALOG MODAL */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset All Settings?"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              This will restore all settings to their default values. Your download history will not be deleted.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="btn-secondary text-xs px-4 py-2 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmResetSettings}
              className="btn-danger text-xs px-4 py-2 cursor-pointer"
            >
              Reset Settings
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
