import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

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
            await axios.post(`${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/register`, { name, email, password });
            toast.success('Registration successful. Please check your email to verify your account.');
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-50 dark:bg-dark-bg font-sans flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 p-8">
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
