'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import Image from 'next/image';

const containerVariants: Variants = {
    hidden: { opacity: 0, filter: 'blur(10px)' },
    visible: {
        opacity: 1,
        filter: 'blur(0px)',
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.1,
            ease: "easeOut",
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, x: -40, filter: 'blur(5px)' },
    visible: {
        opacity: 1,
        x: 0,
        filter: 'blur(0px)',
        transition: {
            type: 'spring',
            stiffness: 80,
            damping: 15,
            mass: 1,
        },
    },
};


export function AnimatedLeftPanel() {
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative z-10 w-full max-w-lg text-white flex flex-col justify-center h-full"
        >
            {/* Bento Logo Container */}
            <motion.div variants={itemVariants} className="mb-10 inline-flex flex-col items-start gap-4 p-6 bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl transition-all hover:bg-zinc-900/70 w-fit cursor-pointer group">
                <div className="bg-white p-3 rounded-2xl w-fit drop-shadow-xl relative overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0, x: -100 }}
                        animate={{ opacity: 0.5, x: 200 }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 1, repeat: Infinity, repeatDelay: 5 }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12"
                    />
                    <Image
                        src="/pmslogo.svg"
                        alt="Geny PMS Logo"
                        width={100}
                        height={50}
                        className="drop-shadow-sm transition-transform group-hover:scale-105 duration-500 object-contain"
                        priority
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <h2 className="text-xs font-bold tracking-[0.2em] text-zinc-400">PMS PRO EDITION</h2>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-5 relative">
                <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="absolute -left-6 top-1 w-1 h-28 bg-gradient-to-b from-blue-500 to-transparent rounded-full opacity-50 origin-top"
                />
                <h1 className="text-5xl lg:text-6xl font-black tracking-tighter leading-[0.9] text-white">
                    Welcome <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Back.</span>
                </h1>
                <p className="text-base lg:text-lg font-medium text-zinc-400 max-w-sm leading-relaxed">
                    "The Next Gen of Management" — elevating your hospitality operations with intelligence and speed.
                </p>

                {/* Modular Chips */}
                <motion.div variants={containerVariants} className="flex flex-wrap gap-2 pt-2">
                    {[{ icon: "⚡", color: "text-blue-400", text: "Real-time Sync" },
                    { icon: "🛡️", color: "text-emerald-400", text: "Bank-grade Security" },
                    { icon: "📊", color: "text-purple-400", text: "Deep Analytics" }].map((chip, idx) => (
                        <motion.span
                            key={idx}
                            variants={itemVariants}
                            whileHover={{ scale: 1.05, y: -2 }}
                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] sm:text-xs font-bold text-zinc-300 backdrop-blur-md shadow-lg flex items-center gap-2 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-colors"
                        >
                            <span className={chip.color}>{chip.icon}</span> {chip.text}
                        </motion.span>
                    ))}
                </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-12 pt-6 border-t border-white/10 flex items-center gap-4">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-md transition-colors hover:bg-white/10 cursor-pointer">
                    <span className="text-[10px] font-black text-blue-400">MG</span>
                </div>
                <p className="text-[10px] lg:text-xs font-bold tracking-wide text-zinc-500 uppercase">
                    A product of <span className="text-zinc-300">MediaGeny Tech Solutions</span>
                </p>
            </motion.div>
        </motion.div>
    );
}
