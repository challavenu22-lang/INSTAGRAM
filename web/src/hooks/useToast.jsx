import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { storageService } from '../services/storageService';

const playChimeSound = async () => {
  let played = false;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
      played = true;
    }
  } catch (e) {
    // Ignore AudioContext errors
  }

  if (!played) {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRl9vAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVtvAACBhYqFb3WFiYp/h4mKi4yMjY6PkJGRk5WWlpeYmJmampucnJ2en5+goKGlpqioqamrrK2ur7CxsrK0tba3uLm6u7y9vr/AwcLExca/wMHCxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq7O3u7/Dx8vP09fb3+Pn6+/z9/v4=');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {}
  }
};

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ type = 'success', title, message }) => {
    const settings = storageService.getSettings();
    if (settings.notifySound !== false) {
      playChimeSound();
    }

    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    const newToast = { id, type, title, message };

    setToasts((prev) => [
      ...prev.filter((t) => !(t.title === title && t.message === message)),
      newToast
    ]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl p-4 shadow-2xl border flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-bottom-5 ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/40 text-slate-100'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-red-500/40 text-slate-100'
                : 'bg-slate-900/95 border-brand-500/40 text-slate-100'
            }`}
          >
            {toast.type === 'success' && (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            {toast.type === 'error' && (
              <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}
            {toast.type === 'info' && (
              <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5" />
              </div>
            )}
            
            <div className="flex-1">
              {toast.title && <h4 className="font-semibold text-sm text-white">{toast.title}</h4>}
              {toast.message && <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
