import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { authService } from '../services/authService';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ success: false, message: '' });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setStatus({ success: false, message: 'Missing email verification token.' });
      return;
    }

    authService.verifyEmail(token)
      .then((res) => {
        setStatus({ success: true, message: res.message || 'Email verified successfully!' });
      })
      .catch((err) => {
        setStatus({ success: false, message: err.message || 'Verification failed.' });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md text-center rounded-3xl glass-panel p-8 shadow-2xl border border-slate-800 space-y-6">
        {loading ? (
          <div className="py-8">
            <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold theme-text-primary">Verifying your email...</h2>
          </div>
        ) : status.success ? (
          <div className="py-4 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
            <h2 className="text-2xl font-bold theme-text-primary">Email Verified!</h2>
            <p className="text-sm theme-text-secondary">{status.message}</p>
            <Link to="/login" className="btn-primary inline-flex mt-4 px-6 py-2.5">
              Proceed to Login
            </Link>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
            <h2 className="text-2xl font-bold theme-text-primary">Verification Failed</h2>
            <p className="text-sm text-red-400">{status.message}</p>
            <Link to="/login" className="btn-secondary inline-flex mt-4 px-6 py-2.5">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
