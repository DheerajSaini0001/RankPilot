import React, { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { getMe, resendVerification } from '../api/authApi';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [showResend, setShowResend] = useState(false);
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) return toast.error('Please enter email and password');
        setLoading(true);
        setShowResend(false);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/login`, { email, password });
            setAuth(res.data.token, res.data.user);
            toast.success('Login successful');

            const meRes = await getMe();
            if (meRes.data.connectedSources.length === 0) {
                navigate('/connect-accounts');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Login failed';
            toast.error(msg);
            // Show resend button if login failed because email is unverified
            if (err.response?.status === 403) {
                setShowResend(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResendLoading(true);
        try {
            const res = await resendVerification({ email });
            toast.success(res.data.message);
            setShowResend(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to resend verification email');
        } finally {
            setResendLoading(false);
        }
    };

    const loginGoogle = () => {
        window.location.href = `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/google`;
    };

    const loginFacebook = () => {
        window.location.href = `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/facebook`;
    };


    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg font-sans flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-400/20 dark:bg-brand-600/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

            <div className="relative bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl border border-white/20 dark:border-neutral-700/50 p-8 sm:p-10 z-10">
                <div className="flex justify-center mb-6">
                    <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">
                        RankPilot
                    </span>
                    <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 flex items-center">
                        AI
                    </span>
                </div>
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Log in to view your analytics.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <Input
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        required
                    />
                    <div>
                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                        <div className="flex justify-end mt-1">
                            <Link to="/forgot-password" className="text-xs text-brand-600 hover:text-brand-500 font-medium">Forgot Password?</Link>
                        </div>
                    </div>

                    <Button type="submit" loading={loading} className="w-full h-11 text-base">
                        Sign In
                    </Button>
                </form>

                {/* Resend verification banner - shown when login fails with 403 */}
                {showResend && (
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl">
                        <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-3 flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                            Your email isn't verified yet. Check your inbox or resend the link.
                        </p>
                        <button
                            onClick={handleResend}
                            disabled={resendLoading}
                            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {resendLoading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Resend Verification Email
                                </>
                            )}
                        </button>
                    </div>
                )}

                <div className="mt-6 flex items-center justify-center space-x-2">
                    <div className="h-px bg-neutral-200 dark:bg-neutral-700 w-full"></div>
                    <span className="text-neutral-500 dark:text-neutral-400 text-xs font-medium px-2">OR</span>
                    <div className="h-px bg-neutral-200 dark:bg-neutral-700 w-full"></div>
                </div>

                <div className="mt-6 space-y-3">
                    <Button variant="secondary" onClick={loginGoogle} className="w-full flex justify-center py-2.5">
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </Button>
                </div>

                <p className="mt-8 text-center text-sm text-neutral-600 dark:text-neutral-400">
                    Don't have an account? <NavLink to="/register" className="text-brand-600 hover:underline font-medium dark:text-brand-400">Sign up</NavLink>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
