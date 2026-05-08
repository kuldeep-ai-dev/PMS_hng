import { getSettings } from '@/app/(dashboard)/settings/actions';
import { LoginForm } from './LoginForm';
import { AnimatedLeftPanel } from './AnimatedLeftPanel';
import { SupportButton } from './SupportButton';
import Image from 'next/image';
import Link from 'next/link';

export default async function LoginPage({
    searchParams,
}: {
    searchParams?: Promise<{ message?: string }>
}) {
    const resolvedParams = await searchParams;
    const settings = await getSettings();

    return (
        <div className="flex min-h-screen w-full bg-white overflow-hidden relative">
            <SupportButton />
            {/* Left Column: Branding & Slogan (Animated) */}
            <div className="hidden lg:flex lg:w-1/2 bg-zinc-950 relative items-center justify-center p-12 ">
                {/* Decorative Elements */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950 to-zinc-950" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-3xl" />

                <AnimatedLeftPanel />
            </div>

            {/* Right Column: Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 bg-white selection:bg-blue-100 selection:text-blue-900">
                <div className="w-full max-w-sm">
                    {/* Dynamic Hotel Branding Modular Card */}
                    <div className="mb-12 text-center bg-slate-50 border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col items-center">
                        <div className="flex items-center gap-4 mb-4 justify-center">
                            {settings.logo_url ? (
                                <img
                                    src={settings.logo_url}
                                    alt={settings.hotel_name}
                                    className="h-12 w-auto object-contain drop-shadow-sm mix-blend-multiply"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/30">
                                    {settings.hotel_name?.charAt(0)}
                                </div>
                            )}
                            <div className="h-8 w-px bg-slate-200" />
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                {settings.hotel_name}
                            </h2>
                        </div>

                        <p className="text-xs text-slate-500 font-bold tracking-wide uppercase">
                            Property Management Dashboard
                        </p>

                        <div className="mt-6 pt-6 border-t border-slate-200/60 w-full flex flex-col items-center gap-3">
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/ISO_9001-2015_Logo.png/800px-ISO_9001-2015_Logo.png"
                                alt="ISO 9001 Certified"
                                className="h-12 w-auto opacity-90 brightness-110 drop-shadow-sm"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                            <div className="text-center">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Quality Management</p>
                                <p className="text-[11px] font-bold text-slate-900">ISO 9001:2015 Certified</p>
                            </div>
                        </div>
                    </div>

                    {/* Form Component */}
                    <LoginForm message={resolvedParams?.message} />

                    <div className="mt-12 pt-8 border-t border-slate-100 relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose text-center">
                            By continuing, you agree to our <br />
                            <Link href="/security-protocols" className="text-indigo-600 cursor-pointer hover:underline">Security Protocols</Link> & <Link href="/data-policy" className="text-indigo-600 cursor-pointer hover:underline">Data Policy</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
