import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = storageService.getSettings();
    return saved.theme || 'dark';
  });

  const applyTheme = (themeValue) => {
    const root = document.documentElement;

    if (themeValue === 'light') {
      root.classList.remove('dark-theme');
      root.classList.add('light-theme');
    } else if (themeValue === 'dark') {
      root.classList.remove('light-theme');
      root.classList.add('dark-theme');
    } else if (themeValue === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.remove('light-theme');
        root.classList.add('dark-theme');
      } else {
        root.classList.remove('dark-theme');
        root.classList.add('light-theme');
      }
    }
  };

  useEffect(() => {
    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        applyTheme('system');
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, [theme]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    storageService.saveSettings({ theme: newTheme });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
