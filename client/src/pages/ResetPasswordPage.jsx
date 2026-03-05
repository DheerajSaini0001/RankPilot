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

    if (!token) {
        return (
            <div className="flex relative items-center justify-center min-h-screen bg-[#F5F7FA] dark:bg-dark-bg p-6 overflow-hidden transition-colors duration-300">
                <div className="text-center p-8 bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border border-white/20 dark:border-neutral-700/50 rounded-3xl shadow-2xl">
                    <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Invalid Request</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 font-medium">No reset token found in URL.</p>
                </div>
            </div>
        );
    }

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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter text-neutral-900 dark:text-white">RankPilot</h1>
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Create New Password</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 font-medium tracking-wide">Please enter a strong new password below</p>
                </div>

                <div className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border border-white/20 dark:border-neutral-700/50 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-brand-900/5 dark:shadow-none relative">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="New Password"
                            type="password"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />

                        <Input
                            label="Confirm New Password"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        <Button loading={loading} type="submit" className="w-full py-3.5 text-[15px] shadow-xl shadow-brand-500/25">
                            Update Password
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
