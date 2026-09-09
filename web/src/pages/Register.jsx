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

  const validateField = (fieldName, fieldValue, allValues) => {
    const nameVal = fieldName === 'name' ? fieldValue : allValues.name;
    const usernameVal = fieldName === 'username' ? fieldValue : allValues.username;
    const emailVal = fieldName === 'email' ? fieldValue : allValues.email;
    const passwordVal = fieldName === 'password' ? fieldValue : allValues.password;
    const confirmPasswordVal = fieldName === 'confirmPassword' ? fieldValue : allValues.confirmPassword;

    let err = '';
    if (fieldName === 'name') {
      if (!nameVal.trim()) {
        err = 'Please enter your user name.';
      }
    } else if (fieldName === 'username') {
      const cleanU = usernameVal.trim().toLowerCase();
      if (!cleanU) {
        err = 'Please choose a user id.';
      } else if (cleanU.length < 3) {
        err = 'User ID must be at least 3 characters long.';
      } else if (!/^[a-z0-9_]+$/.test(cleanU)) {
        err = 'User ID must contain only lowercase letters, numbers, and underscores.';
      }
    } else if (fieldName === 'email') {
      const cleanE = emailVal.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!cleanE || !emailRegex.test(cleanE)) {
        err = 'Please enter a valid email address (e.g. user@example.com).';
      }
    } else if (fieldName === 'password') {
      if (passwordVal.length < 8 || !/[A-Z]/.test(passwordVal) || !/[a-z]/.test(passwordVal) || !/\d/.test(passwordVal) || !/[^A-Za-z0-9]/.test(passwordVal)) {
        err = 'Must contain at least 8 characters, an uppercase, lowercase, number & special character (@,#,!).';
      }
    } else if (fieldName === 'confirmPassword') {
      if (confirmPasswordVal !== passwordVal) {
        err = 'Passwords do not match.';
      }
    }

    return err;
  };

  const validateAll = (vals) => {
    const errors = {
      name: validateField('name', vals.name, vals),
      username: validateField('username', vals.username, vals),
      email: validateField('email', vals.email, vals),
      password: validateField('password', vals.password, vals),
      confirmPassword: validateField('confirmPassword', vals.confirmPassword, vals),
      general: ''
    };
    const hasErr = Object.values(errors).some(e => Boolean(e));
    return { errors, hasErr };
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    const newErr = validateField('name', val, { name: val, username, email, password, confirmPassword });
    setFieldErrors(prev => ({ ...prev, name: newErr }));
  };

  const handleUsernameChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(val);
    const newErr = validateField('username', val, { name, username: val, email, password, confirmPassword });
    setFieldErrors(prev => ({ ...prev, username: newErr }));
  };

  const handleEmailChange = (e) => {
    const val = e.target.value.toLowerCase();
    setEmail(val);
    const newErr = validateField('email', val, { name, username, email: val, password, confirmPassword });
    setFieldErrors(prev => ({ ...prev, email: newErr }));
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    const pwdErr = validateField('password', val, { name, username, email, password: val, confirmPassword });
    const cpwdErr = confirmPassword ? validateField('confirmPassword', confirmPassword, { name, username, email, password: val, confirmPassword }) : fieldErrors.confirmPassword;
    setFieldErrors(prev => ({ ...prev, password: pwdErr, confirmPassword: cpwdErr }));
  };

  const handleConfirmPasswordChange = (e) => {
    const val = e.target.value;
    setConfirmPassword(val);
    const newErr = validateField('confirmPassword', val, { name, username, email, password, confirmPassword: val });
    setFieldErrors(prev => ({ ...prev, confirmPassword: newErr }));
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
    const currentVals = { name, username, email, password, confirmPassword };
    const { errors, hasErr } = validateAll(currentVals);

    if (hasErr) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({ name: '', username: '', email: '', password: '', confirmPassword: '', general: '' });
    setLoading(true);

    try {
      const cleanName = name.trim();
      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = email.trim().toLowerCase();
      const res = await register(cleanName, cleanUsername, cleanEmail, password);
      if (res?.verificationToken) {
        setVerificationToken(res.verificationToken);
      }
      setRegResult(res);
      setRegisteredSuccess(true);
    } catch (err) {
      let errMsg = err.message || 'Unable to create account. Please try again.';
      if (errMsg.includes('prisma') || errMsg.includes('invocation') || errMsg.includes('datasource') || errMsg.includes('database')) {
        errMsg = 'An account with this User ID already exists.';
      }
      const lowerMsg = errMsg.toLowerCase();
      if (lowerMsg.includes('email') || lowerMsg.includes('mail')) {
        setFieldErrors(prev => ({ ...prev, email: errMsg, general: '' }));
      } else if (lowerMsg.includes('user id') || lowerMsg.includes('username') || lowerMsg.includes('user_id')) {
        setFieldErrors(prev => ({ ...prev, username: errMsg, general: '' }));
      } else if (lowerMsg.includes('name')) {
        setFieldErrors(prev => ({ ...prev, name: errMsg, general: '' }));
      } else if (lowerMsg.includes('confirm')) {
        setFieldErrors(prev => ({ ...prev, confirmPassword: errMsg, general: '' }));
      } else if (lowerMsg.includes('password')) {
        setFieldErrors(prev => ({ ...prev, password: errMsg, general: '' }));
      } else {
        setFieldErrors(prev => ({ ...prev, email: errMsg, general: '' }));
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
                <User className="w-5 h-5 absolute left-[12px] sm:left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none shrink-0 z-10" />
                <input
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="Enter your user name"
                  className={`auth-input !pl-[36px] sm:!pl-[44px] !pr-3 sm:!pr-4 ${fieldErrors.name ? '!border-red-500/80 focus:!border-red-500' : ''}`}
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
                <AtSign className="w-5 h-5 absolute left-[12px] sm:left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none shrink-0 z-10" />
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="choose a user id (lowercase)"
                  className={`auth-input lowercase !pl-[36px] sm:!pl-[44px] !pr-3 sm:!pr-4 ${fieldErrors.username ? '!border-red-500/80 focus:!border-red-500' : ''}`}
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
                <Mail className="w-5 h-5 absolute left-[12px] sm:left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none shrink-0 z-10" />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter your email"
                  className={`auth-input lowercase !pl-[36px] sm:!pl-[44px] !pr-3 sm:!pr-4 ${fieldErrors.email ? '!border-red-500/80 focus:!border-red-500' : ''}`}
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
                <Lock className="w-5 h-5 absolute left-[12px] sm:left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none shrink-0 z-10" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  onPaste={handlePastePassword}
                  onCopy={handleCopyPassword}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  className={`auth-input has-right-icon !pl-[36px] sm:!pl-[44px] !pr-[36px] sm:!pr-[44px] select-text ${fieldErrors.password ? '!border-red-500/80 focus:!border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-[10px] sm:right-[12px] top-1/2 -translate-y-1/2 text-[#7f8da3] hover:text-slate-200 transition-colors p-1 flex items-center justify-center cursor-pointer z-10"
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
                <Lock className="w-5 h-5 absolute left-[12px] sm:left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none shrink-0 z-10" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  onPaste={handlePasteConfirm}
                  onCopy={handleCopyConfirm}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  className={`auth-input has-right-icon !pl-[36px] sm:!pl-[44px] !pr-[36px] sm:!pr-[44px] select-text ${fieldErrors.confirmPassword ? '!border-red-500/80 focus:!border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-[10px] sm:right-[12px] top-1/2 -translate-y-1/2 text-[#7f8da3] hover:text-slate-200 transition-colors p-1 flex items-center justify-center cursor-pointer z-10"
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
