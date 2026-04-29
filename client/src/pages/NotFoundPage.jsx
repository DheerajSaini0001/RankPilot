import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

const NotFoundPage = () => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-dark-surface flex items-center justify-center p-6">
            <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
                <div className="relative inline-block scale-150 mb-12">
                    <span className="text-9xl font-black text-brand-500 opacity-20">404</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl font-black tracking-tighter text-neutral-900 dark:text-white">LOST</span>
                    </div>
                </div>

                <div className="space-y-4 max-w-md mx-auto relative z-10">
                    <h1 className="text-3xl font-black text-neutral-900 dark:text-white leading-tight">This page is off the grid.</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 font-medium">The URL you're looking for doesn't exist or has been relocated to another galaxy.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                    <Button
                        onClick={() => navigate(-1)}
                        variant="secondary"
                        className="w-full sm:w-auto px-10 h-14 text-sm font-black border-2 border-neutral-200 dark:border-neutral-700"
                    >
                        Go Back
                    </Button>
                    <Button
                        onClick={() => navigate('/')}
                        className="w-full sm:w-auto px-10 h-14 text-sm font-black shadow-2xl shadow-brand-500/30"
                    >
                        Return Home
                    </Button>
                </div>

                <div className="pt-12 opacity-50 flex justify-center gap-4 grayscale">
                    <span className="text-2xl">🌍</span>
                    <span className="text-2xl">📡</span>
                    <span className="text-2xl">🛰️</span>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
