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

    return (
        <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="w-full max-w-sm mx-auto"
        >
            <form
                action={async (formData) => {
                    if (!recaptchaToken) {
                        setMessage("Please complete the reCAPTCHA verification");
                        return;
                    }
                    setIsLoading(true);
                    await login(formData);
                    setIsLoading(false);
                }}
                className="space-y-6"
            >
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
                        "w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2",
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
