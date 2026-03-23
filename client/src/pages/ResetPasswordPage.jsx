import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { resetPassword } from '../api/authApi';
import toast from 'react-hot-toast';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({ token, newPassword });
      toast.success(res.data.message || 'Password reset successful!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Link may be expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-800/50 rounded-2xl p-8 text-center max-w-sm shadow-lg">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>
          <h2 className="text-lg font-black text-neutral-900 dark:text-white mb-2">Invalid Request</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No reset token found in URL. Please use the link from your email.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-500/8 dark:bg-brand-500/5 rounded-full blur-[120px]"/>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/6 dark:bg-blue-500/4 rounded-full blur-[100px]"/>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <span className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">RankPilot</span>
          </div>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-1 tracking-tight">Create New Password</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Enter a strong new password for your account</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 shadow-xl shadow-neutral-900/5 dark:shadow-none">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password strength info */}
            <div className="bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-800/50 rounded-xl p-3.5 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p className="text-xs text-brand-700 dark:text-brand-400 font-medium">
                Use at least 6 characters with a mix of letters and numbers for a strong password.
              </p>
            </div>

            {/* New Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400">New Password</label>
              <Input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Confirm Password</label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {/* Password match indicator */}
              {confirmPassword && (
                <p className={`text-[11px] font-bold flex items-center gap-1.5 mt-1 ${
                  newPassword === confirmPassword
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-500 dark:text-red-400'
                }`}>
                  {newPassword === confirmPassword ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                      </svg>
                      Passwords match
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                      Passwords do not match
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              loading={loading}
              type="submit"
              className="w-full py-3 text-sm font-black shadow-lg shadow-brand-500/25 mt-2"
            >
              Update Password
            </Button>

            {/* Back to login link */}
            <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
              Remember your password?{' '}
              <a href="/login" className="text-brand-600 dark:text-brand-400 font-black hover:underline">
                Sign in
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
