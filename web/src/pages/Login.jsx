import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, User, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    identifier: '',
    password: '',
    general: ''
  });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleIdentifierChange = (e) => {
    setIdentifier(e.target.value);
    if (fieldErrors.identifier) setFieldErrors((prev) => ({ ...prev, identifier: '' }));
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = { identifier: '', password: '', general: '' };
    let hasError = false;

    if (!identifier.trim()) {
      newErrors.identifier = 'Please enter your User ID or Email.';
      hasError = true;
    }

    if (!password) {
      newErrors.password = 'Please enter your password.';
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(newErrors);
      return;
    }

    setFieldErrors({ identifier: '', password: '', general: '' });
    setLoading(true);

    try {
      await login(identifier.trim(), password);
      navigate('/home');
    } catch (err) {
      setFieldErrors({ identifier: '', password: '', general: err.message || 'Invalid credentials.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center py-6 px-4">
      <div className="auth-card w-full max-w-md space-y-4 rounded-2xl glass-panel p-6 sm:p-8 shadow-2xl border border-slate-800">
        
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-500 mx-auto mb-3">
            <Download className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold theme-text-primary tracking-tight">Welcome Back</h2>
          <p className="auth-subtitle text-sm theme-text-secondary mt-1">Sign in to your Video Downloader account</p>
        </div>

        {fieldErrors.general && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0" />
            <span>{fieldErrors.general}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="auth-label">
              USER ID OR EMAIL
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none shrink-0 z-10" />
              <input
                type="text"
                value={identifier}
                onChange={handleIdentifierChange}
                placeholder="Enter your User ID or Email"
                className={`auth-input !pl-[44px] !pr-4 ${fieldErrors.identifier ? '!border-red-500/80 focus:!border-red-500' : ''}`}
              />
            </div>
            {fieldErrors.identifier && (
              <p className="text-[12px] text-red-400 font-medium mt-1 flex items-center gap-1 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{fieldErrors.identifier}</span>
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="auth-label">
              PASSWORD
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none shrink-0 z-10" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={`auth-input !pl-[44px] !pr-[44px] select-text ${fieldErrors.password ? '!border-red-500/80 focus:!border-red-500' : ''}`}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#7f8da3] hover:text-slate-200 transition-colors p-1 flex items-center justify-center cursor-pointer z-10"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-[12px] text-red-400 font-medium mt-1 flex items-center gap-1 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{fieldErrors.password}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base shadow-lg shadow-brand-600/30 mt-2 flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs sm:text-sm theme-text-muted pt-3 border-t border-slate-700/40">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-blue-400 font-bold hover:text-blue-300 underline underline-offset-4 decoration-2 decoration-blue-400 transition-colors"
          >
            Create an account
          </Link>
        </div>

      </div>
    </div>
  );
};
