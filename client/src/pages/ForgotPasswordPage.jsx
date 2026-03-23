import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { forgotPassword } from '../api/authApi';
import toast from 'react-hot-toast';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await forgotPassword({ email });
            toast.success(res.data.message || 'Reset link sent to your email.');
            setIsSent(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send reset link.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-500/8 dark:bg-brand-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/6 dark:bg-blue-500/4 rounded-full blur-[100px]" />
            </div>
            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2.5 mb-5">
                        <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">RankPilot</span>
                    </div>
                    <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-1 tracking-tight">Reset Password</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Enter your email to receive a reset link</p>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 shadow-xl shadow-neutral-900/5 dark:shadow-none">
                    {!isSent ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Info box */}
                            <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3.5 flex items-start gap-2.5">
                                <svg className="w-4 h-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                                    We will send a password reset link to your registered email address.
                                </p>
                            </div>

                            {/* Email input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Email Address</label>
                                <Input
                                    type="email"
                                    placeholder="Enter your registered email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Submit button */}
                            <Button
                                loading={loading}
                                type="submit"
                                className="w-full py-3 text-sm font-black shadow-lg shadow-brand-500/25 mt-2"
                            >
                                Send Reset Link
                            </Button>

                            {/* Back to login */}
                            <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
                                Remember your password?{' '}
                                <Link to="/login" className="text-brand-600 dark:text-brand-400 font-black hover:underline">
                                    Sign in
                                </Link>
                            </p>
                        </form>
                    ) : (
                        /* Sent State */
                        <div className="flex flex-col items-center text-center">
                            {/* Success icon */}
                            <div className="relative mb-6">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="absolute inset-0 rounded-2xl border-2 border-green-400 dark:border-green-600 animate-ping opacity-20" />
                            </div>

                            <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">Check your inbox</h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2 leading-relaxed">
                                We have sent a password reset link to
                            </p>
                            <p className="text-sm font-black text-neutral-900 dark:text-white mb-6">{email}</p>

                            {/* Steps */}
                            <div className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-6 text-left space-y-3">
                                {[
                                    'Open the email from RankPilot',
                                    'Click the reset link in the email',
                                    'Create your new password',
                                ].map((step, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[10px] font-black text-brand-600 dark:text-brand-400">{i + 1}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">{step}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Expiry note */}
                            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mb-5 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                The reset link will expire in 1 hour
                            </p>

                            {/* Back to login button */}
                            <Link
                                to="/login"
                                className="w-full inline-flex justify-center items-center gap-2 py-3 px-6 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 text-sm font-black hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                            >
                                ← Back to Login
                            </Link>

                            {/* Resend hint */}
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-4">
                                Did not receive it?{' '}
                                <button
                                    onClick={() => setIsSent(false)}
                                    className="text-brand-600 dark:text-brand-400 font-black hover:underline"
                                >
                                    Try again
                                </button>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;

