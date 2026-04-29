import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../api/authApi';
import Navbar from '../components/ui/Navbar';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(!token ? 'error' : 'loading');
  const [errorReason, setErrorReason] = useState(!token ? 'no-token' : 'invalid');

  useEffect(() => {
    if (!token || status !== 'loading') return;

    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => {
        setErrorReason('invalid');
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 flex flex-col transition-colors duration-500">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-500/8 dark:bg-brand-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/6 dark:bg-blue-500/4 rounded-full blur-[100px]" />
        </div>

        {/* Content */}
        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2.5 mb-1">
              <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">RankPilot</span>
            </div>
          </div>

          {/* Card Container */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 shadow-xl shadow-neutral-900/5 dark:shadow-none text-center">
            {/* Loading State */}
            {status === 'loading' && (
              <div className="flex flex-col items-center">
                {/* Spinner */}
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-neutral-100 dark:border-neutral-800" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-600 animate-spin" />
                </div>
                <h2 className="text-xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">Verifying your email</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">This will only take a moment...</p>

                {/* Animated dots */}
                <div className="flex items-center gap-1.5 mt-5">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Success State */}
            {status === 'success' && (
              <div className="flex flex-col items-center">
                {/* Success icon */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {/* Pulse ring */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-green-400 dark:border-green-600 animate-ping opacity-20" />
                </div>

                <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">Email Verified!</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium mb-8 leading-relaxed max-w-xs">
                  Your account is now active. You can log in and start using RankPilot.
                </p>

                {/* Success checkpoints */}
                <div className="w-full bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/50 rounded-xl p-4 mb-6 text-left space-y-2">
                  {[
                    'Email address confirmed',
                    'Account activated successfully',
                    'Ready to connect your analytics',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-xs font-semibold text-green-700 dark:text-green-400">{item}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to="/login"
                  className="w-full inline-flex justify-center items-center gap-2 py-3 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-black transition-all shadow-lg shadow-brand-500/25 hover:-translate-y-0.5 active:scale-95"
                >
                  Go to Login
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            )}

            {/* Error State */}
            {status === 'error' && (
              <div className="flex flex-col items-center">
                {/* Error icon */}
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>

                <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">
                  {errorReason === 'no-token' ? 'No Verification Token' : 'Link Already Used'}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium mb-6 leading-relaxed max-w-xs">
                  {errorReason === 'no-token'
                    ? 'This page requires a verification link from your email. If you already verified your account, just log in.'
                    : 'This verification link has already been used or has expired. If your account is already verified, you can log in directly.'
                  }
                </p>

                {/* Info box */}
                <div className="w-full bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-xl p-4 mb-6 text-left">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errorReason === 'no-token'
                      ? 'Check your inbox for the verification email from RankPilot.'
                      : 'Each verification link can only be used once for security reasons.'
                    }
                  </p>
                </div>

                <div className="w-full space-y-3">
                  <Link
                    to="/login"
                    className="w-full inline-flex justify-center items-center gap-2 py-3 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-black transition-all shadow-lg shadow-brand-500/25 hover:-translate-y-0.5 active:scale-95"
                  >
                    Go to Login
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    to="/register"
                    className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-6 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                  >
                    ← Create New Account
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
