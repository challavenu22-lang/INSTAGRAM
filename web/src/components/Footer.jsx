
import React from 'react';

export const Footer = () => {
  return (
    <footer className="py-6 mt-auto relative z-10">
      <div className="max-w-4xl mx-auto px-4 flex flex-col items-center">

        {/* Decorative Button - Centered */}
        <div className="glass-panel px-5 py-3.5 rounded-2xl border shadow-sm text-xs theme-text-primary font-medium inline-block mx-auto mb-3 text-center">
          <p>
            💫🙈 🔹𓆩 ꀎꎭꍏ 𓆪🔹 🍃💞
          </p>
        </div>

        {/* Footer - Centered */}
        <div className="glass-panel w-full px-6 py-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-center gap-3 text-xs theme-text-primary font-medium shadow-md text-center">

          <p>
            © {new Date().getFullYear()} Video Downloader. Authorized media management platform.
          </p>

          <p className="theme-text-secondary">
            Only download videos you own or have explicit permission to use.
          </p>

        </div>
      </div>
    </footer>
  );
};
