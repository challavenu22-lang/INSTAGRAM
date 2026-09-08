import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, User, AtSign, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const Register = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    general: ''
  });
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [regResult, setRegResult] = useState(null);
  const [pasteErrorPassword, setPasteErrorPassword] = useState('');
  const [pasteErrorConfirm, setPasteErrorConfirm] = useState('');
  const { register, setUser } = useAuth();
  const navigate = useNavigate();

  const handleGoToSignIn = () => {
    if (regResult?.token && regResult?.user) {
      localStorage.setItem('auth_token', regResult.token);
      setUser(regResult.user);
    }
    navigate('/home');
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
  };

  const handleUsernameChange = (e) => {
    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: '' }));
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value.toLowerCase());
    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
  };

  const handlePastePassword = (e) => {
    e.preventDefault();
    setPasteErrorPassword('Unable to paste');
    setTimeout(() => setPasteErrorPassword(''), 2500);
  };

  const handleCopyPassword = (e) => {
    e.preventDefault();
    setPasteErrorPassword('Unable to copy');
    setTimeout(() => setPasteErrorPassword(''), 2500);
  };

  const handlePasteConfirm = (e) => {
    e.preventDefault();
    setPasteErrorConfirm('Unable to paste');
    setTimeout(() => setPasteErrorConfirm(''), 2500);
  };

  const handleCopyConfirm = (e) => {
    e.preventDefault();
    setPasteErrorConfirm('Unable to copy');
    setTimeout(() => setPasteErrorConfirm(''), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = { name: '', username: '', email: '', password: '', confirmPassword: '', general: '' };
    let hasError = false;

    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      newErrors.name = 'Please enter your user name.';
      hasError = true;
    }

    if (!cleanUsername) {
      newErrors.username = 'Please choose a user id.';
      hasError = true;
    } else if (cleanUsername.length < 3) {
      newErrors.username = 'User ID must be at least 3 characters long.';
      hasError = true;
    } else if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      newErrors.username = 'User ID must contain only lowercase letters, numbers, and underscores.';
      hasError = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address (e.g. user@example.com).';
      hasError = true;
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      newErrors.password = 'Must contain at least 8 characters, an uppercase, lowercase, number & special character (@,#,!).';
      hasError = true;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(newErrors);
      return;
    }

    setFieldErrors({ name: '', username: '', email: '', password: '', confirmPassword: '', general: '' });
    setLoading(true);

    try {
      const res = await register(cleanName, cleanUsername, cleanEmail, password);
      if (res?.verificationToken) {
        setVerificationToken(res.verificationToken);
      }
      setRegResult(res);
      setRegisteredSuccess(true);
    } catch (err) {
      const errMsg = err.message || 'Unable to create account. Please try again.';
      const lowerMsg = errMsg.toLowerCase();
      if (lowerMsg.includes('user id') || lowerMsg.includes('username') || lowerMsg.includes('user_id')) {
        setFieldErrors({ ...newErrors, username: errMsg, general: '' });
      } else if (lowerMsg.includes('email')) {
        setFieldErrors({ ...newErrors, email: errMsg, general: '' });
      } else {
        setFieldErrors({ ...newErrors, general: errMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center py-6 px-4">
      <div className="auth-card w-full max-w-md space-y-3.5 sm:space-y-4 rounded-2xl glass-panel p-6 sm:p-8 shadow-2xl border border-slate-800">
        
        <div className="text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-500 mx-auto mb-2 sm:mb-3">
            <Download className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold theme-text-primary tracking-tight">Create Account</h2>
          <p className="auth-subtitle text-xs sm:text-sm theme-text-secondary mt-0.5 sm:mt-1">Create your Video Downloader account</p>
        </div>

        {fieldErrors.general && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0" />
            <span>{fieldErrors.general}</span>
          </div>
        )}

        {registeredSuccess ? (
          <div className="space-y-5">
            <div className="p-5 sm:p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3.5">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-lg font-bold text-emerald-400">Account Created Successfully!</h3>
              <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
                {verificationToken ? (
                  <span>An email verification link has been sent to <strong className="theme-text-primary">{email}</strong>. Please verify your account before logging in.</span>
                ) : (
                  <span>Your account <strong className="theme-text-primary">{username}</strong> has been created! You can now log in.</span>
                )}
              </p>
              {verificationToken && (
                <div className="pt-1">
                  <Link
                    to={`/verify-email?token=${verificationToken}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition-colors"
                  >
                    <span>Click here to verify email now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
              <button
                type="button"
                onClick={handleGoToSignIn}
                className="btn-primary w-full py-3.5 px-5 text-sm sm:text-base font-semibold mt-3 cursor-pointer flex items-center justify-between group rounded-xl shadow-lg shadow-brand-600/30"
              >
                <span>Go to Sign In →</span>
                <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setName('');
                  setUsername('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setRegisteredSuccess(false);
                }}
                className="btn-secondary text-sm font-semibold py-2.5 px-6 rounded-xl mx-auto inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform shrink-0" />
                <span>Back</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="form-group">
              <label className="auth-label">
                USER NAME
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none shrink-0 z-10" />
                <input
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="Enter your user name"
                  className={`auth-input !pl-[44px] !pr-4 ${fieldErrors.name ? '!border-red-500/80 focus:!border-red-500' : ''}`}
                />
              </div>
              {fieldErrors.name && (
                <p className="text-[12px] text-red-400 font-medium mt-1 flex items-center gap-1 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>{fieldErrors.name}</span>
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="auth-label">
                USER ID
              </label>
              <div className="relative">
                <AtSign className="w-5 h-5 absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none shrink-0 z-10" />
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="choose a user id (lowercase)"
                  className={`auth-input !pl-[44px] !pr-4 ${fieldErrors.username ? '!border-red-500/80 focus:!border-red-500' : ''}`}
                />
              </div>
              {fieldErrors.username && (
                <p className="text-[12px] text-red-400 font-medium mt-1 flex items-center gap-1 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>{fieldErrors.username}</span>
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="auth-label">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none shrink-0 z-10" />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter your email"
                  className={`auth-input !pl-[44px] !pr-4 ${fieldErrors.email ? '!border-red-500/80 focus:!border-red-500' : ''}`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[12px] text-red-400 font-medium mt-1 flex items-center gap-1 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>{fieldErrors.email}</span>
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
                  onPaste={handlePastePassword}
                  onCopy={handleCopyPassword}
                  placeholder="Create a password"
                  autoComplete="new-password"
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
                <p className="text-[12px] text-red-400 font-medium mt-1 flex items-start gap-1 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <span>{fieldErrors.password}</span>
                </p>
              )}
              {pasteErrorPassword && (
                <p className="text-[11px] text-amber-400 font-medium mt-1 animate-in fade-in">
                  {pasteErrorPassword}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="auth-label">
                CONFIRM PASSWORD
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none shrink-0 z-10" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  onPaste={handlePasteConfirm}
                  onCopy={handleCopyConfirm}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  className={`auth-input !pl-[44px] !pr-[44px] select-text ${fieldErrors.confirmPassword ? '!border-red-500/80 focus:!border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#7f8da3] hover:text-slate-200 transition-colors p-1 flex items-center justify-center cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-[12px] text-red-400 font-medium mt-1 flex items-center gap-1 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>{fieldErrors.confirmPassword}</span>
                </p>
              )}
              {pasteErrorConfirm && (
                <p className="text-[11px] text-amber-400 font-medium mt-1 animate-in fade-in">
                  {pasteErrorConfirm}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base shadow-lg shadow-brand-600/30 mt-3 flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create Account'}
            </button>
          </form>
        )}

        {!registeredSuccess && (
          <div className="text-center text-xs sm:text-sm theme-text-muted pt-2.5 border-t border-slate-700/40">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-blue-400 font-bold hover:text-blue-300 underline underline-offset-4 decoration-2 decoration-blue-400 transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};
