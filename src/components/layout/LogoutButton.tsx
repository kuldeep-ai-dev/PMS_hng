'use client';

import { useState, useTransition } from 'react';
import { LogOut, Loader2, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logout } from '@/app/login/actions';
import { cn } from '@/lib/utils';

export function LogoutButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleLogout = () => {
        startTransition(async () => {
            await logout();
        });
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 group"
            >
                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isPending && setIsOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-200"
                        >
                            {/* Buffering Overlay */}
                            <AnimatePresence>
                                {isPending && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4"
                                    >
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-teal-600 animate-spin" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <LogOut className="w-4 h-4 text-teal-600" />
                                            </div>
                                        </div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
                                            Terminating Session
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>

                                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-2">
                                    Sign Out Confirmation
                                </h3>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                                    Are you sure you want to end your current session? You will need to log in again to access the dashboard.
                                </p>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleLogout}
                                        disabled={isPending}
                                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        Logout Now
                                    </button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        disabled={isPending}
                                        className="w-full py-4 bg-white hover:bg-slate-50 text-slate-500 font-bold rounded-2xl border border-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
