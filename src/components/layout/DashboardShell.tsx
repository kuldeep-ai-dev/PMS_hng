'use client';

import { useState, useEffect } from 'react';
import { SplashScreen } from '@/components/layout/SplashScreen';

interface DashboardShellProps {
    children: React.ReactNode;
    hotelName: string;
}

export function DashboardShell({ children, hotelName }: DashboardShellProps) {
    const [showSplash, setShowSplash] = useState(false);

    useEffect(() => {
        // Show splash only once per browser session
        const key = 'geny_pms_splash_shown';
        if (!sessionStorage.getItem(key)) {
            setShowSplash(true);
            sessionStorage.setItem(key, '1');
        }
    }, []);

    return (
        <>
            {showSplash && <SplashScreen hotelName={hotelName} />}
            {children}
        </>
    );
}
