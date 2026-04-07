'use client';

import { useState, useEffect } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import { Settings, Save, Building, Tag, IndianRupee, MapPin, Loader2, X, Plus, Globe, RefreshCw, Copy, Check, MessageCircle, FileKey2 } from 'lucide-react';
import { getSettings, updateSettings } from './actions';

export default function SettingsPage() {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<any>(null);
    const [sendingWa, setSendingWa] = useState(false);
    const [waResult, setWaResult] = useState<any>(null);

    const generateKey = (len = 32) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const handleCopy = (text: string, keyName: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(keyName);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings({ ...settings, [key]: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        getSettings().then(data => {
            setSettings(data);
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await updateSettings(settings);
            if (result && !result.success) {
                throw new Error(result.error);
            }
            alert('Settings updated successfully!');
        } catch (e: any) {
            console.error('Settings save failed:', e);
            alert(`Failed to save settings: ${e.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex h-full items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
    );

    return (
        <div className="flex flex-col gap-6 h-full max-w-4xl mx-auto pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Configuration</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage currency, taxes, and hotel identity.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Configuration
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hotel Identity */}
                <BentoCard className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                            <Building className="w-5 h-5" />
                        </div>
                        <h2 className="font-bold text-slate-800">Hotel Details</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Hotel Name</label>
                            <input
                                type="text"
                                value={settings.hotel_name}
                                onChange={e => setSettings({ ...settings, hotel_name: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Phone Number</label>
                                <input
                                    type="text"
                                    placeholder="+1 234 567 890"
                                    value={settings.phone || ''}
                                    onChange={e => setSettings({ ...settings, phone: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="contact@hotel.com"
                                    value={settings.email || ''}
                                    onChange={e => setSettings({ ...settings, email: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Hotel Logo (SVG Format)</label>
                            <div className="flex items-center gap-4">
                                {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="w-16 h-16 object-contain bg-slate-100 rounded-lg shadow-sm border border-slate-200 p-1" />}
                                <input
                                    type="file"
                                    accept=".svg,image/svg+xml"
                                    onChange={(e) => handleImageUpload(e, 'logo_url')}
                                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Hotel Website</label>
                            <input
                                type="text"
                                placeholder="www.hotel.com"
                                value={settings.website || ''}
                                onChange={e => setSettings({ ...settings, website: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Google Review / Rating Link</label>
                            <input
                                type="text"
                                placeholder="https://g.page/r/YOUR_HOTEL/review"
                                value={settings.google_review_url || ''}
                                onChange={e => setSettings({ ...settings, google_review_url: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                            />
                            <p className="text-[11px] text-slate-400 mt-1.5">This link will be sent via WhatsApp at checkout. Guest clicks are tracked in <strong>Analytics → WhatsApp Insights</strong>.</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2 font-bold text-slate-500 uppercase tracking-widest block mb-1 flex items-center gap-1">Mail ID for Bookings</label>
                            <input
                                type="email"
                                placeholder="booking@hotel.com"
                                value={settings.booking_email || ''}
                                onChange={e => setSettings({ ...settings, booking_email: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2 font-bold text-slate-500 uppercase tracking-widest block mb-1 flex items-center gap-1">Check-in Time</label>
                            <input
                                type="text"
                                placeholder="12:00 PM"
                                value={settings.check_in_time || ''}
                                onChange={e => setSettings({ ...settings, check_in_time: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1 flex items-center gap-1 font-bold text-slate-500 uppercase tracking-widest block mb-1 flex items-center gap-1">Check-out Time</label>
                            <input
                                type="text"
                                placeholder="11:00 AM"
                                value={settings.check_out_time || ''}
                                onChange={e => setSettings({ ...settings, check_out_time: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Authorized Signature Image (For Invoices)</label>
                            <div className="flex items-center gap-4">
                                {settings.signature_url && <img src={settings.signature_url} alt="Signature" className="w-16 h-16 object-contain bg-slate-100 rounded-lg shadow-sm border border-slate-200" />}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'signature_url')}
                                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2 text-sm flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Address
                            </label>
                            <textarea
                                rows={2}
                                value={settings.address}
                                onChange={e => setSettings({ ...settings, address: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm resize-none"
                            />
                        </div>
                    </div>
                </BentoCard>

                {/* Tax & GSTIN */}
                <BentoCard className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                            <Tag className="w-5 h-5" />
                        </div>
                        <h2 className="font-bold text-slate-800">Tax & Compliance</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">GSTIN Number</label>
                            <input
                                type="text"
                                placeholder="e.g. 22AAAAA0000A1Z5"
                                value={settings.gstin}
                                onChange={e => setSettings({ ...settings, gstin: e.target.value })}
                                className="w-full p-3 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm uppercase"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">CGST Rate (%)</label>
                                <input
                                    type="number"
                                    value={settings.cgst_rate === 0 ? '' : settings.cgst_rate}
                                    onChange={e => setSettings({ ...settings, cgst_rate: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">SGST Rate (%)</label>
                                <input
                                    type="number"
                                    value={settings.sgst_rate === 0 ? '' : settings.sgst_rate}
                                    onChange={e => setSettings({ ...settings, sgst_rate: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm font-bold"
                                />
                            </div>
                        </div>
                    </div>
                </BentoCard>

                {/* Digital Signatures (.pfx) */}
                <BentoCard className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                            <FileKey2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h2 className="font-bold text-slate-800">Digital Signatures (e-Sign)</h2>
                            <p className="text-sm text-slate-500">Cryptographically sign generated PDF invoices using a .pfx certificate.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">
                                Upload Certificate (.pfx / .p12)
                            </label>
                            <input
                                type="file"
                                accept=".pfx,.p12"
                                onChange={(e) => handleImageUpload(e, 'digital_signature_pfx_base64')}
                                className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer text-sm mb-2"
                            />
                            {settings.digital_signature_pfx_base64 && (
                                <p className="text-xs text-emerald-600 font-semibold mt-1">✅ Certificate securely loaded</p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                                Certificate Password
                            </label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={settings.digital_signature_password || ''}
                                onChange={e => setSettings({ ...settings, digital_signature_password: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                            />
                        </div>
                    </div>
                </BentoCard>

                {/* Regional & Currency */}
                <BentoCard className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <IndianRupee className="w-5 h-5" />
                        </div>
                        <h2 className="font-bold text-slate-800">Regional Settings</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Base Currency</label>
                            <div className="flex gap-2">
                                <select
                                    value={settings.currency}
                                    onChange={e => setSettings({ ...settings, currency: e.target.value, currency_symbol: e.target.value === 'INR' ? '₹' : '$' })}
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                >
                                    <option value="INR">Indian Rupee (INR)</option>
                                    <option value="USD">US Dollar (USD)</option>
                                </select>
                                <div className="w-12 flex items-center justify-center bg-slate-900 text-teal-400 rounded-xl font-bold text-lg">
                                    {settings.currency === 'INR' ? '₹' : '$'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center p-4 bg-teal-50/50 rounded-2xl border border-teal-100">
                            <div className="p-2 bg-teal-100 rounded-full mr-3 text-teal-600">
                                <Settings className="w-4 h-4" />
                            </div>
                            <p className="text-sm text-teal-800 leading-snug">
                                <span className="font-bold block mb-1">Currency Sync</span>
                                All financial totals on the dashboard and folios will be rendered in {settings.currency === 'INR' ? 'Indian Rupees' : 'US Dollars'}.
                            </p>
                        </div>
                    </div>
                </BentoCard>

                {/* Room Types Management */}
                <BentoCard className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                            <Building className="w-5 h-5" />
                        </div>
                        <h2 className="font-bold text-slate-800">Room Categories</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Manage Types</label>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {(settings.room_types || []).map((type: string, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium border border-purple-100">
                                        {type}
                                        <button
                                            onClick={() => {
                                                const newTypes = settings.room_types.filter((_: any, i: number) => i !== idx);
                                                setSettings({ ...settings, room_types: newTypes });
                                            }}
                                            className="hover:text-purple-900"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {(!settings.room_types || settings.room_types.length === 0) && (
                                    <p className="text-xs text-slate-400 italic">No room types defined.</p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    id="new-room-type"
                                    placeholder="Add new type (e.g. Executive)"
                                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const input = e.target as HTMLInputElement;
                                            if (input.value.trim()) {
                                                const newTypes = [...(settings.room_types || []), input.value.trim()];
                                                setSettings({ ...settings, room_types: newTypes });
                                                input.value = '';
                                            }
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        const input = document.getElementById('new-room-type') as HTMLInputElement;
                                        if (input.value.trim()) {
                                            const newTypes = [...(settings.room_types || []), input.value.trim()];
                                            setSettings({ ...settings, room_types: newTypes });
                                            input.value = '';
                                        }
                                    }}
                                    className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </BentoCard>

                {/* Booking Engine Integration */}
                <BentoCard className="p-6 md:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">Website Booking Engine Gateway</h2>
                            <p className="text-sm text-slate-500">Configure connection keys for your external Next.js website.</p>
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Webhook Secret */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Webhook Secret</label>
                                    <button
                                        onClick={() => setSettings({ ...settings, webhook_secret: generateKey(40) })}
                                        className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Generate New
                                    </button>
                                </div>
                                <div className="flex">
                                    <input
                                        type="text"
                                        readOnly
                                        value={settings.webhook_secret || ''}
                                        placeholder="Generate a secret first"
                                        className="flex-1 p-2.5 bg-white border border-slate-200 rounded-l-xl outline-none text-sm font-mono text-slate-600"
                                    />
                                    <button
                                        onClick={() => handleCopy(settings.webhook_secret || '', 'webhook')}
                                        disabled={!settings.webhook_secret}
                                        className="px-4 bg-white border border-l-0 border-slate-200 rounded-r-xl text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                    >
                                        {copiedKey === 'webhook' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5">Used to verify incoming requests from the website.</p>
                            </div>

                            {/* Pull API Key */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Inbound Pull API Key</label>
                                    <button
                                        onClick={() => setSettings({ ...settings, inbound_api_key: generateKey(40) })}
                                        className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Generate New
                                    </button>
                                </div>
                                <div className="flex">
                                    <input
                                        type="text"
                                        readOnly
                                        value={settings.inbound_api_key || ''}
                                        placeholder="Generate an API key first"
                                        className="flex-1 p-2.5 bg-white border border-slate-200 rounded-l-xl outline-none text-sm font-mono text-slate-600"
                                    />
                                    <button
                                        onClick={() => handleCopy(settings.inbound_api_key || '', 'inbound')}
                                        disabled={!settings.inbound_api_key}
                                        className="px-4 bg-white border border-l-0 border-slate-200 rounded-r-xl text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                    >
                                        {copiedKey === 'inbound' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5">Secret required by the website to allow PMS to pull data.</p>
                            </div>
                        </div>

                        <div className="p-4 bg-white rounded-lg border border-indigo-100 flex items-start gap-4">
                            <div className="flex-1">
                                <p className="text-sm text-slate-700 font-medium mb-1">Webhook URL Configuration</p>
                                <p className="text-xs text-slate-500 mb-3">Copy this URL and paste it into your Website's Gateway Configuration panel.</p>
                                <div className="flex">
                                    <code className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-l-lg text-xs font-mono text-slate-800 break-all">
                                        {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/website` : '...'}
                                    </code>
                                    <button
                                        onClick={() => handleCopy(`${window.location.origin}/api/webhooks/website`, 'url')}
                                        className="px-4 bg-slate-50 border border-l-0 border-slate-200 rounded-r-lg text-slate-500 hover:bg-slate-100 transition-colors"
                                    >
                                        {copiedKey === 'url' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sync Section */}
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 space-y-4 mt-4">
                        <div>
                            <p className="text-sm text-slate-700 font-semibold mb-1">📡 Pull Bookings from Website</p>
                            <p className="text-xs text-slate-500">Since your PMS runs locally, use this button to actively fetch pending bookings from your website's API.</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                disabled={syncing || !settings.inbound_api_key}
                                onClick={async () => {
                                    setSyncing(true);
                                    setSyncResult(null);
                                    try {
                                        // Auto-save settings first so the key is persisted
                                        await updateSettings(settings);
                                        const { syncBookingsFromWebsite } = await import('@/app/actions/sync-bookings');
                                        const result = await syncBookingsFromWebsite();
                                        setSyncResult(result);
                                    } catch (err: any) {
                                        setSyncResult({ success: false, message: err.message });
                                    } finally {
                                        setSyncing(false);
                                    }
                                }}
                                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm text-sm disabled:opacity-50"
                            >
                                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Sync Bookings Now
                            </button>
                            <button
                                disabled={syncing || !settings.inbound_api_key}
                                onClick={async () => {
                                    setSyncing(true);
                                    setSyncResult(null);
                                    try {
                                        await updateSettings(settings);
                                        const { triggerWebsiteSync } = await import('@/app/actions/sync-bookings');
                                        const result = await triggerWebsiteSync();
                                        setSyncResult(result);
                                    } catch (err: any) {
                                        setSyncResult({ success: false, message: err.message });
                                    } finally {
                                        setSyncing(false);
                                    }
                                }}
                                className="px-5 py-2.5 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm text-sm disabled:opacity-50"
                            >
                                Trigger Website Re-push
                            </button>
                        </div>

                        {!settings.inbound_api_key && (
                            <p className="text-xs text-amber-600 font-medium">⚠️ Generate an Inbound API Key above and save before syncing.</p>
                        )}

                        {syncResult && (
                            <div className={`p-3 rounded-lg text-sm border ${syncResult.success
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-red-50 border-red-200 text-red-800'
                                }`}>
                                <p className="font-medium">{syncResult.success ? '✅' : '❌'} {syncResult.message}</p>
                                {syncResult.errors && syncResult.errors.length > 0 && (
                                    <ul className="mt-2 space-y-1 text-xs">
                                        {syncResult.errors.map((err: string, i: number) => (
                                            <li key={i}>• {err}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </BentoCard>

                {/* Mailing System Tester */}
                <BentoCard className="p-6 md:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                        </div>
                        <h2 className="font-bold text-slate-800">Test Mailing System</h2>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-slate-500">
                            Send a test email to verify your SMTP configuration and visually inspect the HTML templates and PDF attachments. The system will use the most recent booking data to generate the test preview.
                        </p>

                        <div className="max-w-md">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Target Test Email</label>
                            <input
                                id="test-email-input"
                                type="email"
                                defaultValue="mediageny821@gmail.com"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm mb-4"
                            />
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={async () => {
                                    const email = (document.getElementById('test-email-input') as HTMLInputElement).value;
                                    if (!email) return alert('Please enter an email address');

                                    const { testSendBookingConfirmation } = await import('@/app/actions/mail');
                                    const { toast } = await import('sonner');

                                    toast.promise(
                                        testSendBookingConfirmation(email).then((res) => {
                                            if (!res.success) throw new Error(res.message);
                                            return res;
                                        }),
                                        {
                                            loading: 'Sending Test Check-in Email...',
                                            success: 'Test Check-in template sent successfully! Verify your inbox.',
                                            error: (err) => `Failed to send: ${err.message}`
                                        }
                                    );
                                }}
                                className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors shadow-sm text-sm"
                            >
                                Test Check-in Email (Provisional PDF)
                            </button>

                            <button
                                onClick={async () => {
                                    const email = (document.getElementById('test-email-input') as HTMLInputElement).value;
                                    if (!email) return alert('Please enter an email address');

                                    const { testSendCheckoutMail } = await import('@/app/actions/mail');
                                    const { toast } = await import('sonner');

                                    toast.promise(
                                        testSendCheckoutMail(email).then((res) => {
                                            if (!res.success) throw new Error(res.message);
                                            return res;
                                        }),
                                        {
                                            loading: 'Sending Test Checkout Email...',
                                            success: 'Test Checkout template sent successfully! Verify your inbox.',
                                            error: (err) => `Failed to send: ${err.message}`
                                        }
                                    );
                                }}
                                className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 transition-colors shadow-sm text-sm"
                            >
                                Test Check-out Email (Final Tax PDF)
                            </button>
                        </div>
                    </div>
                </BentoCard>

                {/* WhatsApp Integration */}
                <BentoCard className="p-6 md:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-100 rounded-lg text-green-600">
                            <MessageCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h2 className="font-bold text-slate-800">WhatsApp Automation</h2>
                            <p className="text-sm text-slate-500">Send automated WhatsApp messages with invoices on booking & checkout.</p>
                        </div>
                        <button
                            onClick={() => setSettings({ ...settings, whatsapp_enabled: !settings.whatsapp_enabled })}
                            className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${settings.whatsapp_enabled ? 'bg-green-500' : 'bg-slate-300'
                                }`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${settings.whatsapp_enabled ? 'translate-x-7' : 'translate-x-0'
                                }`} />
                        </button>
                    </div>

                    {settings.whatsapp_enabled ? (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <p className="text-sm text-green-800 font-medium">
                                    WhatsApp automation is <span className="font-bold">active</span>. Messages will be sent alongside emails automatically.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Booking Template</label>
                                    <input
                                        type="text"
                                        value={settings.whatsapp_booking_template || ''}
                                        onChange={e => setSettings({ ...settings, whatsapp_booking_template: e.target.value })}
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm font-mono"
                                    />
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Checkout Template</label>
                                    <input
                                        type="text"
                                        value={settings.whatsapp_checkout_template || ''}
                                        onChange={e => setSettings({ ...settings, whatsapp_checkout_template: e.target.value })}
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm font-mono"
                                    />
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Restaurant Template</label>
                                    <input
                                        type="text"
                                        value={settings.whatsapp_restaurant_template || ''}
                                        onChange={e => setSettings({ ...settings, whatsapp_restaurant_template: e.target.value })}
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm font-mono"
                                    />
                                </div>
                            </div>


                            <div className="bg-green-50/60 border border-green-100 rounded-xl p-5">
                                <p className="text-sm text-slate-700 font-semibold mb-3">🧪 Test WhatsApp Delivery</p>
                                <div className="flex gap-3 items-end mb-5">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Phone Number (with country code)</label>
                                        <input
                                            id="test-wa-phone"
                                            type="text"
                                            placeholder="919876543210"
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                        />
                                    </div>
                                    <button
                                        disabled={sendingWa}
                                        onClick={async () => {
                                            const phone = (document.getElementById('test-wa-phone') as HTMLInputElement).value;
                                            if (!phone) return alert('Please enter a phone number');
                                            setSendingWa(true);
                                            setWaResult(null);
                                            try {
                                                await updateSettings(settings);
                                                const { testSendWhatsApp } = await import('@/app/actions/whatsapp');
                                                const result = await testSendWhatsApp(phone);
                                                setWaResult(result);
                                            } catch (err: any) {
                                                setWaResult({ success: false, error: err.message });
                                            } finally {
                                                setSendingWa(false);
                                            }
                                        }}
                                        className="px-5 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm text-sm disabled:opacity-50 whitespace-nowrap"
                                    >
                                        {sendingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                                        Send Test
                                    </button>
                                </div>

                                <div className="p-4 bg-white rounded-lg border border-green-100 space-y-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 mb-1">Meta Webhook URL</p>
                                        <p className="text-[10px] text-slate-500 mb-2">Copy this into "Callback URL" in Meta App Settings → WhatsApp → Configuration.</p>
                                        <div className="flex">
                                            <code className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-l-lg text-xs font-mono text-slate-800 break-all">
                                                {typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : '...'}
                                            </code>
                                            <button
                                                onClick={() => handleCopy(`${window.location.origin}/api/whatsapp/webhook`, 'wa-url')}
                                                className="px-4 bg-slate-50 border border-l-0 border-slate-200 rounded-r-lg text-slate-500 hover:bg-slate-100 transition-colors"
                                            >
                                                {copiedKey === 'wa-url' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 mb-1">Verify Token</p>
                                        <p className="text-[10px] text-slate-500 mb-2">Copy this into "Verify Token" field in Meta App Settings.</p>
                                        <div className="flex">
                                            <code className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-l-lg text-xs font-mono text-slate-800">
                                                geny_pms_wa_verify_2026
                                            </code>
                                            <button
                                                onClick={() => handleCopy('geny_pms_wa_verify_2026', 'wa-token')}
                                                className="px-4 bg-slate-50 border border-l-0 border-slate-200 rounded-r-lg text-slate-500 hover:bg-slate-100 transition-colors"
                                            >
                                                {copiedKey === 'wa-token' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {waResult && (
                                <div className={`mt-3 p-3 rounded-lg text-sm border ${waResult.success
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-red-50 border-red-200 text-red-800'
                                    }`}>
                                    <p className="font-medium">{waResult.success ? '✅ Message sent successfully!' : `❌ ${waResult.error || waResult.message || 'Failed to send'}`}</p>
                                    {waResult.messageId && <p className="text-xs mt-1 font-mono">ID: {waResult.messageId}</p>}
                                </div>
                            )}

                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <p className="text-sm text-amber-800">
                                    <span className="font-bold">⚠️ Note:</span> WhatsApp credentials (Phone Number ID, Access Token) are configured in your <code className="bg-amber-100 px-1 rounded">.env.local</code> file. Template names must match those approved in Meta Business Manager.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <p className="text-sm text-slate-500">WhatsApp automation is <span className="font-semibold text-slate-700">disabled</span>. Toggle the switch above to enable automated WhatsApp messages with invoice attachments on booking confirmation and checkout.</p>
                        </div>
                    )}
                </BentoCard>

            </div >
        </div >
    );
}
