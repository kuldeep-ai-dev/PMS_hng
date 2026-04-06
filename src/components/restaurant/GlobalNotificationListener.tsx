'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function GlobalNotificationListener({ userRole }: { userRole: string | null }) {
    const audioContextRef = useRef<AudioContext | null>(null);
    const isAudioEnabledRef = useRef(false);
    const userRoleRef = useRef<string | null>(null);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        userRoleRef.current = userRole;
    }, [userRole]);

    useEffect(() => {
        // Load preference from localStorage
        const saved = localStorage.getItem('geny_pms_order_alerts');
        isAudioEnabledRef.current = saved === 'true';

        // Auto-unlock helper for Web Audio API
        const unlock = () => {
            if (!audioContextRef.current) {
                const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
                if (AudioContextClass) {
                    audioContextRef.current = new AudioContextClass();
                }
            }
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
        };
        window.addEventListener('click', unlock);
        window.addEventListener('touchstart', unlock);

        // Listen for storage changes in other tabs
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'geny_pms_order_alerts') {
                isAudioEnabledRef.current = e.newValue === 'true';
            }
        };
        window.addEventListener('storage', handleStorage);

        // Periodically sync with localStorage to catch changes in same tab
        const interval = setInterval(() => {
            const saved = localStorage.getItem('geny_pms_order_alerts');
            isAudioEnabledRef.current = saved === 'true';
        }, 1000);

        // Expose for debugging
        (window as any).playRestaurantAlert = () => {
            console.log('Manual global alert trigger');
            playNotification();
        };

        return () => {
            window.removeEventListener('click', unlock);
            window.removeEventListener('touchstart', unlock);
            window.removeEventListener('storage', handleStorage);
            clearInterval(interval);
            delete (window as any).playRestaurantAlert;
        };
    }, []);

    const playNotification = async () => {
        const authorizedRoles = ['restaurant_staff'];
        const currentEnabled = isAudioEnabledRef.current;
        const currentRole = userRoleRef.current;
        const isAuthorized = authorizedRoles.includes(currentRole || '');

        console.log('Global Notification Request - Enabled:', currentEnabled, 'Role:', currentRole);

        if (currentEnabled && isAuthorized) {
            try {
                if (!audioContextRef.current) {
                    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
                    if (AudioContextClass) audioContextRef.current = new AudioContextClass();
                }

                const ctx = audioContextRef.current;
                if (!ctx) return;

                if (ctx.state === 'suspended') {
                    await ctx.resume();
                }

                console.log('Global Audio Engine: PLAYING');

                // --- High Quality Synthesized Ding-Dong Chime ---
                const playTone = (freq: number, startDelta: number, duration: number) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelta);

                    gain.gain.setValueAtTime(0, ctx.currentTime + startDelta);
                    gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + startDelta + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startDelta + duration);

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(ctx.currentTime + startDelta);
                    osc.stop(ctx.currentTime + startDelta + duration);
                };

                // Ding (880Hz)
                playTone(880, 0, 0.8);
                // Dong (660Hz) - slightly later
                playTone(660, 0.4, 1.2);

            } catch (error) {
                console.error('Global Audio Engine ERROR:', error);
            }
        } else {
            console.log('Global Audio: Sound skipped. Enabled:', currentEnabled, 'Authorized:', isAuthorized);
        }
    };

    useEffect(() => {
        const authorizedRoles = ['restaurant_staff'];
        if (!authorizedRoles.includes(userRole || '')) return;

        const channel = supabase
            .channel('global-restaurant-alerts')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'restaurant_orders'
            }, (payload) => {
                // Only if it's a new order from Room or Table
                console.log('Global Realtime Order Logic Triggered');

                toast.info('New Restaurant Order! 🔔', {
                    description: `A new order has been placed from ${payload.new.order_source.replace('_', ' ')}.`,
                    action: {
                        label: 'View Orders',
                        onClick: () => router.push('/restaurant/orders'),
                    },
                    duration: 10000,
                });

                playNotification();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userRole]);

    return null; // This component doesn't render any UI
}
