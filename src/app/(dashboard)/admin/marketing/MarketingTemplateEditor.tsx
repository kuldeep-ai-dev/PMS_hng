'use client';

import {
    createWhatsAppTemplate,
    uploadMediaToMeta
} from '@/app/actions/whatsapp-templates';
import { useState, useEffect } from 'react';
import {
    XCircle,
    Save,
    Plus,
    Trash2,
    Type,
    FileText,
    Layout,
    ExternalLink,
    AlertCircle,
    MessageSquare,
    RefreshCw,
    Info,
    Image as ImageIcon,
    Video,
    File as FileIcon,
    UploadCloud,
    Sparkles,
    Megaphone,
    ShieldCheck,
    Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketingTemplateEditorProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function MarketingTemplateEditor({ onClose, onSuccess }: MarketingTemplateEditorProps) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State (Locked to MARKETING)
    const [name, setName] = useState(`promo_${new Date().toLocaleDateString('en-GB').replace(/\//g, '_')}_${Math.floor(Math.random() * 1000)}`);
    const [language, setLanguage] = useState('en_US');

    const [headerType, setHeaderType] = useState('NONE');
    const [headerText, setHeaderText] = useState('');
    const [bodyText, setBodyText] = useState('');
    const [footerText, setFooterText] = useState('');
    const [buttons, setButtons] = useState<any[]>([]);

    // Samples for variables
    const [bodySamples, setBodySamples] = useState<string[]>([]);
    const [headerSamples, setHeaderSamples] = useState<string[]>([]);
    const [mediaSampleURL, setMediaSampleURL] = useState('');

    // Detect variables in body
    useEffect(() => {
        const matches = bodyText.match(/{{(\d+)}}/g);
        if (matches) {
            const count = Math.max(...matches.map((m: any) => parseInt(m.replace(/{{|}}/g, ''))));
            setBodySamples(prev => {
                const newSamples = [...prev];
                while (newSamples.length < count) newSamples.push('');
                return newSamples.slice(0, count);
            });
        } else {
            setBodySamples([]);
        }
    }, [bodyText]);

    // Detect variables in header
    useEffect(() => {
        const matches = headerText.match(/{{(\d+)}}/g);
        if (matches) {
            const count = Math.max(...matches.map((m: any) => parseInt(m.replace(/{{|}}/g, ''))));
            setHeaderSamples(prev => {
                const newSamples = [...prev];
                while (newSamples.length < count) newSamples.push('');
                return newSamples.slice(0, count);
            });
        } else {
            setHeaderSamples([]);
        }
    }, [headerText]);

    const handleAddButton = () => {
        if (buttons.length >= 3) return;
        setButtons([...buttons, { type: 'QUICK_REPLY', text: '' }]);
    };

    const handleAddOptOut = () => {
        if (buttons.length >= 3) return;
        setButtons([...buttons, { type: 'QUICK_REPLY', text: 'Stop Promotions' }]);
    };

    const handleButtonChange = (index: number, field: string, value: string) => {
        const newButtons = [...buttons];
        newButtons[index][field] = value;

        // Clear conflicting fields if type changes
        if (field === 'type') {
            if (value === 'QUICK_REPLY') {
                delete newButtons[index].url;
                delete newButtons[index].phone_number;
            } else if (value === 'URL') {
                newButtons[index].url = '';
                delete newButtons[index].phone_number;
            } else if (value === 'PHONE_NUMBER') {
                newButtons[index].phone_number = '';
                delete newButtons[index].url;
            }
        }
        setButtons(newButtons);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Basic Validation
            if (!name) throw new Error("Template name is required");
            if (!bodyText) throw new Error("Message body is required");

            for (const btn of buttons) {
                if (!btn.text) throw new Error("All buttons must have a label");
                if (btn.type === 'URL' && !btn.url) throw new Error("URL button is missing its link");
                if (btn.type === 'PHONE_NUMBER' && !btn.phone_number) throw new Error("Phone button is missing its number");
            }
            let finalMediaHandle = '';
            if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && mediaSampleURL) {
                setUploading(true);
                const uploadResult = await uploadMediaToMeta(mediaSampleURL, headerType);
                setUploading(false);
                if (!uploadResult.success) throw new Error(uploadResult.error);
                finalMediaHandle = uploadResult.handle;
            }

            console.log('[MarketingDesigner] Formatting components...');
            const components: any[] = [];
            if (headerType !== 'NONE') {
                const headerComp: any = { type: 'HEADER', format: headerType };
                if (headerType === 'TEXT') {
                    headerComp.text = headerText;
                    if (headerSamples.length > 0) headerComp.example = { header_text: [headerSamples[0]] };
                } else if (finalMediaHandle) {
                    headerComp.example = { header_handle: [finalMediaHandle] };
                }
                components.push(headerComp);
            }

            const bodyComp: any = { type: 'BODY', text: bodyText };
            if (bodySamples.length > 0) bodyComp.example = { body_text: [bodySamples] };
            components.push(bodyComp);

            if (footerText) components.push({ type: 'FOOTER', text: footerText });

            if (buttons.length > 0) {
                const formattedButtons = buttons.map(btn => {
                    const formatted: any = { type: btn.type, text: btn.text };
                    if (btn.type === 'URL') formatted.url = btn.url;
                    if (btn.type === 'PHONE_NUMBER') formatted.phone_number = btn.phone_number;
                    return formatted;
                });
                components.push({ type: 'BUTTONS', buttons: formattedButtons });
            }

            const result = await createWhatsAppTemplate({
                name: name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                category: 'MARKETING', // Forced
                language,
                components
            });

            if (result.success) {
                onSuccess();
            } else {
                console.error('[MarketingDesigner] API Error:', result);
                setError(result.error);
            }
        } catch (err: any) {
            console.error('[MarketingDesigner] Submission Failed:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row h-[90vh]">

                {/* Editor Section */}
                <div className="flex-1 flex flex-col min-w-0 border-r border-slate-100 overflow-hidden">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
                                <Megaphone className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Marketing Template Designer</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Design high-conversion bulk outreach</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                            <XCircle className="w-8 h-8" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                                <Layout className="w-4 h-4" />
                                <span>Campaign Identity</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center justify-between">
                                        Internal Name
                                        <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">Required</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
                                        placeholder="e.g. summer_flash_sale_2024"
                                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl outline-none transition-all font-bold placeholder:text-slate-300"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Communication Language</label>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl outline-none transition-all font-bold cursor-pointer"
                                    >
                                        <option value="en_US">English (US)</option>
                                        <option value="en_GB">English (UK)</option>
                                        <option value="hi">Hindi</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                                <Sparkles className="w-4 h-4" />
                                <span>Dynamic Content</span>
                            </div>

                            {/* Header Media */}
                            <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-6">
                                <div className="grid grid-cols-4 gap-4">
                                    {['NONE', 'TEXT', 'IMAGE', 'VIDEO'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setHeaderType(type)}
                                            className={cn(
                                                "p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border-2",
                                                headerType === type
                                                    ? "bg-white border-blue-600 shadow-xl shadow-blue-100"
                                                    : "bg-white border-slate-100 hover:border-slate-200 text-slate-400"
                                            )}
                                        >
                                            {type === 'NONE' && <XCircle className="w-5 h-5" />}
                                            {type === 'TEXT' && <Type className="w-5 h-5" />}
                                            {type === 'IMAGE' && <ImageIcon className="w-5 h-5" />}
                                            {type === 'VIDEO' && <Video className="w-5 h-5" />}
                                            <span className="text-[10px] font-black uppercase tracking-widest">{type}</span>
                                        </button>
                                    ))}
                                </div>

                                {headerType === 'TEXT' && (
                                    <input
                                        type="text"
                                        value={headerText}
                                        onChange={(e) => setHeaderText(e.target.value)}
                                        placeholder="Add a catchy header..."
                                        className="w-full px-6 py-4 bg-white border-2 border-slate-100 focus:border-blue-500 rounded-2xl outline-none transition-all font-bold"
                                    />
                                )}

                                {['IMAGE', 'VIDEO'].includes(headerType) && (
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <UploadCloud className="w-3 h-3" /> Sample Media URL
                                        </label>
                                        <input
                                            type="text"
                                            value={mediaSampleURL}
                                            onChange={(e) => setMediaSampleURL(e.target.value)}
                                            placeholder="Paste image/video link for Meta review..."
                                            className="w-full px-6 py-4 bg-white border-2 border-slate-100 focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-xs"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Body Message */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center justify-between">
                                    Message Body
                                    <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">Required</span>
                                </label>
                                <textarea
                                    value={bodyText}
                                    onChange={(e) => setBodyText(e.target.value)}
                                    placeholder="Hello {{1}}! Unlock 20% OFF on your next stay..."
                                    rows={6}
                                    className="w-full px-8 py-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[2rem] outline-none transition-all font-bold placeholder:text-slate-300 resize-none leading-relaxed"
                                />
                                <div className="flex justify-between items-center px-4">
                                    <p className="text-[10px] font-bold text-slate-400 italic">Use {"{{1}}"}, {"{{2}}"} etc for dynamic name injection.</p>
                                    <span className="text-xs font-black text-slate-400">{bodyText.length}/1024</span>
                                </div>

                                {/* Body Variable Samples */}
                                {bodySamples.length > 0 && (
                                    <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 space-y-4 shadow-inner">
                                        <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Info className="w-4 h-4" /> Map Variable Samples ({bodySamples.length})
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {bodySamples.map((sample, idx) => (
                                                <div key={idx} className="space-y-1">
                                                    <label className="text-[10px] font-black text-blue-600 uppercase ml-2">Variable {"{{"}{idx + 1}{"}}"}</label>
                                                    <input
                                                        type="text"
                                                        value={sample}
                                                        onChange={(e) => {
                                                            const newSamples = [...bodySamples];
                                                            newSamples[idx] = e.target.value;
                                                            setBodySamples(newSamples);
                                                        }}
                                                        placeholder={`e.g. John`}
                                                        className="w-full px-5 py-3 text-xs bg-white border-2 border-blue-200 rounded-2xl outline-none focus:border-blue-400 font-bold"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    <Layout className="w-4 h-4" />
                                    <span>Call to Actions (Max 3)</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddOptOut}
                                        disabled={buttons.length >= 3}
                                        className="px-4 py-2 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 disabled:bg-slate-50 transition-all border border-slate-200"
                                    >
                                        + Opt-Out
                                    </button>
                                    <button
                                        onClick={handleAddButton}
                                        disabled={buttons.length >= 3}
                                        className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 disabled:bg-slate-200 transition-all shadow-lg shadow-blue-200"
                                    >
                                        + Add Button
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {buttons.map((btn, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-3xl border-2 border-slate-100 space-y-4 animate-in slide-in-from-right-4">
                                        <div className="flex gap-4 items-center">
                                            <div className="flex-1 grid grid-cols-2 gap-4">
                                                <select
                                                    value={btn.type}
                                                    onChange={(e) => handleButtonChange(idx, 'type', e.target.value)}
                                                    className="px-4 py-3 bg-slate-50 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                                                >
                                                    <option value="QUICK_REPLY">Quick Reply</option>
                                                    <option value="URL">Visit Website (CTA)</option>
                                                    <option value="PHONE_NUMBER">Call Number (CTA)</option>
                                                </select>
                                                <input
                                                    type="text"
                                                    value={btn.text}
                                                    onChange={(e) => handleButtonChange(idx, 'text', e.target.value)}
                                                    placeholder="Button Label (e.g. Subscribe)"
                                                    className="px-4 py-3 bg-slate-50 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                                                />
                                            </div>
                                            <button onClick={() => setButtons(buttons.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {btn.type === 'URL' && (
                                            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50/50 rounded-2xl border border-blue-100 animate-in fade-in zoom-in-95 duration-200">
                                                <ExternalLink className="w-4 h-4 text-blue-500" />
                                                <input
                                                    type="text"
                                                    value={btn.url || ''}
                                                    onChange={(e) => handleButtonChange(idx, 'url', e.target.value)}
                                                    placeholder="https://your-hotel.com/promo"
                                                    className="flex-1 bg-transparent outline-none text-xs font-bold text-blue-700 placeholder:text-blue-300"
                                                />
                                            </div>
                                        )}

                                        {btn.type === 'PHONE_NUMBER' && (
                                            <div className="flex items-center gap-3 px-4 py-3 bg-green-50/50 rounded-2xl border border-green-100 animate-in fade-in zoom-in-95 duration-200">
                                                <Phone className="w-4 h-4 text-green-500" />
                                                <input
                                                    type="text"
                                                    value={btn.phone_number || ''}
                                                    onChange={(e) => handleButtonChange(idx, 'phone_number', e.target.value)}
                                                    placeholder="+1234567890 (Include + and code)"
                                                    className="flex-1 bg-transparent outline-none text-xs font-bold text-green-700 placeholder:text-green-300"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className="p-8 border-t border-slate-100 bg-white space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold animate-in slide-in-from-bottom-2">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}
                        <div className="flex gap-4">
                            <button onClick={onClose} className="flex-1 py-5 rounded-3xl font-black uppercase tracking-widest text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all">
                                Discard
                            </button>
                            <button
                                onClick={() => handleSubmit()}
                                disabled={loading || uploading}
                                className="flex-[2] py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-3"
                            >
                                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {loading ? 'Submitting to Meta...' : 'Submit for Marketing Approval'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="hidden lg:flex w-[420px] bg-slate-50 flex-col gap-6 p-10 overflow-y-auto items-center">
                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-full">
                        <MessageSquare className="w-4 h-4" />
                        <span>Live Preview</span>
                    </div>

                    <div className="w-[320px] bg-[#e5ddd5] rounded-[3rem] shadow-2xl border-8 border-slate-900 overflow-hidden relative aspect-[9/18]">
                        {/* Header Bar */}
                        <div className="bg-[#075e54] p-5 text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <Megaphone className="w-5 h-5 text-white/80" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black leading-none">Property Hub</p>
                                <p className="text-[10px] text-white/60 font-bold mt-1 uppercase tracking-widest">Blast Service</p>
                            </div>
                        </div>

                        {/* Chat Body */}
                        <div className="p-5 flex flex-col gap-4 relative h-[calc(100%-80px)]">
                            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://whatsapp.com/img/bg-chat-tile-light.png')] bg-repeat" />

                            <div className="z-10 bg-white p-4 rounded-3xl rounded-tl-none shadow-xl text-[13px] self-start w-full max-w-[280px]">
                                <div className="space-y-3">
                                    {headerType !== 'NONE' && (
                                        <div className="bg-slate-50 rounded-2xl overflow-hidden min-h-[120px] flex items-center justify-center border border-slate-100">
                                            {headerType === 'TEXT' ? (
                                                <p className="font-black text-slate-900 px-4 text-center">
                                                    {headerText.replace(/{{(\d+)}}/g, (m, p) => headerSamples[parseInt(p) - 1] || m) || 'Header Text'}
                                                </p>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-slate-300">
                                                    {headerType === 'IMAGE' && <ImageIcon className="w-12 h-12" />}
                                                    {headerType === 'VIDEO' && <Video className="w-12 h-12" />}
                                                    <span className="text-[8px] font-black uppercase tracking-widest">Media Preview</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-slate-800 font-bold leading-relaxed">
                                        {bodyText
                                            ? bodyText.replace(/{{(\d+)}}/g, (m, p) => bodySamples[parseInt(p) - 1] || m)
                                            : 'Start typing your marketing message to see it here...'}
                                    </p>
                                    {footerText && <p className="text-[10px] text-slate-400 font-medium pt-2 border-t border-slate-50">{footerText}</p>}
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="z-10 space-y-2 w-full max-w-[280px]">
                                {buttons.map((btn, idx) => (
                                    <div key={idx} className="group relative">
                                        <div className="bg-white/95 py-3 rounded-2xl shadow-lg text-blue-600 text-xs font-black text-center border-2 border-blue-50 group-hover:border-blue-200 transition-all">
                                            {btn.text || `Button ${idx + 1}`}
                                        </div>
                                        {(btn.url || btn.phone_number) && (
                                            <div className="absolute -right-2 -top-2 bg-slate-800 text-white text-[8px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                {btn.url || btn.phone_number}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm w-full mt-auto">
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldCheck className="w-5 h-5 text-green-500" />
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Meta Compliance</h4>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed mb-4">Marketing templates require approval from Meta (Facebook) which usually takes 1-5 minutes.</p>
                        <div className="flex flex-col gap-2">
                            <span className="text-[9px] font-black text-slate-400 border-l-2 border-slate-100 pl-3">No emojis in buttons</span>
                            <span className="text-[9px] font-black text-slate-400 border-l-2 border-slate-100 pl-3">Proper grammar required</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
