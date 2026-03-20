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
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Join RankPilot to get started.</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <Input
                        label="Full Name"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="John Doe"
                        required
                    />
                    <Input
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={8}
                    />

                    <Button type="submit" loading={loading} className="w-full h-11 text-base mt-2">
                        Sign Up
                    </Button>
                </form>

                <p className="mt-8 text-center text-sm text-neutral-600 dark:text-neutral-400">
                    Already have an account? <NavLink to="/login" className="text-brand-600 hover:underline font-medium dark:text-brand-400">Log in</NavLink>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
