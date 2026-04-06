import React from 'react';
import { Shield } from 'lucide-react';
import Link from 'next/link';

export default function SecurityProtocolsPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl p-8 sm:p-12 border border-slate-100">
                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-100">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Security Protocols</h1>
                        <p className="text-slate-500 font-medium">Geny PMS Pro Platform Security Guidelines</p>
                    </div>
                </div>

                <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-indigo-600">
                    <p>
                        At MediaGeny, our primary responsibility is the secure operations of your hospitality business. We employ industry-standard, bank-grade encryption techniques and continuous threat intelligence.
                    </p>

                    <h3>1. Data Protection</h3>
                    <p>All data in transit is encrypted using TLS 1.3, while data at rest is secured via AES-256 standards upon our secure managed database deployments.</p>

                    <h3>2. Authentication & Threat Modeling</h3>
                    <p>Access privileges strictly adhere to role-based access control (RBAC). Furthermore, we mitigate automated spam or brute-force threat vectors uniformly through Google's reCAPTCHA v2 behavioral verification and strict algorithmic throttling mechanisms.</p>

                    <h3>3. Server Integrity & Availability</h3>
                    <p>The hotel dashboards are routed entirely through secure edges ensuring zero native exposure. Internal databases are firewalled with strict Row Level Security (RLS) policies configured.</p>

                </div>

                <div className="mt-12 pt-8 border-t border-slate-100">
                    <Link href="/login" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                        &larr; Return to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
