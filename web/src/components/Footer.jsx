import React from 'react';

export const Footer = () => {
  return (
    <footer className="py-6 mt-auto relative z-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="glass-panel px-6 py-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs theme-text-primary font-medium shadow-md">
          <p>© {new Date().getFullYear()} Video Downloader. Authorized media management platform.</p>
          <p className="theme-text-secondary">Only download videos you own or have explicit permission to use.</p>
        </div>
      </div>
    </footer>
  );
};
