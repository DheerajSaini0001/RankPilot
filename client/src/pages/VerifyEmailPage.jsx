import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail, forgotPassword } from '../api/authApi';

const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('loading'); // loading | success | error
    const [errorReason, setErrorReason] = useState('invalid'); // invalid | no-token

    useEffect(() => {
        if (!token) {
            setErrorReason('no-token');
            setStatus('error');
            return;
        }
        verifyEmail(token)
            .then(() => setStatus('success'))
            .catch(() => { setErrorReason('invalid'); setStatus('error'); });
    }, [token]);


    return (
        <div className="flex relative items-center justify-center min-h-screen bg-[#F5F7FA] dark:bg-dark-bg p-6 overflow-hidden transition-colors duration-300">
            {/* Background blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-400/10 dark:bg-brand-500/5 blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/10 dark:bg-blue-500/5 blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="flex justify-center items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-400 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter text-neutral-900 dark:text-white">RankPilot</h1>
                    </div>
                </div>

                <div className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border border-white/20 dark:border-neutral-700/50 rounded-3xl p-10 shadow-2xl shadow-brand-900/5 dark:shadow-none text-center">
                    {status === 'loading' && (
                        <>
                            <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-6"></div>
                            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Verifying your email...</h2>
                            <p className="text-neutral-500 dark:text-neutral-400 font-medium">Please wait a moment.</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white mb-2 tracking-tight">Email Verified!</h2>
                            <p className="text-neutral-500 dark:text-neutral-400 font-medium mb-8">Your account is now active. You can log in and start using RankPilot.</p>
                            <Link
                                to="/login"
                                className="w-full inline-flex justify-center items-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-brand-600 to-brand-400 text-white font-bold shadow-lg shadow-brand-500/30 hover:opacity-90 transition-opacity"
                            >
                                Go to Login →
                            </Link>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white mb-2 tracking-tight">
                                {errorReason === 'no-token' ? 'No Verification Token' : 'Link Already Used'}
                            </h2>
                            <p className="text-neutral-500 dark:text-neutral-400 font-medium mb-8">
                                {errorReason === 'no-token'
                                    ? 'This page requires a verification link from your email. If you already verified your account, just log in.'
                                    : 'This verification link has already been used or has expired. If your account is already verified, you can log in directly.'}
                            </p>
                            <Link
                                to="/login"
                                className="w-full inline-flex justify-center items-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-brand-600 to-brand-400 text-white font-bold shadow-lg shadow-brand-500/30 hover:opacity-90 transition-opacity mb-3"
                            >
                                Go to Login →
                            </Link>
                            <Link
                                to="/register"
                                className="w-full inline-flex justify-center items-center gap-2 py-3 px-6 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-sm"
                            >
                                ← Create New Account
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
