'use client';

import { useState, useEffect } from 'react';

interface SplashScreenProps {
    hotelName: string;
}

export function SplashScreen({ hotelName }: SplashScreenProps) {
    const [phase, setPhase] = useState<'visible' | 'fading' | 'gone'>('visible');

    useEffect(() => {
        const fadeTimer = setTimeout(() => setPhase('fading'), 2200);
        const goneTimer = setTimeout(() => setPhase('gone'), 3000);
        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(goneTimer);
        };
    }, []);

    if (phase === 'gone') return null;

    return (
        <div
            className="splash-overlay"
            style={{ opacity: phase === 'fading' ? 0 : 1 }}
        >
            {/* Animated background blobs */}
            <div className="splash-blob splash-blob-1" />
            <div className="splash-blob splash-blob-2" />
            <div className="splash-blob splash-blob-3" />

            {/* Content */}
            <div className="splash-content">
                {/* Logo */}
                <div className="splash-logo border border-white/20 bg-white/10 backdrop-blur-md">
                    <img src="/pmslogo.svg" alt="Geny PMS" className="w-[80px] h-auto object-contain p-2" />
                </div>

                {/* Welcome text */}
                <p className="splash-welcome">Welcome to</p>
                <h1 className="splash-title">Geny PMS Pro Plus</h1>

                {/* Hotel name */}
                {hotelName && (
                    <div className="splash-hotel">
                        <div className="splash-divider" />
                        <p className="splash-hotel-name">{hotelName}</p>
                    </div>
                )}

                {/* Loading indicator */}
                <div className="splash-loader">
                    <div className="splash-loader-dot" style={{ animationDelay: '0ms' }} />
                    <div className="splash-loader-dot" style={{ animationDelay: '150ms' }} />
                    <div className="splash-loader-dot" style={{ animationDelay: '300ms' }} />
                </div>
            </div>

            <style>{`
                .splash-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0d3d4d 100%);
                    transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                }

                .splash-blob {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    opacity: 0.25;
                }
                .splash-blob-1 {
                    width: 400px; height: 400px;
                    background: #0d9488;
                    top: -100px; left: -100px;
                    animation: splash-float 6s ease-in-out infinite;
                }
                .splash-blob-2 {
                    width: 300px; height: 300px;
                    background: #14b8a6;
                    bottom: -80px; right: -80px;
                    animation: splash-float 8s ease-in-out infinite reverse;
                }
                .splash-blob-3 {
                    width: 200px; height: 200px;
                    background: #5eead4;
                    top: 40%; left: 60%;
                    animation: splash-float 7s ease-in-out infinite 1s;
                }

                @keyframes splash-float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(30px, -30px) scale(1.1); }
                }

                .splash-content {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    animation: splash-rise 0.8s cubic-bezier(0, 0, 0.2, 1) both;
                }

                @keyframes splash-rise {
                    from { opacity: 0; transform: translateY(24px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                .splash-logo {
                    min-width: 140px; min-height: 80px;
                    border-radius: 20px;
                    display: flex; align-items: center; justify-content: center;
                    margin-bottom: 28px;
                    box-shadow: 0 0 40px rgba(20, 184, 166, 0.2);
                    animation: splash-pulse-glow 2.5s ease-in-out infinite;
                    padding: 8px;
                }

                @keyframes splash-pulse-glow {
                    0%, 100% { box-shadow: 0 0 30px rgba(255, 255, 255, 0.1); }
                    50% { box-shadow: 0 0 50px rgba(255, 255, 255, 0.2); }
                }

                .splash-welcome {
                    font-size: 15px; font-weight: 500;
                    color: #94a3b8;
                    letter-spacing: 3px;
                    text-transform: uppercase;
                    margin: 0 0 8px 0;
                }

                .splash-title {
                    font-size: clamp(28px, 5vw, 42px);
                    font-weight: 800;
                    background: linear-gradient(135deg, #f0fdfa, #5eead4);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    margin: 0;
                    letter-spacing: -0.5px;
                    line-height: 1.1;
                }

                .splash-hotel {
                    margin-top: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    animation: splash-rise 0.8s cubic-bezier(0, 0, 0.2, 1) 0.3s both;
                }

                .splash-divider {
                    width: 48px; height: 2px;
                    background: linear-gradient(90deg, transparent, #14b8a6, transparent);
                    border-radius: 1px;
                    margin-bottom: 16px;
                }

                .splash-hotel-name {
                    font-size: clamp(16px, 3vw, 22px);
                    font-weight: 600;
                    color: #e2e8f0;
                    margin: 0;
                    letter-spacing: 0.5px;
                }

                .splash-loader {
                    display: flex;
                    gap: 8px;
                    margin-top: 40px;
                    animation: splash-rise 0.8s cubic-bezier(0, 0, 0.2, 1) 0.5s both;
                }

                .splash-loader-dot {
                    width: 8px; height: 8px;
                    border-radius: 50%;
                    background: #14b8a6;
                    animation: splash-bounce 1.2s ease-in-out infinite;
                }

                @keyframes splash-bounce {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
