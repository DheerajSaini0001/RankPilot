import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';
import { registerUser } from '../api/authApi';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await registerUser({ name, email, password });
            toast.success('Registration successful. Please check your email to verify your account.');
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex">

            {/* Left Panel — branding side (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
                {/* Background mesh & blobs */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-slate-900 to-slate-950" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-brand-600/20 rounded-full blur-[100px]" />

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="text-xl font-black text-white tracking-tight">RankPilot</span>
                </div>

                {/* Center content */}
                <div className="relative z-10">
                    <div className="text-4xl font-black text-white tracking-tight leading-tight mb-4">
                        Start in<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-blue-400">
                            under 2 minutes.
                        </span>
                    </div>
                    <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-xs">
                        Connect your marketing tools and let your AI analyst start finding opportunities instantly.
                    </p>

                    {/* Feature checklist */}
                    <div className="mt-8 space-y-3">
                        {[
                            'Connect GA4, GSC, Google Ads, Facebook Ads',
                            'AI-powered insights in plain English',
                            'AES-256 encrypted — your data stays private',
                            'No credit card required',
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-3 h-3 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-xs font-semibold text-slate-400">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom */}
                <div className="relative z-10">
                    <p className="text-xs text-slate-600 font-medium">Already have an account?{' '}
                        <NavLink to="/login" className="text-brand-400 hover:text-brand-300 font-black transition-colors">Sign in →</NavLink>
                    </p>
                </div>
            </div>

            {/* Right Panel — form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-950">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-2 mb-10 lg:hidden">
                        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className="text-lg font-black text-white">RankPilot</span>
                    </div>

                    {/* Heading */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Create your account</h1>
                        <p className="text-sm text-slate-400 font-medium">Free forever. No credit card required.</p>
                    </div>

                    {/* Register form */}
                    <form onSubmit={handleRegister} className="space-y-4">

                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Full Name</label>
                            <Input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Email Address</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Password</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Min 8 characters"
                                required
                                minLength={8}
                            />
                        </div>

                        {/* Terms note */}
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                            By creating an account you agree to our{' '}
                            <a href="#" className="text-slate-400 hover:text-white transition-colors">Terms of Service</a>
                            {' '}and{' '}
                            <a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a>.
                        </p>

                        <Button
                            type="submit"
                            loading={loading}
                            className="w-full py-3 text-sm font-black shadow-lg shadow-brand-500/25"
                        >
                            Create Account →
                        </Button>
                    </form>

                    {/* Already have account */}
                    <p className="text-center text-xs text-slate-500 mt-8">
                        Already have an account?{' '}
                        <NavLink to="/login" className="text-brand-400 hover:text-brand-300 font-black transition-colors">
                            Sign in →
                        </NavLink>
                    </p>

                    {/* Trust badges */}
                    <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-white/5">
                        {['🔒 Encrypted', '⚡ Instant Setup', '🤖 AI Powered'].map((badge, i) => (
                            <span key={i} className="text-[10px] font-bold text-slate-600">{badge}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;

