'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ShieldAlert, LogOut } from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * Inactivity timeout in milliseconds.
 * Warning shown at (TIMEOUT - WARNING_DURATION).
 */
const TIMEOUT_MS = 15 * 60 * 1000;       // 15 minutes
const WARNING_MS = 60 * 1000;             // show warning 1 min before logout
const WARNING_DURATION_S = 60;            // countdown from 60 seconds

// Activity events to listen to
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
    'mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'wheel',
];

export function SessionTimeoutProvider({ userId }: { userId: string }) {
    const router = useRouter();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isLoggingOutRef = useRef(false);

    const [showWarning, setShowWarning] = useState(false);
    const [countdown, setCountdown] = useState(WARNING_DURATION_S);

    const clearAllTimers = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    };

    const performLogout = useCallback(async () => {
        if (isLoggingOutRef.current) return;
        isLoggingOutRef.current = true;
        clearAllTimers();
        setShowWarning(false);

        try {
            // Log the session-timeout logout in activity logs
            const supabase = createClient();
            await supabase.from('staff_activity_logs').insert({
                staff_id: userId,
                action: 'logout',
                details: 'Auto-logout due to 15-minute inactivity',
            });
            await supabase.auth.signOut();
        } catch (_) {
            // Even if fails, redirect
        }
        router.replace('/login?reason=timeout');
    }, [router, userId]);

    const resetTimer = useCallback(() => {
        if (isLoggingOutRef.current) return;
        clearAllTimers();
        setShowWarning(false);
        setCountdown(WARNING_DURATION_S);

        // Show warning after (TIMEOUT - WARNING_MS) of inactivity
        warnTimerRef.current = setTimeout(() => {
            setShowWarning(true);
            setCountdown(WARNING_DURATION_S);

            // Start countdown
            countdownRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownRef.current!);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Auto-logout when countdown ends
            timerRef.current = setTimeout(() => {
                performLogout();
            }, WARNING_MS);
        }, TIMEOUT_MS - WARNING_MS);
    }, [performLogout]);

    // Trigger logout when countdown hits 0
    useEffect(() => {
        if (countdown === 0 && showWarning) {
            performLogout();
        }
    }, [countdown, showWarning, performLogout]);

    // Mount activity listeners
    useEffect(() => {
        resetTimer();

        const handleActivity = () => resetTimer();
        ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

        return () => {
            clearAllTimers();
            ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
        };
    }, [resetTimer]);

    const handleStayLoggedIn = () => {
        resetTimer();
    };

    const handleLogoutNow = () => {
        performLogout();
    };

    if (!showWarning) return null;

    // Calculate ring animation (stroke-dashoffset based on countdown)
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const progress = countdown / WARNING_DURATION_S;
    const strokeDashoffset = circumference * (1 - progress);
    const isUrgent = countdown <= 15;

    return typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
                {/* Countdown ring */}
                <div className="relative mb-6">
                    <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                        <circle
                            cx="40" cy="40" r={radius}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="6"
                        />
                        <circle
                            cx="40" cy="40" r={radius}
                            fill="none"
                            stroke={isUrgent ? '#ef4444' : '#f59e0b'}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-1000"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-2xl font-bold tabular-nums ${isUrgent ? 'text-rose-600' : 'text-amber-600'}`}>
                            {countdown}
                        </span>
                    </div>
                </div>

                {/* Icon + Title */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isUrgent ? 'bg-rose-100' : 'bg-amber-100'}`}>
                    <ShieldAlert className={`w-6 h-6 ${isUrgent ? 'text-rose-600' : 'text-amber-600'}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Session Expiring</h3>
                <p className="text-sm text-slate-500 mb-8">
                    You've been inactive for 14 minutes. For security, you'll be automatically logged out in{' '}
                    <span className={`font-bold ${isUrgent ? 'text-rose-600' : 'text-amber-600'}`}>{countdown} second{countdown !== 1 ? 's' : ''}</span>.
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-3 w-full">
                    <button
                        onClick={handleStayLoggedIn}
                        className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm"
                    >
                        I'm still here — Stay logged in
                    </button>
                    <button
                        onClick={handleLogoutNow}
                        className="w-full py-2.5 px-4 text-slate-500 hover:text-rose-600 rounded-2xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Log out now
                    </button>
                </div>
            </div>
        </div>,
        document.body
    ) : null;
}
