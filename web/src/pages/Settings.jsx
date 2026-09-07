import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FolderDown, 
  Sun, 
  Moon, 
  Monitor, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw,
  Volume2,
  User,
  LogIn,
  KeyRound,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Pencil,
  Upload,
  Camera,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Trash2
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { settingsService } from '../services/settingsService';
import { authService } from '../services/authService';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { Modal } from '../components/Modal';

export const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const { user, setUser, logout } = useAuth();

  const profilePicInputRef = useRef(null);

  const [settings, setSettings] = useState(() => storageService.getSettings());
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Delete Account State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletePasswordModalOpen, setDeletePasswordModalOpen] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState(null);

  // Accounts Section States
  const [accountSubPage, setAccountSubPage] = useState(null); // null | 'details' | 'change-password'
  const [activeMobileDetail, setActiveMobileDetail] = useState(null); // 'pic' | 'username' | 'userid' | 'email' | null
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Change Password state
  const [passwordStep, setPasswordStep] = useState(1); // 1: current pass, 2: new pass
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState(() => user?.email || '');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Account Details Editing State
  const [editUserName, setEditUserName] = useState('');
  const [editUserId, setEditUserId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPicture, setEditPicture] = useState('');

  const [isEditingPic, setIsEditingPic] = useState(false);
  const [isEditingUserName, setIsEditingUserName] = useState(false);
  const [isEditingUserId, setIsEditingUserId] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  const [accountSaveLoading, setAccountSaveLoading] = useState(false);
  const [accountSaveError, setAccountSaveError] = useState(null);

  // Profile Picture Crop Modal State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageObj, setImageObj] = useState(null);

  const touchPinchDistRef = useRef(null);
  const touchStartZoomRef = useRef(1);

  useEffect(() => {
    if (user) {
      setEditUserName(user.name || user.fullName || user.userName || '');
      setEditUserId(user.username || user.userId || '');
      setEditEmail(user.email || '');
      setEditPicture(user.picture || '');
    }
  }, [user]);

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setAccountSaveError('Image file size must be less than 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target.result;
      const img = new Image();
      img.onload = () => {
        setImageObj(img);
        setRawImageSrc(src);
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });
        setCropModalOpen(true);
        setAccountSaveError(null);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  // Mouse Drag (Desktop)
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setCropOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mouse Wheel Zoom (Desktop)
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setCropZoom((prev) => Math.min(3, Math.max(1, +(prev + zoomDelta).toFixed(2))));
  };

  // Touch Drag & Pinch-to-Zoom (Mobile)
  const getTouchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;
      setDragStart({ x: clientX - cropOffset.x, y: clientY - cropOffset.y });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = getTouchDistance(e.touches);
      touchPinchDistRef.current = dist;
      touchStartZoomRef.current = cropZoom;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging) {
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;
      setCropOffset({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y
      });
    } else if (e.touches.length === 2 && touchPinchDistRef.current) {
      const dist = getTouchDistance(e.touches);
      const scale = dist / touchPinchDistRef.current;
      const newZoom = Math.min(3, Math.max(1, +(touchStartZoomRef.current * scale).toFixed(2)));
      setCropZoom(newZoom);
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      touchPinchDistRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
  };

  const handleApplyCrop = async () => {
    if (!imageObj) return;

    const canvasSize = 300;
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previewSize = 260;
    const scaleFactor = canvasSize / previewSize;

    const nw = imageObj.naturalWidth || imageObj.width;
    const nh = imageObj.naturalHeight || imageObj.height;

    let baseW, baseH;
    if (nw > nh) {
      baseH = previewSize;
      baseW = (nw / nh) * previewSize;
    } else {
      baseW = previewSize;
      baseH = (nh / nw) * previewSize;
    }

    const drawW = baseW * cropZoom * scaleFactor;
    const drawH = baseH * cropZoom * scaleFactor;

    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const drawX = centerX - drawW / 2 + cropOffset.x * scaleFactor;
    const drawY = centerY - drawH / 2 + cropOffset.y * scaleFactor;

    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(imageObj, drawX, drawY, drawW, drawH);

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setEditPicture(croppedDataUrl);
    setCropModalOpen(false);

    try {
      setAccountSaveLoading(true);
      setAccountSaveError(null);
      const res = await settingsService.updateProfile({
        name: (editUserName || user?.name || user?.fullName || '').trim(),
        username: (editUserId || user?.username || '').trim(),
        email: (editEmail || user?.email || '').trim(),
        picture: croppedDataUrl
      });
      if (res.success && res.user) {
        setUser(res.user);
        showToast({
          type: 'success',
          title: '✓ Profile Picture Saved',
          message: 'Your profile picture has been updated across the application.'
        });
      } else {
        setAccountSaveError(res.message || 'Failed to save profile picture.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save profile picture.';
      setAccountSaveError(msg);
    } finally {
      setAccountSaveLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setEditPicture('');
    try {
      setAccountSaveLoading(true);
      setAccountSaveError(null);
      const res = await settingsService.updateProfile({
        name: (editUserName || user?.name || user?.fullName || '').trim(),
        username: (editUserId || user?.username || '').trim(),
        email: (editEmail || user?.email || '').trim(),
        picture: null
      });
      if (res.success && res.user) {
        setUser(res.user);
        showToast({
          type: 'success',
          title: '✓ Photo Removed',
          message: 'Profile photo removed. Reverted to default avatar.'
        });
      } else {
        setAccountSaveError(res.message || 'Failed to remove profile photo.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to remove profile photo.';
      setAccountSaveError(msg);
    } finally {
      setAccountSaveLoading(false);
    }
  };

  const handleSaveAccountDetails = async (e) => {
    if (e) e.preventDefault();
    const trimmedName = editUserName.trim();
    const trimmedUserId = editUserId.trim();
    const trimmedEmail = editEmail.trim();

    if (!trimmedName) {
      setAccountSaveError('User Name cannot be empty.');
      return;
    }
    if (!trimmedUserId) {
      setAccountSaveError('User ID cannot be empty.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setAccountSaveError('Please enter a valid Mail ID.');
      return;
    }

    setAccountSaveLoading(true);
    setAccountSaveError(null);

    try {
      const res = await settingsService.updateProfile({
        name: trimmedName,
        userName: trimmedName,
        username: trimmedUserId,
        userId: trimmedUserId,
        email: trimmedEmail,
        picture: editPicture
      });

      if (res && res.user) {
        setUser(res.user);
        setEditUserName(res.user.name || res.user.userName || trimmedName);
        setEditUserId(res.user.username || res.user.userId || trimmedUserId);
        setEditEmail(res.user.email || trimmedEmail);

        setIsEditingPic(false);
        setIsEditingUserName(false);
        setIsEditingUserId(false);
        setIsEditingEmail(false);

        showToast({
          type: 'success',
          title: '✓ Account Details Saved',
          message: 'Your account details have been updated successfully.'
        });
      } else {
        setAccountSaveError(res?.message || 'Failed to save account details.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save account details.';
      setAccountSaveError(msg);
    } finally {
      setAccountSaveLoading(false);
    }
  };

  const displayUserName = user?.name || user?.fullName || user?.userName || '';
  const displayUserId = user?.username || user?.userId || '';

  const getFieldError = (error) => {
    if (!error) return { field: null, message: '' };
    const errLower = error.toLowerCase();
    if (errLower.includes('user id') || errLower.includes('userid') || errLower.includes('username') || errLower.includes('taken')) {
      return { field: 'userid', message: error };
    }
    if (errLower.includes('user name') || errLower.includes('name')) {
      return { field: 'username', message: error };
    }
    if (errLower.includes('mail') || errLower.includes('email')) {
      return { field: 'email', message: error };
    }
    if (errLower.includes('image') || errLower.includes('photo') || errLower.includes('picture')) {
      return { field: 'pic', message: error };
    }
    return { field: 'general', message: error };
  };

  const currentFieldError = getFieldError(accountSaveError);

  // Handler 1: Verify Current Password (Step 1)
  const handleVerifyCurrentPassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !currentPassword.trim()) {
      setPasswordError('Please enter your current password.');
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const res = await settingsService.verifyPassword(currentPassword);
      if (res.success || res.message) {
        setPasswordStep(2);
      } else {
        setPasswordError('Current password is incorrect.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Current password is incorrect.';
      setPasswordError(msg.includes('incorrect') || msg.includes('400') ? 'Current password is incorrect.' : msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handler 2: Submit New Password (Step 2)
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !newPassword.trim()) {
      setPasswordError('New password cannot be empty.');
      return;
    }
    if (!confirmPassword || !confirmPassword.trim()) {
      setPasswordError('Confirm password cannot be empty.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const res = await settingsService.changePassword(currentPassword, newPassword);
      if (res.success || res.message) {
        showToast({
          type: 'success',
          title: '✓ Password Changed',
          message: 'Your password has been updated successfully.'
        });
        setShowChangePassword(false);
        setPasswordStep(1);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.message || 'Failed to update password.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update password.';
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handler 3: Forgot Password Request
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    const targetEmail = (forgotEmail || user?.email || '').trim();
    if (!targetEmail) {
      setForgotError('Please enter your registered email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      await authService.forgotPassword(targetEmail);
      setForgotSuccess(true);
      showToast({
        type: 'success',
        title: '✓ Reset Link Sent',
        message: 'Password reset link has been sent to your email.'
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to send reset link.';
      setForgotError(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  // Handler 4: Confirm Delete Account (Step 2 with password check)
  const handleConfirmDeleteAccountSubmit = async (e) => {
    e.preventDefault();
    if (!deleteConfirmPassword || !deleteConfirmPassword.trim()) {
      setDeletePasswordError('Please enter your password.');
      return;
    }
    setDeleteLoading(true);
    setDeletePasswordError(null);
    try {
      const res = await settingsService.deleteAccount(deleteConfirmPassword);
      if (res?.data?.success || res?.success || res?.message) {
        setDeletePasswordModalOpen(false);
        setUser(null);
        showToast({
          type: 'success',
          title: '✓ Account Deleted',
          message: 'Your account has been deleted permanently.'
        });
        navigate('/');
      } else {
        setDeletePasswordError(res?.data?.message || res?.message || 'Incorrect password. Please try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Incorrect password. Please try again.';
      setDeletePasswordError(msg.includes('password') || msg.includes('400') || msg.includes('401') ? 'Incorrect password. Please try again.' : msg);
    } finally {
      setDeleteLoading(false);
    }
  };

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

      {/* SECTION 1: ACCOUNTS CARD */}
      <div className="rounded-xl md:rounded-2xl glass-panel p-3.5 md:p-6 shadow-lg space-y-3.5 md:space-y-5 border border-blue-500/80">
        <div className="flex items-center gap-2 md:gap-2.5 border-b border-slate-700/40 pb-2.5 md:pb-3">
          <User className="w-4 h-4 md:w-5 md:h-5 text-brand-400" />
          <h2 className="text-base md:text-lg font-semibold theme-text-primary">Accounts</h2>
        </div>

        {!user ? (
          <div className="p-3.5 md:p-5 rounded-xl md:rounded-2xl bg-slate-900/80 border border-slate-700/50 space-y-3 md:space-y-3.5 shadow-md">
            <div className="flex items-start sm:items-center gap-2.5 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-400 flex items-center justify-center font-bold text-xs md:text-sm shrink-0">
                <User className="w-4 h-4 md:w-5 md:h-5 text-brand-400" />
              </div>
              <div>
                <h3 className="text-xs md:text-sm font-semibold theme-text-primary">Guest Account</h3>
                <p className="text-[11px] md:text-xs theme-text-secondary mt-0.5">
                  You are currently using a guest account. Please log in to view and manage your account details and password settings.
                </p>
              </div>
            </div>

            <div className="pt-1 flex items-center gap-3">
              <Link
                to="/login"
                className="px-3.5 md:px-4 py-1.5 md:py-2 text-[11px] md:text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 active:bg-blue-950 border border-blue-700/60 rounded-lg md:rounded-xl transition-all duration-200 shadow-md shadow-blue-950/40 inline-flex items-center gap-2"
              >
                <LogIn className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                <span>Log In</span>
              </Link>
            </div>
          </div>
        ) : accountSubPage === null ? (
          <div className="space-y-3 md:space-y-4 pt-1">
            {/* Action Buttons Column */}
            <div className="flex flex-col items-start gap-2.5 md:gap-3">
              <button
                type="button"
                onClick={() => {
                  setAccountSubPage('details');
                  setActiveMobileDetail(null);
                }}
                className="text-[11px] md:text-xs font-semibold py-2 md:py-2.5 px-3.5 md:px-4 flex items-center gap-2 rounded-lg md:rounded-xl transition-all duration-200 cursor-pointer border bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border-slate-700/50"
              >
                <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400" />
                <span>Account Details</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountSubPage('change-password');
                  setShowForgotPassword(false);
                  setPasswordStep(1);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError(null);
                }}
                className="text-[11px] md:text-xs font-semibold py-2 md:py-2.5 px-3.5 md:px-4 flex items-center gap-2 rounded-lg md:rounded-xl transition-all duration-200 cursor-pointer border bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border-slate-700/50"
              >
                <KeyRound className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400" />
                <span>Change Password</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeletePasswordError(null);
                  setDeleteModalOpen(true);
                }}
                className="text-[11px] md:text-xs font-semibold py-2 md:py-2.5 px-3.5 md:px-4 flex items-center gap-2 rounded-lg md:rounded-xl transition-all duration-200 cursor-pointer border bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border-slate-700/50"
              >
                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-400" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        ) : accountSubPage === 'details' ? (
          /* SEPARATE ACCOUNT DETAILS PAGE VIEW */
          <div className="space-y-3.5 md:space-y-5 animate-in fade-in duration-200">
            <div className="flex flex-col items-start gap-1 md:gap-1.5 border-b border-slate-700/40 pb-2.5 md:pb-3">
              <button
                type="button"
                onClick={() => {
                  setAccountSubPage(null);
                  setActiveMobileDetail(null);
                  setAccountSaveError(null);
                }}
                className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-xs font-semibold text-blue-400 hover:text-blue-300 px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl border border-blue-500/80 hover:border-blue-400 bg-slate-800/60 hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400" />
                <span>Back to Accounts</span>
              </button>
              <h2 className="text-base md:text-lg font-semibold theme-text-primary">Account Details</h2>
            </div>

            <input
              type="file"
              ref={profilePicInputRef}
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />

            {/* Field validation errors are displayed directly under their corresponding input fields */}

            {activeMobileDetail === null ? (
              <div className="space-y-3 sm:space-y-5 pt-1 max-w-2xl">
                <div className="rounded-2xl bg-slate-900/80 border border-blue-500/80 overflow-hidden divide-y divide-slate-700/40 shadow-lg p-3.5 sm:p-5 space-y-3 sm:space-y-6">
                  
                  {/* ROW 1: Profile picture */}
                  <div className="space-y-1 sm:space-y-2 pb-2.5 sm:pb-4">
                    <span className="text-xs sm:text-sm font-semibold theme-text-primary block">
                      Profile Picture
                    </span>
                    <p className="text-[10px] sm:text-[11px] theme-text-muted">Click or tap picture to change photo</p>

                    <div className="flex items-center gap-3 sm:gap-4 py-1 sm:py-2">
                      <div
                        onClick={() => profilePicInputRef.current?.click()}
                        className="relative cursor-pointer group rounded-full shrink-0"
                        title="Click to select new profile picture"
                      >
                        {editPicture ? (
                          <img
                            src={editPicture}
                            alt="Profile"
                            className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-brand-500/50 shadow-md transition-opacity group-hover:opacity-80"
                          />
                        ) : (
                          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-brand-500/20 border-2 border-brand-500/40 flex items-center justify-center text-brand-400 font-bold text-xl sm:text-2xl uppercase shadow-md transition-opacity group-hover:opacity-80">
                            {displayUserName ? displayUserName.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] sm:text-xs font-semibold transition-opacity">
                          Change
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 sm:gap-1.5">
                        <button
                          type="button"
                          onClick={() => profilePicInputRef.current?.click()}
                          className="text-xs font-medium text-brand-400 hover:text-brand-300 underline cursor-pointer text-left"
                        >
                          Click picture to upload photo
                        </button>
                        {editPicture && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="text-[11px] text-red-400 hover:underline cursor-pointer text-left"
                          >
                            Remove photo
                          </button>
                        )}
                      </div>
                    </div>

                    {currentFieldError.field === 'pic' && (
                      <div className="p-2.5 sm:p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 mt-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{currentFieldError.message}</span>
                      </div>
                    )}
                  </div>

                  {/* ROW 2: User Name */}
                  <div className="space-y-1 sm:space-y-2 pt-2.5 sm:pt-4 pb-1 sm:pb-2">
                    <span className="text-xs sm:text-sm font-semibold theme-text-primary block">User Name</span>

                    {!isEditingUserName ? (
                      <div
                        onClick={() => setIsEditingUserName(true)}
                        className="cursor-pointer text-xs sm:text-sm font-medium theme-text-primary bg-slate-800/60 hover:bg-slate-800/90 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-slate-700/40 hover:border-brand-500/50 transition-all flex items-center justify-between group"
                        title="Click to edit User Name"
                      >
                        <span>{editUserName || displayUserName}</span>
                        <span className="text-[10px] sm:text-[11px] text-slate-500 group-hover:text-brand-400 transition-colors">Click to edit</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={editUserName}
                        onChange={(e) => {
                          setEditUserName(e.target.value);
                          setAccountSaveError(null);
                        }}
                        onBlur={() => {
                          if (editUserName.trim()) setIsEditingUserName(false);
                        }}
                        autoFocus
                        placeholder="Enter User Name"
                        className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-lg sm:rounded-xl bg-slate-800 border border-brand-500 theme-text-primary text-xs sm:text-sm focus:outline-none shadow-inner"
                      />
                    )}

                    {currentFieldError.field === 'username' && (
                      <div className="p-2.5 sm:p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 mt-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{currentFieldError.message}</span>
                      </div>
                    )}
                  </div>

                  {/* ROW 3: User ID */}
                  <div className="space-y-1 sm:space-y-2 pt-2.5 sm:pt-4 pb-1 sm:pb-2">
                    <span className="text-xs sm:text-sm font-semibold theme-text-primary block">User ID</span>

                    {!isEditingUserId ? (
                      <div
                        onClick={() => setIsEditingUserId(true)}
                        className="cursor-pointer text-xs sm:text-sm font-medium theme-text-primary bg-slate-800/60 hover:bg-slate-800/90 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-slate-700/40 hover:border-brand-500/50 transition-all flex items-center justify-between group break-all"
                        title="Click to edit User ID"
                      >
                        <span>{editUserId || displayUserId}</span>
                        <span className="text-[10px] sm:text-[11px] text-slate-500 group-hover:text-brand-400 transition-colors">Click to edit</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={editUserId}
                        onChange={(e) => {
                          setEditUserId(e.target.value);
                          setAccountSaveError(null);
                        }}
                        onBlur={() => {
                          if (editUserId.trim()) setIsEditingUserId(false);
                        }}
                        autoFocus
                        placeholder="Enter User ID"
                        className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-lg sm:rounded-xl bg-slate-800 border border-brand-500 theme-text-primary text-xs sm:text-sm focus:outline-none shadow-inner"
                      />
                    )}

                    {currentFieldError.field === 'userid' && (
                      <div className="p-2.5 sm:p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 mt-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{currentFieldError.message}</span>
                      </div>
                    )}
                  </div>

                  {/* ROW 4: Mail ID */}
                  <div className="space-y-1 sm:space-y-2 pt-2.5 sm:pt-4 pb-1 sm:pb-2">
                    <span className="text-xs sm:text-sm font-semibold theme-text-primary block">Mail ID</span>

                    {!isEditingEmail ? (
                      <div
                        onClick={() => setIsEditingEmail(true)}
                        className="cursor-pointer text-xs sm:text-sm font-medium theme-text-primary bg-slate-800/60 hover:bg-slate-800/90 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-slate-700/40 hover:border-brand-500/50 transition-all flex items-center justify-between group"
                        title="Click to edit Mail ID"
                      >
                        <span className="truncate">{editEmail || user?.email || ''}</span>
                        <span className="text-[10px] sm:text-[11px] text-slate-500 group-hover:text-brand-400 transition-colors shrink-0 ml-2">Click to edit</span>
                      </div>
                    ) : (
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => {
                          setEditEmail(e.target.value);
                          setAccountSaveError(null);
                        }}
                        onBlur={() => {
                          if (editEmail.trim()) setIsEditingEmail(false);
                        }}
                        autoFocus
                        placeholder="Enter Mail ID"
                        className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-lg sm:rounded-xl bg-slate-800 border border-brand-500 theme-text-primary text-xs sm:text-sm focus:outline-none shadow-inner"
                      />
                    )}

                    {currentFieldError.field === 'email' && (
                      <div className="p-2.5 sm:p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 mt-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{currentFieldError.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Save Account Details Button */}
                  <div className="pt-3 sm:pt-5 border-t border-slate-700/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
                    <span className="text-[11px] sm:text-xs theme-text-muted text-center sm:text-left">Click Save to update your account details</span>
                    <button
                      type="button"
                      onClick={handleSaveAccountDetails}
                      disabled={accountSaveLoading}
                      className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md w-full sm:w-auto"
                    >
                      {accountSaveLoading ? 'Saving...' : 'Save Account Details'}
                    </button>
                  </div>

                  {currentFieldError.field === 'general' && (
                    <div className="p-2.5 sm:p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 mt-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{currentFieldError.message}</span>
                    </div>
                  )}


                </div>
              </div>
            ) : (
              /* Detail Item View when row tapped on mobile */
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-blue-500/80 space-y-4 max-w-lg shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-700/40 pb-3">
                  <button
                    type="button"
                    onClick={() => setActiveMobileDetail(null)}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium hover:underline cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-emerald-400" /> Back to Account Details
                  </button>
                  <span className="text-xs font-bold theme-text-secondary uppercase">
                    {activeMobileDetail === 'pic' && 'PROFILE PIC'}
                    {activeMobileDetail === 'username' && 'USER NAME'}
                    {activeMobileDetail === 'userid' && 'USER ID'}
                    {activeMobileDetail === 'email' && 'MAIL ID'}
                  </span>
                </div>

                {activeMobileDetail === 'pic' && (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div
                      onClick={() => profilePicInputRef.current?.click()}
                      className="relative cursor-pointer group rounded-full shrink-0"
                      title="Tap to select new profile picture"
                    >
                      {editPicture ? (
                        <img src={editPicture} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-brand-500/50 shadow-md" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-brand-500/20 border-2 border-brand-500/40 flex items-center justify-center text-brand-400 font-bold text-3xl uppercase shadow-md">
                          {displayUserName ? displayUserName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">
                        Tap to change
                      </div>
                    </div>
                    <p
                      className="text-xs text-brand-400 font-medium cursor-pointer underline"
                      onClick={() => profilePicInputRef.current?.click()}
                    >
                      Tap image to select new photo
                    </p>
                    {editPicture && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="text-xs text-red-400 hover:underline cursor-pointer"
                      >
                        Remove photo
                      </button>
                    )}
                    {currentFieldError.field === 'pic' && (
                      <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 w-full mt-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{currentFieldError.message}</span>
                      </div>
                    )}
                  </div>
                )}

                {activeMobileDetail === 'username' && (
                  <div className="space-y-2 py-2">
                    <label className="text-xs theme-text-muted font-medium block">User Name</label>
                    <input
                      type="text"
                      value={editUserName}
                      onChange={(e) => {
                        setEditUserName(e.target.value);
                        setAccountSaveError(null);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-brand-500/60 theme-text-primary text-base font-semibold focus:outline-none"
                    />
                    {currentFieldError.field === 'username' && (
                      <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 mt-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{currentFieldError.message}</span>
                      </div>
                    )}
                  </div>
                )}

                {activeMobileDetail === 'userid' && (
                  <div className="space-y-2 py-2">
                    <label className="text-xs theme-text-muted font-medium block">User ID</label>
                    <input
                      type="text"
                      value={editUserId}
                      onChange={(e) => {
                        setEditUserId(e.target.value);
                        setAccountSaveError(null);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-brand-500/60 theme-text-primary text-base font-semibold focus:outline-none"
                    />
                    {currentFieldError.field === 'userid' && (
                      <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 mt-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{currentFieldError.message}</span>
                      </div>
                    )}
                  </div>
                )}

                {activeMobileDetail === 'email' && (
                  <div className="space-y-2 py-2">
                    <label className="text-xs theme-text-muted font-medium block">Mail ID</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => {
                        setEditEmail(e.target.value);
                        setAccountSaveError(null);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-brand-500/60 theme-text-primary text-base font-semibold focus:outline-none"
                    />
                    {currentFieldError.field === 'email' && (
                      <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 mt-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{currentFieldError.message}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-700/40 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAccountDetails}
                    disabled={accountSaveLoading}
                    className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer"
                  >
                    {accountSaveLoading ? 'Saving...' : 'Save Account Details'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* SEPARATE CHANGE PASSWORD PAGE VIEW */
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex flex-col items-start gap-1.5 border-b border-slate-700/40 pb-3">
              <button
                type="button"
                onClick={() => {
                  setAccountSubPage(null);
                  setShowForgotPassword(false);
                  setPasswordStep(1);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError(null);
                }}
                className="flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-xl border border-blue-500/80 hover:border-blue-400 bg-slate-800/60 hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-4 h-4 text-blue-400" />
                <span>Back to Accounts</span>
              </button>
              <h2 className="text-lg font-semibold theme-text-primary">Change Password</h2>
            </div>

            {!showForgotPassword ? (
              <div className="rounded-2xl bg-slate-900/80 border border-blue-500/80 p-3.5 sm:p-5 shadow-lg space-y-4 max-w-lg">
                <div className="flex items-center justify-between border-b border-slate-700/40 pb-2.5">
                  <h3 className="text-sm font-semibold theme-text-primary flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>{passwordStep === 1 ? 'Step 1: Current Password' : 'Step 2: Set New Password'}</span>
                  </h3>
                  <span className="text-xs theme-text-muted">Step {passwordStep} of 2</span>
                </div>

                {passwordError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordStep === 1 ? (
                  <form onSubmit={handleVerifyCurrentPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium theme-text-secondary mb-1.5">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          setPasswordError(null);
                        }}
                        placeholder="Enter current password"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 theme-text-primary text-sm focus:outline-none focus:border-brand-500 transition-colors"
                        required
                      />
                      <div className="mt-2 text-left">
                        <button
                          type="button"
                          onClick={() => {
                            setShowForgotPassword(true);
                            setForgotEmail(user?.email || '');
                            setPasswordError(null);
                          }}
                          className="text-xs font-medium text-brand-400 hover:text-brand-300 underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="submit"
                        disabled={passwordLoading || !currentPassword.trim()}
                        className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer"
                      >
                        {passwordLoading ? 'Verifying...' : 'Continue'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium theme-text-secondary mb-1.5">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordError(null);
                        }}
                        placeholder="Enter new password"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 theme-text-primary text-sm focus:outline-none focus:border-brand-500 transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium theme-text-secondary mb-1.5">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setPasswordError(null);
                        }}
                        placeholder="Enter new password again"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 theme-text-primary text-sm focus:outline-none focus:border-brand-500 transition-colors"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer"
                      >
                        {passwordLoading ? 'Updating Password...' : 'Change Password'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordStep(1);
                          setNewPassword('');
                          setConfirmPassword('');
                          setPasswordError(null);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold text-xs px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                      >
                        Back
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* Forgot Password Sub-View */
              <div className="rounded-2xl bg-slate-900/80 border border-blue-500/80 p-3.5 sm:p-5 shadow-lg space-y-4 max-w-lg">
                <div className="flex items-center justify-between border-b border-slate-700/40 pb-2.5">
                  <h3 className="text-sm font-semibold theme-text-primary">Forgot Password</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotError(null);
                      setForgotSuccess(false);
                    }}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {forgotError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                {forgotSuccess ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                    <span>Password reset link has been sent to your registered email.</span>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-medium theme-text-secondary">
                          Registered Email
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
                          🚫 Read-only
                        </span>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type="email"
                          value={user?.email || forgotEmail || ''}
                          readOnly
                          disabled
                          tabIndex={-1}
                          className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-800/40 border border-slate-700/50 theme-text-primary text-sm focus:outline-none cursor-not-allowed opacity-80 select-none"
                        />
                        <span className="absolute right-3 text-sm select-none" title="This field cannot be edited">
                          🚫
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="submit"
                        disabled={forgotLoading || !(user?.email || forgotEmail)}
                        className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer"
                      >
                        {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: DOWNLOAD LOCATION CARD */}
      <div className="rounded-xl md:rounded-2xl glass-panel p-3.5 md:p-6 shadow-lg space-y-3.5 md:space-y-5">
        <div className="flex items-center gap-2 md:gap-2.5 border-b border-slate-700/40 pb-2.5 md:pb-3">
          <FolderDown className="w-4 h-4 md:w-5 md:h-5 text-brand-400" />
          <h2 className="text-base md:text-lg font-semibold theme-text-primary">Download Location</h2>
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

      {/* SECTION 3: THEME CARD */}
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

      {/* SECTION 4: NOTIFICATIONS CARD */}
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

      {/* SECTION 5: RESET ALL SETTINGS CARD */}
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
            className="btn-danger text-[11px] md:text-xs px-3.5 md:px-4 py-2 md:py-2.5 shrink-0 flex items-center gap-1.5 md:gap-2 self-end sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4" /> Reset All Settings
          </button>
        </div>
      </div>

      {/* FIRST CONFIRMATION DIALOG MODAL */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Account?"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              Are you sure you want to permanently delete your account? This action cannot be undone.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteConfirmPassword('');
                setDeletePasswordError(null);
                setDeletePasswordModalOpen(true);
              }}
              className="btn-danger text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* SECOND PASSWORD-CONFIRMATION DIALOG MODAL */}
      <Modal
        isOpen={deletePasswordModalOpen}
        onClose={() => {
          setDeletePasswordModalOpen(false);
          setDeleteConfirmPassword('');
          setDeletePasswordError(null);
        }}
        title="Confirm Account Deletion"
      >
        <form onSubmit={handleConfirmDeleteAccountSubmit} className="space-y-4">
          <p className="text-xs text-slate-300">
            Please enter your password to permanently delete your account.
          </p>

          {deletePasswordError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{deletePasswordError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">Password</label>
            <input
              type="password"
              value={deleteConfirmPassword}
              onChange={(e) => {
                setDeleteConfirmPassword(e.target.value);
                setDeletePasswordError(null);
              }}
              placeholder="Enter your password"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-200 text-xs focus:outline-none focus:border-red-500/60 shadow-inner"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={deleteLoading}
              onClick={() => {
                setDeletePasswordModalOpen(false);
                setDeleteConfirmPassword('');
                setDeletePasswordError(null);
              }}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deleteLoading}
              className="btn-danger text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{deleteLoading ? 'Deleting...' : 'Confirm Delete'}</span>
            </button>
          </div>
        </form>
      </Modal>

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
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmResetSettings}
              className="btn-danger text-xs px-4 py-2"
            >
              Reset Settings
            </button>
          </div>
        </div>
      </Modal>

      {/* PROFILE PICTURE CROP & ADJUSTMENT MODAL */}
      {cropModalOpen && (
        <Modal
          isOpen={cropModalOpen}
          onClose={() => setCropModalOpen(false)}
          title="Adjust Profile Picture"
        >
          <div className="space-y-5 select-none">
            <p className="text-xs theme-text-secondary text-center">
              Drag to position. Pinch (mobile) or scroll (desktop) to zoom.
            </p>

            {/* CROP BOX CONTAINER */}
            <div className="flex justify-center py-2">
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
                className="relative w-[260px] h-[260px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl cursor-grab active:cursor-grabbing flex items-center justify-center touch-none select-none"
              >
                {/* DRAGGABLE & ZOOMABLE IMAGE */}
                {rawImageSrc && (
                  <img
                    src={rawImageSrc}
                    alt="Crop preview"
                    draggable={false}
                    style={{
                      transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`,
                      maxHeight: '100%',
                      maxWidth: '100%',
                      objectFit: 'contain',
                      transition: isDragging ? 'none' : 'transform 0.05s ease-out'
                    }}
                    className="pointer-events-none select-none"
                  />
                )}

                {/* CIRCULAR CROP GUIDE OVERLAY */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[220px] h-[220px] rounded-full border-2 border-brand-400/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.75)] flex items-center justify-center">
                    <div className="w-full h-full rounded-full border border-white/20"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* MODAL ACTION BUTTON */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleApplyCrop}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save & Apply Photo</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
