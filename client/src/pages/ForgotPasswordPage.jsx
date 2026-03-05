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
        <div className="flex relative items-center justify-center min-h-screen bg-[#F5F7FA] dark:bg-dark-bg p-6 overflow-hidden transition-colors duration-300">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-400/10 dark:bg-brand-500/5 blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/10 dark:bg-blue-500/5 blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <div className="flex justify-center items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-400 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter text-neutral-900 dark:text-white">RankPilot</h1>
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Reset Password</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 font-medium tracking-wide">Enter your email to receive a reset link</p>
                </div>

                <div className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border border-white/20 dark:border-neutral-700/50 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-brand-900/5 dark:shadow-none relative">
                    {isSent ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Check your email</h3>
                            <p className="text-neutral-500 dark:text-neutral-400 mb-8">We've sent a password reset link to <span className="font-semibold text-neutral-900 dark:text-white">{email}</span></p>
                            <Link to="/login" className="w-full flex justify-center py-3.5 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-600 dark:text-neutral-300 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <Input
                                    label="Email Address"
                                    type="email"
                                    placeholder="Enter your registered email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />

                                <Button loading={loading} type="submit" className="w-full py-3.5 text-[15px] shadow-xl shadow-brand-500/25">
                                    Send Reset Link
                                </Button>
                            </form>
                            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-8 font-medium">
                                Remember your password? <Link to="/login" className="text-brand-600 dark:text-brand-400 font-bold hover:underline underline-offset-4 decoration-2">Sign in instead</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
