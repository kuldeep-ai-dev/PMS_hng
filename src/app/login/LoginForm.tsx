'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { login } from './actions';
import { cn } from '@/lib/utils';

interface Props {
    message?: string;
}

export function LoginForm({ message: initialMessage }: Props) {
    const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(initialMessage);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!recaptchaToken) {
            setMessage("Please complete the reCAPTCHA verification");
            return;
        }
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        try {
            const result = await login(formData) as any;
            if (result && !result.success) {
                setIsLoading(false);
                setMessage(result.error);
                return;
            }
        } catch (error: any) {
            // Next.js redirect() throws a special error that should not be treated as a failure
            if (error?.message === 'NEXT_REDIRECT' || error?.digest?.includes('NEXT_REDIRECT')) {
                return;
            }
            setIsLoading(false);
            setMessage("An error occurred during login.");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="w-full max-w-sm mx-auto"
        >
            <form
                onSubmit={handleSubmit}
                className="space-y-6"
            >
                {/* Premium Overlay Transition */}
                <AnimatePresence>
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-slate-50/40 backdrop-blur-[24px] flex flex-col items-center justify-center p-6"
                        >
                            {/* Sophisticated Background Architecture */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        rotate: [0, 90, 0],
                                        x: [0, 100, 0]
                                    }}
                                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                    className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-blue-400/10 rounded-full blur-[120px]"
                                />
                                <motion.div
                                    animate={{
                                        scale: [1.2, 1, 1.2],
                                        rotate: [0, -90, 0],
                                        x: [0, -100, 0]
                                    }}
                                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                                    className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-indigo-400/10 rounded-full blur-[150px]"
                                />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_0%,transparent_100%)]" />
                            </div>

                            <div className="relative z-10 flex flex-col items-center max-w-md w-full gap-12">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: 30 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                                    className="relative flex flex-col items-center"
                                >
                                    {/* Icon Container with multi-layered shadows */}
                                    <div className="relative mb-8">
                                        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
                                        <div className="relative w-24 h-24 bg-slate-900 rounded-[32px] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/40 via-transparent to-indigo-500/20 opacity-50" />
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            >
                                                <Loader2 className="w-10 h-10 text-white" />
                                            </motion.div>
                                        </div>
                                    </div>

                                    <div className="text-center space-y-3">
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter sm:text-4xl">
                                            Initializing <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Workspace</span>
                                        </h2>
                                        <p className="text-sm font-bold text-slate-500/80 tracking-wide uppercase px-6 py-2 bg-white/50 backdrop-blur-md rounded-full border border-slate-200/50 shadow-sm inline-block mx-auto">
                                            Authenticating Secure Session
                                        </p>
                                    </div>
                                </motion.div>

                                {/* Advanced Verification Roadmap */}
                                <div className="w-full space-y-8 bg-white/40 p-8 rounded-[32px] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end mb-2">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Deployment Stage</p>
                                                <p className="text-sm font-bold text-slate-800">Booting Analytics Engine...</p>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 tabular-nums uppercase tracking-widest">Efficiency 100%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100/50 rounded-full overflow-hidden flex p-0.5 border border-slate-200/20">
                                            <motion.div
                                                initial={{ width: "0%" }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 0.5, ease: "circOut" }}
                                                className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                            />
                                        </div>
                                    </div>

                                    {/* Verification Chips */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Security Handshake', status: 'Active' },
                                            { label: 'Schema Validation', status: 'Verified' },
                                            { label: 'Cloud Sync', status: 'Pending' },
                                            { label: 'Asset Pre-load', status: 'Running' }
                                        ].map((chip, i) => (
                                            <motion.div
                                                key={chip.label}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.5 + (i * 0.1) }}
                                                className="flex items-center gap-3 px-4 py-3 bg-white/60 border border-white/80 rounded-2xl group hover:bg-white transition-colors"
                                            >
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    chip.status === 'Verified' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                        chip.status === 'Pending' ? 'bg-slate-300' : 'bg-blue-500 animate-pulse'
                                                )} />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{chip.label}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2 font-bold border border-red-100"
                        >
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {message}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-4">
                    <div className="space-y-1.5 relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1" htmlFor="email">
                            Email Address
                        </label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                name="email"
                                type="email"
                                placeholder="name@company.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1" htmlFor="password">
                            Password
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Google reCAPTCHA */}
                <div className="flex justify-center py-2 scale-90 sm:scale-100 origin-center transition-all">
                    <ReCAPTCHA
                        sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                        onChange={(token) => setRecaptchaToken(token)}
                    />
                </div>

                <input type="hidden" name="g-recaptcha-response" value={recaptchaToken || ''} />

                <button
                    disabled={isLoading}
                    className={cn(
                        "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2",
                        isLoading
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
                    )}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        "Access Dashboard"
                    )}
                </button>
            </form>
        </motion.div>
    );
}
