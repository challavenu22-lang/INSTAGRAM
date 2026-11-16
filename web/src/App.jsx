import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { ToastProvider } from './hooks/useToast';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { History } from './pages/History';

const AppContent = () => {
  return (
    <div className="min-h-screen flex flex-col theme-text-primary transition-colors duration-300 bg-transparent relative">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Main App Routes - Open to Everyone Directly */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />

          {/* Settings & History Routes */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<History />} />

          {/* Default Fallback: Always open Home directly without authentication */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
