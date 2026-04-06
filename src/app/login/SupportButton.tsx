'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LifeBuoy, Mail, Phone, Globe, X } from 'lucide-react';

export function SupportButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Floating Support Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-white text-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 font-bold text-sm transition-colors hover:border-blue-200"
            >
                <LifeBuoy className="w-5 h-5 text-blue-500" />
                <span className="hidden sm:inline-block">Support</span>
            </motion.button>

            {/* Support Modal Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-6 sm:p-8 border border-white"
                        >
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="mb-8">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                                    <LifeBuoy className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Need Help?</h3>
                                <p className="text-sm font-medium text-slate-500 mt-2">
                                    Our hospitality experts at MediaGeny are available to assist you.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <a href="mailto:support@mediageny.com" className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Support</p>
                                        <p className="text-sm font-bold text-slate-700">support@mediageny.com</p>
                                    </div>
                                </a>

                                <a href="tel:6002331851" className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                                        <p className="text-sm font-bold text-slate-700">600 233 1851</p>
                                    </div>
                                </a>

                                <a href="https://www.mediageny.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                        <Globe className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Website</p>
                                        <p className="text-sm font-bold text-slate-700">www.mediageny.com</p>
                                    </div>
                                </a>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
