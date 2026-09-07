import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-x-hidden overflow-y-auto">
      {/* Dark semi-transparent overlay covering entire screen with backdrop blur */}
      <div 
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Modal Dialog Card */}
      <div
        className="w-full max-w-md rounded-2xl glass-panel shadow-2xl p-5 sm:p-6 relative z-10 animate-in zoom-in-95 duration-200 my-auto border border-slate-700/60 bg-slate-900/95"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-700/40 pb-3 sm:pb-4 mb-4">
          <h3 className="text-base sm:text-lg font-semibold theme-text-primary">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg theme-text-muted hover:text-red-400 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

