'use client';

import {
    createWhatsAppTemplate,
    editWhatsAppTemplate,
    deleteWhatsAppTemplate,
    getWhatsAppTemplates,
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
    CheckCircle2,
    MessageSquare,
    RefreshCw,
    Info,
    Image as ImageIcon,
    Video,
    File as FileIcon,
    MapPin,
    AlertTriangle,
    UploadCloud
} from 'lucide-react';

interface TemplateFormProps {
    template?: any;
    onClose: () => void;
    onSuccess: () => void;
}

export function TemplateForm({ template, onClose, onSuccess }: TemplateFormProps) {
    const isEditing = !!template;
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<any>(null);

    // Form State
    const [name, setName] = useState(template?.name || '');
    const [category, setCategory] = useState(template?.category || 'UTILITY');
    const [language, setLanguage] = useState(template?.language || 'en_US');

    const [headerType, setHeaderType] = useState(
        template?.components?.find((c: any) => c.type === 'HEADER')?.format || 'NONE'
    );
    const [headerText, setHeaderText] = useState(
        template?.components?.find((c: any) => c.type === 'HEADER')?.text || ''
    );

    const [bodyText, setBodyText] = useState(
        template?.components?.find((c: any) => c.type === 'BODY')?.text || ''
    );

    const [footerText, setFooterText] = useState(
        template?.components?.find((c: any) => c.type === 'FOOTER')?.text || ''
    );

    const [buttons, setButtons] = useState<any[]>(
        template?.components?.find((c: any) => c.type === 'BUTTONS')?.buttons || []
    );

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

    const handleRemoveButton = (index: number) => {
        setButtons(buttons.filter((_, i) => i !== index));
    };

    const handleButtonChange = (index: number, field: string, value: string) => {
        const newButtons = [...buttons];
        newButtons[index][field] = value;
        setButtons(newButtons);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        setError(null);
        setErrorDetails(null);

        // Validation: Emoji in buttons
        const hasEmojiInButton = buttons.some(btn =>
            /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(btn.text)
        );

        if (hasEmojiInButton) {
            setError("Meta API prohibits symbols or emojis in button labels. Please remove the emoji and try again.");
            return;
        }

        if (!name) {
            setError("Template Name is required.");
            const scrollContainer = document.getElementById('template-form-scroll');
            if (scrollContainer) scrollContainer.scrollTop = 0;
            return;
        }

        setLoading(true);

        try {
            let finalMediaHandle = '';

            // Automated Media Upload if it's a URL
            if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && mediaSampleURL) {
                if (mediaSampleURL.startsWith('http')) {
                    setUploading(true);
                    const uploadResult = await uploadMediaToMeta(mediaSampleURL, headerType);
                    setUploading(false);

                    if (!uploadResult.success) {
                        setError(`Media Upload Failed: ${uploadResult.error}`);
                        setLoading(false);
                        return;
                    }
                    finalMediaHandle = uploadResult.handle;
                } else {
                    finalMediaHandle = mediaSampleURL; // Assume it's already a handle
                }
            }

            const components: any[] = [];

            // Header
            if (headerType !== 'NONE') {
                const headerComp: any = { type: 'HEADER', format: headerType };
                if (headerType === 'TEXT') {
                    headerComp.text = headerText;
                    if (headerSamples.length > 0) {
                        headerComp.example = { header_text: [headerSamples[0]] };
                    }
                } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
                    if (finalMediaHandle) {
                        headerComp.example = { header_handle: [finalMediaHandle] };
                    }
                }
                components.push(headerComp);
            }

            // Body
            const bodyComp: any = { type: 'BODY', text: bodyText };
            if (bodySamples.length > 0) {
                bodyComp.example = { body_text: [bodySamples] };
            }
            components.push(bodyComp);

            // Footer
            if (footerText) {
                components.push({ type: 'FOOTER', text: footerText });
            }

            // Buttons
            if (buttons.length > 0) {
                components.push({ type: 'BUTTONS', buttons: buttons.map(b => ({ ...b })) });
            }

            const templateData = {
                name: name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                category,
                language,
                components
            };

            const result: any = isEditing
                ? await editWhatsAppTemplate(name, templateData)
                : await createWhatsAppTemplate(templateData);

            if (result.success) {
                alert("🎉 Template submitted successfully for review! It may take a moment to appear in the list.");
                onSuccess();
            } else {
                setError(result.error);
                setErrorDetails(result.details);
                const scrollContainer = document.getElementById('template-form-scroll');
                if (scrollContainer) scrollContainer.scrollTop = 0;
            }
        } catch (err: any) {
            setError(err.message);
            const scrollContainer = document.getElementById('template-form-scroll');
            if (scrollContainer) scrollContainer.scrollTop = 0;
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    const getHeaderIcon = (type: string) => {
        switch (type) {
            case 'TEXT': return <Type className="w-4 h-4" />;
            case 'IMAGE': return <ImageIcon className="w-4 h-4" />;
            case 'VIDEO': return <Video className="w-4 h-4" />;
            case 'DOCUMENT': return <FileIcon className="w-4 h-4" />;
            case 'LOCATION': return <MapPin className="w-4 h-4" />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">

                {/* Editor Side */}
                <div className="flex-1 flex flex-col min-w-0 border-r border-slate-100">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">
                                {isEditing ? 'Edit Template' : 'Create New Template'}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">Design your message structure and components</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                    </div>

                    <form
                        id="whatsapp-template-form"
                        onSubmit={handleSubmit}
                        className="flex-1 overflow-y-auto p-6 space-y-8"
                    >
                        <div id="template-form-scroll" />
                        {(error || errorDetails) && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-2 animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-3 text-red-600 text-sm font-bold">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span className="break-words">{error || 'Submission Error'}</span>
                                </div>
                                {errorDetails && (
                                    <div className="ml-7 p-2 bg-white/50 rounded border border-red-100 text-[10px] text-red-500 font-mono overflow-auto max-h-32">
                                        {JSON.stringify(errorDetails, null, 2)}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Basic Info */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <Layout className="w-3 h-3" />
                                <span>Basic Information</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 ml-1">Template Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. booking_confirmation"
                                        disabled={isEditing}
                                        className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all disabled:bg-slate-50 font-medium ${!name && error ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 ml-1">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all bg-white font-medium cursor-pointer"
                                    >
                                        <option value="UTILITY">Utility</option>
                                        <option value="MARKETING">Marketing</option>
                                        <option value="AUTHENTICATION">Authentication</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Header */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <Type className="w-3 h-3" />
                                <span>Header Selection</span>
                            </div>
                            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-5">
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'].map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setHeaderType(type)}
                                            className={`p-3 rounded-xl text-[10px] font-bold transition-all border flex flex-col items-center gap-2 ${headerType === type
                                                ? 'bg-green-600 text-white border-green-600 shadow-md ring-2 ring-green-100'
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-green-400 hover:text-green-600'
                                                }`}
                                        >
                                            <div className={headerType === type ? 'text-white' : 'text-slate-400'}>
                                                {getHeaderIcon(type) || <XCircle className="w-4 h-4" />}
                                            </div>
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                {headerType === 'TEXT' && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <input
                                            type="text"
                                            value={headerText}
                                            onChange={(e) => setHeaderText(e.target.value)}
                                            placeholder="Enter header text (optional)..."
                                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                        {headerSamples.length > 0 && (
                                            <div className="space-y-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                                <p className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                                                    <Info className="w-3 h-3" /> Header Variable Sample Required
                                                </p>
                                                <input
                                                    type="text"
                                                    value={headerSamples[0]}
                                                    onChange={(e) => setHeaderSamples([e.target.value])}
                                                    placeholder="Example for {{1}}"
                                                    className="w-full px-3 py-2 text-xs border border-amber-200 bg-white rounded-lg outline-none"
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-3 shadow-inner">
                                            <p className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                                                <Info className="w-3 h-3" /> Media Sample URL <span className="text-red-500">*</span>
                                            </p>
                                            <p className="text-[10px] text-amber-700/70">Paste a direct link to your file. We will automatically upload it to Meta for you.</p>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={mediaSampleURL}
                                                    onChange={(e) => setMediaSampleURL(e.target.value)}
                                                    placeholder="https://example.com/invoice.pdf"
                                                    className="w-full px-3 py-2.5 pr-10 text-xs border border-amber-200 bg-white rounded-lg outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                                                />
                                                <UploadCloud className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Body */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <FileText className="w-3 h-3" />
                                <span>Message Body <span className="text-red-500">*</span></span>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <textarea
                                        value={bodyText}
                                        onChange={(e) => setBodyText(e.target.value)}
                                        placeholder="Hello {{1}}, thank you for your booking..."
                                        rows={5}
                                        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all resize-none font-sans leading-relaxed"
                                        required
                                    />
                                    <div className="flex justify-between items-center px-1">
                                        <p className="text-[10px] text-slate-400 italic">Use double curly braces like {"{{1}}"} for variables.</p>
                                        <span className="text-[10px] font-mono text-slate-400">{bodyText.length}/1024</span>
                                    </div>
                                </div>

                                {/* Body Variable Samples */}
                                {bodySamples.length > 0 && (
                                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-3 animate-in zoom-in-95 shadow-inner">
                                        <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                                            <Info className="w-3 h-3" />
                                            Action Required: Variable Samples ({bodySamples.length})
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {bodySamples.map((sample, idx) => (
                                                <div key={idx} className="space-y-1">
                                                    <label className="text-[10px] font-bold text-amber-800 ml-1">Variable {"{{"}{idx + 1}{"}}"}</label>
                                                    <input
                                                        type="text"
                                                        value={sample}
                                                        onChange={(e) => {
                                                            const newSamples = [...bodySamples];
                                                            newSamples[idx] = e.target.value;
                                                            setBodySamples(newSamples);
                                                        }}
                                                        placeholder={`Example for {{${idx + 1}}}`}
                                                        className="w-full px-3 py-2 text-xs border border-amber-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-amber-400 font-medium"
                                                        required
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Buttons section */}
                        <section className="space-y-4 pb-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    <Layout className="w-3 h-3" />
                                    <span>Interactive Buttons (Max 3)</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddButton}
                                    disabled={buttons.length >= 3}
                                    className="text-xs font-bold text-green-600 hover:text-green-700 disabled:text-slate-300 flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full transition-all"
                                >
                                    <Plus className="w-3 h-3" />
                                    Add Button
                                </button>
                            </div>

                            <div className="space-y-3">
                                {buttons.map((btn, idx) => (
                                    <div key={idx} className="flex gap-2 items-start bg-white p-4 rounded-2xl border border-slate-100 group animate-in slide-in-from-right-4 shadow-sm">
                                        <div className="flex-1 grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Type</label>
                                                <select
                                                    value={btn.type}
                                                    onChange={(e) => handleButtonChange(idx, 'type', e.target.value)}
                                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white cursor-pointer font-medium"
                                                >
                                                    <option value="QUICK_REPLY">Quick Reply</option>
                                                    <option value="URL">Call to Action (Link)</option>
                                                    <option value="PHONE_NUMBER">Call to Action (Phone)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Label Text</label>
                                                <input
                                                    type="text"
                                                    value={btn.text}
                                                    onChange={(e) => handleButtonChange(idx, 'text', e.target.value)}
                                                    placeholder="e.g. Call Center"
                                                    className={`w-full px-3 py-2 text-xs border rounded-xl bg-white font-medium ${/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(btn.text) ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}`}
                                                />
                                                {/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(btn.text) && (
                                                    <p className="text-[9px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                                                        <AlertTriangle className="w-2.5 h-2.5" />
                                                        Meta Prohibits Emojis in Buttons!
                                                    </p>
                                                )}
                                            </div>
                                            {btn.type === 'URL' && (
                                                <div className="col-span-2 space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Destination URL</label>
                                                    <input
                                                        type="text"
                                                        value={btn.url || ''}
                                                        onChange={(e) => handleButtonChange(idx, 'url', e.target.value)}
                                                        placeholder="https://yourhotel.com/booking"
                                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveButton(idx)}
                                            className="p-1.5 text-slate-300 hover:text-red-500 mt-6"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </form>

                    <div className="p-6 border-t border-slate-100 bg-white flex gap-3 sticky bottom-0 z-10 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all border border-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="whatsapp-template-form"
                            onClick={() => handleSubmit()}
                            disabled={loading || uploading}
                            className={`flex-[2] py-3 text-sm font-bold text-white rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 ${loading || uploading ? 'bg-slate-300' : 'bg-green-600 hover:bg-green-700 shadow-green-100'}`}
                        >
                            {uploading ? (
                                <>
                                    <UploadCloud className="w-4 h-4 animate-bounce" />
                                    Uploading Media...
                                </>
                            ) : loading ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Submitting Template...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {isEditing ? 'Save Changes' : 'Submit for Review'}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Preview Side */}
                <div className="hidden lg:flex w-[400px] bg-slate-50 flex-col gap-6 p-8 overflow-y-auto">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <ExternalLink className="w-3 h-3" />
                        <span>Live Chat Preview</span>
                    </div>

                    <div className="max-w-[320px] mx-auto bg-[#e5ddd5] rounded-3xl shadow-xl border border-slate-300 overflow-hidden mt-4 relative">
                        <div className="bg-[#075e54] p-4 text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <MessageSquare className="w-5 h-5 text-white/80" />
                            </div>
                            <div>
                                <span className="text-sm font-bold block leading-tight">Property Support</span>
                                <span className="text-[10px] text-white/60">Professional Account</span>
                            </div>
                        </div>

                        <div className="p-4 min-h-[450px] flex flex-col gap-3 relative">
                            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://whatsapp.com/img/bg-chat-tile-light.png')] bg-repeat" />

                            <div className="z-10 bg-white p-3 rounded-2xl rounded-tl-none shadow-md text-[13px] relative animate-in zoom-in-95 self-start mr-8">
                                <div className="flex flex-col gap-2">
                                    {headerType !== 'NONE' && (
                                        <>
                                            {headerType === 'TEXT' ? (
                                                <div className="font-extrabold text-slate-900 text-sm mb-1 leading-tight tracking-tight">
                                                    {headerText.replace(/{{(\d+)}}/g, (match: any, p1: any) => headerSamples[parseInt(p1) - 1] || match) || 'Header Text'}
                                                </div>
                                            ) : (
                                                <div className="bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center aspect-[16/9] mb-2 relative border border-slate-100">
                                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                                        {headerType === 'IMAGE' && <ImageIcon className="w-10 h-10" />}
                                                        {headerType === 'VIDEO' && <Video className="w-10 h-10" />}
                                                        {headerType === 'DOCUMENT' && <FileIcon className="w-10 h-10" />}
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">{headerType} PREVIEW</span>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <p className="text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                                        {bodyText
                                            ? bodyText.replace(/{{(\d+)}}/g, (match: any, p1: any) => bodySamples[parseInt(p1) - 1] || match)
                                            : 'Your message body will appear here. Use variables to personalize.'
                                        }
                                    </p>
                                    {footerText && (
                                        <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-50 pt-2 leading-tight">
                                            {footerText}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center justify-end gap-1 mt-1.5 opacity-50">
                                    <span className="text-[9px] font-medium mr-1 uppercase">12:00</span>
                                    <svg viewBox="0 0 16 11" width="12" height="8" className="text-blue-500 fill-current"><path d="M11.053 1.514L5.342 7.225 3.033 4.916 2.063 5.88l3.279 3.279 6.674-6.674zM15.053 1.514L9.342 7.225 7.151 5.034l-.964.964 3.155 3.155 6.674-6.674z" /></svg>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="z-10 flex flex-col gap-1.5 mt-1 animate-in slide-in-from-bottom-2 self-start w-[240px]">
                                {buttons.map((btn, idx) => (
                                    <div key={idx} className="bg-white/95 py-2.5 px-4 rounded-xl shadow-sm text-blue-600 text-[12px] font-bold text-center border border-blue-50/50 flex items-center justify-center gap-2">
                                        {btn.type === 'URL' && <ExternalLink className="w-3.5 h-3.5" />}
                                        {btn.type === 'PHONE_NUMBER' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                        {btn.text || `Button ${idx + 1}`}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mt-4">
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Info className="w-4 h-4 text-green-500" />
                            Guide
                        </h4>
                        <ul className="text-xs text-slate-500 space-y-3 font-medium">
                            <li className="flex gap-2 text-balance leading-relaxed">
                                <span className="text-green-500">•</span>
                                Template names must be lowercase with no spaces.
                            </li>
                            <li className="flex gap-2 text-balance leading-relaxed">
                                <span className="text-green-500">•</span>
                                Button labels CANNOT contain emojis or symbols.
                            </li>
                            <li className="flex gap-2 text-balance leading-relaxed">
                                <span className="text-green-500">•</span>
                                **NEW**: URLs for media samples are now automatically uploaded.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
