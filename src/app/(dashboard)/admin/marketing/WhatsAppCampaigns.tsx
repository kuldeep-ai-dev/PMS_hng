'use client';

import { useState, useEffect } from 'react';
import {
    MessageSquare,
    Users,
    Send,
    Image as ImageIcon,
    Loader2,
    CheckCircle2,
    Search,
    RefreshCw,
    Download,
    Trash2,
    Clock,
    Layout,
    Type,
    FileText,
    File as FileIcon,
    Video,
    Sparkles,
    ChevronDown,
    UserCircle,
    Phone,
    Plus,
    X,
    TrendingUp,
    Check,
    Hotel,
    Utensils
} from 'lucide-react';
import { BentoCard } from '@/components/ui/BentoCard';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { getWhatsAppTemplates } from '@/app/actions/whatsapp-templates';
import { sendMarketingCampaignAction, sendTestCampaignAction } from '@/app/actions/marketing-actions';
import { getWhatsAppAccountInfo } from '@/app/actions/whatsapp';
import { ShieldCheck, ShieldAlert, Zap, Megaphone } from 'lucide-react';
import dynamic from "next/dynamic"; const MarketingTemplateEditor = dynamic(() => import("./MarketingTemplateEditor").then(mod => mod.MarketingTemplateEditor), { ssr: false, loading: () => <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/10 backdrop-blur-sm">Loading...</div> });

interface WhatsAppCampaignsProps {
    hotelBranding: {
        name: string;
        logo: string;
    }
}

export function WhatsAppCampaigns({ hotelBranding }: WhatsAppCampaignsProps) {
    const supabase = createClient();

    // Core Campaign State
    const [audienceType, setAudienceType] = useState<'hotel_guests' | 'restaurant_customers' | 'marketing_leads'>('hotel_guests');
    const [campaignName, setCampaignName] = useState('');
    const [isLaunching, setIsLaunching] = useState(false);

    // Template State
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

    // Dynamic Form State
    const [variableMappings, setVariableMappings] = useState<{ index: number, value: string, mappingType: 'STATIC' | 'PREDEFINED', component: 'HEADER' | 'BODY' }[]>([]);
    const [headerMedia, setHeaderMedia] = useState<{ type: string, url: string, handle?: string }>({ type: 'NONE', url: '' });
    const [buttonUrlSuffix, setButtonUrlSuffix] = useState('');
    const [hasDynamicButton, setHasDynamicButton] = useState(false);

    // Audience State
    const [searchQuery, setSearchQuery] = useState('');
    const [guests, setGuests] = useState<any[]>([]);
    const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
    const [isLoadingGuests, setIsLoadingGuests] = useState(false);

    // Tracking State
    const [recentStatuses, setRecentStatuses] = useState<any[]>([]);
    const [accountInfo, setAccountInfo] = useState<{ success: boolean; appStatus?: string; appName?: string; phoneNumberId?: string; error?: string; isTestNumber?: boolean } | null>(null);
    const [showTemplateDesigner, setShowTemplateDesigner] = useState(false);

    useEffect(() => {
        fetchTemplates();
        fetchAudience();
        checkAccount();
        fetchRecentStatuses();

        // Polling for statuses every 10 seconds
        const timer = setInterval(fetchRecentStatuses, 10000);
        return () => clearInterval(timer);
    }, [audienceType]);

    const fetchRecentStatuses = async () => {
        const { data } = await supabase
            .from('whatsapp_analytics')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        setRecentStatuses(data || []);
    };

    const checkAccount = async () => {
        const info = await getWhatsAppAccountInfo();
        setAccountInfo(info as any);
    };

    const fetchTemplates = async () => {
        setIsLoadingTemplates(true);
        const result = await getWhatsAppTemplates();
        if (result.success && result.data) {
            console.log('[WhatsApp Campaigns] Raw Templates from Meta:', result.data);
            // Only show approved marketing templates (Meta can return ACTIVE or APPROVED)
            const marketingTemplates = result.data.filter((t: any) =>
                (t.status === 'APPROVED' || t.status === 'ACTIVE') &&
                (t.category?.toUpperCase() === 'MARKETING' || t.category?.toUpperCase() === 'ADVERTISEMENT')
            );
            console.log('[WhatsApp Campaigns] Filtered Marketing Templates:', marketingTemplates);
            setTemplates(marketingTemplates);
        } else {
            console.error('[WhatsApp Campaigns] Failed to fetch templates:', result.error);
        }
        setIsLoadingTemplates(false);
    };

    const fetchAudience = async () => {
        setIsLoadingGuests(true);
        try {
            if (audienceType === 'marketing_leads') {
                const { data, error } = await supabase
                    .from('marketing_leads')
                    .select('id, full_name, phone_number, email')
                    .eq('status', 'active')
                    .limit(500);
                if (error) throw error;
                setGuests((data || []).map(d => ({ id: d.id, name: d.full_name, phone: d.phone_number, email: d.email })));
            } else if (audienceType === 'hotel_guests') {
                const { data, error } = await supabase
                    .from('guests')
                    .select('id, name, phone, email')
                    .limit(200);
                if (error) throw error;
                setGuests(data || []);
            } else {
                const { data, error } = await supabase
                    .from('restaurant_orders')
                    .select('id, customer_name, customer_mobile')
                    .not('customer_mobile', 'is', null)
                    .limit(200);
                if (error) throw error;
                // De-duplicate restaurant customers by phone
                const unique = Array.from(new Map(data.map(item => [item.customer_mobile, item])).values());
                setGuests(unique.map((u: any) => ({ id: u.id, name: u.customer_name, phone: u.customer_mobile })));
            }
        } catch (error: any) {
            console.error('Audience Fetch Error:', error);
            toast.error('Failed to fetch audience');
        } finally {
            setIsLoadingGuests(false);
        }
    };

    const handleSyncCRM = async () => {
        const confirm = window.confirm("Sync all guests from CRM to Marketing Leads? This will update your blast audience.");
        if (!confirm) return;

        toast.promise(
            (async () => {
                const { syncGuestContactsToLeads } = await import('@/app/actions/marketing-actions');
                const res = await syncGuestContactsToLeads();
                if (!res.success) throw new Error(res.message);
                await fetchAudience();
                return res;
            })(),
            {
                loading: 'Syncing CRM contacts...',
                success: (res) => `Successfully synced ${res.count} contacts!`,
                error: (err) => `Sync failed: ${err.message}`
            }
        );
    };

    const handleTemplateSelect = (template: any) => {
        setSelectedTemplate(template);

        // Find Body and Header variables
        const bodyComp = template.components.find((c: any) => c.type === 'BODY');
        const headerComp = template.components.find((c: any) => c.type === 'HEADER');
        const buttonComp = template.components.find((c: any) => c.type === 'BUTTONS');

        const bodyMatches = (bodyComp?.text || '').match(/{{(\d+)}}/g) || [];
        const headerMatches = (headerComp?.format === 'TEXT' ? (headerComp.text || '').match(/{{(\d+)}}/g) : []) || [];

        // Initialize mappings - separate by component (Meta indices are relative to component)
        const headerMappings = [...new Set(headerMatches)].map((m: any) => ({
            index: parseInt(m.toString().replace(/{{|}}/g, '')),
            value: '',
            mappingType: 'STATIC' as const,
            component: 'HEADER' as const
        }));

        const bodyMappings = [...new Set(bodyMatches)].map((m: any) => ({
            index: parseInt(m.toString().replace(/{{|}}/g, '')),
            value: '',
            mappingType: 'STATIC' as const,
            component: 'BODY' as const
        }));

        setVariableMappings([...headerMappings, ...bodyMappings]);

        // Button Check
        const dynamicButton = buttonComp?.buttons?.find((b: any) => b.type === 'URL' && b.url.includes('{{1}}'));
        setHasDynamicButton(!!dynamicButton);
        setButtonUrlSuffix('');

        // Header Media Check
        if (headerComp && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format)) {
            setHeaderMedia({ type: headerComp.format, url: '', handle: '' });
        } else {
            setHeaderMedia({ type: 'NONE', url: '', handle: '' });
        }
    };

    const toggleGuestSelection = (guestId: string) => {
        setSelectedGuests(prev =>
            prev.includes(guestId) ? prev.filter(id => id !== guestId) : [...prev, guestId]
        );
    };

    const selectAll = () => {
        if (selectedGuests.length === filteredGuests.length) {
            setSelectedGuests([]);
        } else {
            setSelectedGuests(filteredGuests.map(g => g.id));
        }
    };

    const filteredGuests = guests.filter(g =>
        g.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.phone?.includes(searchQuery)
    );

    const handleLaunch = async () => {
        if (selectedGuests.length === 0) return toast.error('Please select at least one recipient.');
        if (!selectedTemplate) return toast.error('Please select a template.');

        // CRITICAL: If template has a media header, a URL is REQUIRED
        // Without it, Meta accepts the call but silently drops the message
        if (headerMedia.type !== 'NONE' && !headerMedia.url?.trim() && !headerMedia.handle?.trim()) {
            toast.error(`⚠️ This template requires a ${headerMedia.type} file. Paste a public URL in the "Header Asset" field before sending.`);
            return;
        }

        setIsLaunching(true);
        try {
            const result = await sendMarketingCampaignAction({
                templateName: selectedTemplate.name,
                languageCode: selectedTemplate.language,
                audienceIds: selectedGuests,
                audienceType: audienceType,
                mappings: variableMappings,
                headerMedia: headerMedia.type !== 'NONE' ? headerMedia : undefined,
                buttonUrlSuffix: hasDynamicButton ? buttonUrlSuffix : undefined
            });

            if (result.success) {
                toast.success(`${(result as any).message}. ID: ${(result as any).messageId}`);
                setSelectedGuests([]);
            } else {
                toast.error(`${(result as any).message}. ${(result as any).error || ''}`);
            }
        } catch (err: any) {
            toast.error('Launch error: ' + err.message);
        } finally {
            setIsLaunching(false);
        }
    };

    const handleTestSend = async () => {
        if (!selectedTemplate) return;

        const testPhone = window.prompt("Enter your phone number with country code (e.g. 916901136833):", accountInfo?.phoneNumberId?.replace('...', '') || '');

        if (!testPhone) return;

        // Same validation: template requires media header
        if (headerMedia.type !== 'NONE' && !headerMedia.url?.trim() && !headerMedia.handle?.trim()) {
            toast.error(`This template requires a ${headerMedia.type} URL in the Header Asset field.`);
            return;
        }

        setIsLaunching(true);
        try {
            toast.info("Sending test message to " + testPhone + "...");
            const result = await sendTestCampaignAction({
                templateName: selectedTemplate.name,
                languageCode: selectedTemplate.language,
                testPhone: testPhone,
                mappings: variableMappings,
                headerMedia: headerMedia.type !== 'NONE' ? headerMedia : undefined,
                buttonUrlSuffix: hasDynamicButton ? buttonUrlSuffix : undefined
            });

            if (result.success) {
                toast.success(`Test sent successfully to ${testPhone}. ID: ${result.messageId}`);
            } else {
                toast.error(`Test failed: ${result.error}`);
            }
        } catch (err: any) {
            toast.error('Test error: ' + err.message);
        } finally {
            setIsLaunching(false);
        }
    };

    const renderPreview = () => {
        if (!selectedTemplate) return <p className="text-slate-400 text-xs italic">Select a template to preview...</p>;

        const bodyText = selectedTemplate.components.find((c: any) => c.type === 'BODY')?.text || '';
        let preview = bodyText;

        variableMappings.forEach(m => {
            const placeholder = `{{${m.index}}}`;
            const displayValue = m.mappingType === 'PREDEFINED' ? `[${m.value}]` : (m.value || placeholder);
            preview = preview.replace(placeholder, displayValue);
        });

        return (
            <div className="bg-[#E7FED9] p-4 rounded-2xl rounded-tl-none relative shadow-sm border border-[#D5F1BC] animate-in fade-in duration-300">
                <p className="text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">{preview}</p>
                <span className="absolute bottom-2 right-4 text-[9px] text-slate-500 flex items-center gap-1">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <CheckCircle2 className="w-3 h-3 text-blue-500" />
                </span>
            </div>
        );
    };

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Template Selection & Mapping */}
                <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                    <BentoCard className="p-6 space-y-8 border-2 border-green-500/20 shadow-xl shadow-green-500/5">
                        {/* Connection Health Banner */}
                        {accountInfo && (
                            <div className={cn(
                                "p-4 rounded-2xl flex flex-col gap-3 border animate-in slide-in-from-top duration-500",
                                accountInfo.success && accountInfo.appStatus === 'live' && !accountInfo.isTestNumber
                                    ? "bg-green-50 border-green-100 text-green-800"
                                    : "bg-amber-50 border-amber-100 text-amber-800"
                            )}>
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-2 rounded-xl",
                                            accountInfo.appStatus === 'live' ? "bg-green-100" : "bg-amber-100"
                                        )}>
                                            {accountInfo.appStatus === 'live' ? <ShieldCheck className="w-5 h-5 text-green-600" /> : <ShieldAlert className="w-5 h-5 text-amber-600" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">
                                                Meta Account: {accountInfo.appStatus?.toUpperCase() || 'ERROR'}
                                            </p>
                                            <p className="text-[10px] opacity-75 font-medium leading-none">
                                                App: {accountInfo.appName || 'Access Denied'} • ID: {accountInfo.phoneNumberId}
                                            </p>
                                        </div>
                                    </div>

                                    {accountInfo.isTestNumber && (
                                        <div className="px-2 py-1 bg-amber-200 text-amber-900 rounded-lg text-[9px] font-black uppercase tracking-tighter">
                                            Test Number
                                        </div>
                                    )}
                                </div>

                                {/* Detailed Warnings */}
                                <div className="space-y-1">
                                    {accountInfo.isTestNumber && (
                                        <p className="text-[10px] font-bold text-amber-900 flex items-center gap-1">
                                            <Zap className="w-3 h-3 text-amber-600" />
                                            Reminder: Meta labels ID {accountInfo.phoneNumberId} as a "Test Number".
                                        </p>
                                    )}
                                    {selectedTemplate?.category === 'MARKETING' && (
                                        <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg mt-2 space-y-1">
                                            <p className="text-[10px] font-black uppercase text-blue-800 tracking-widest flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3" />
                                                Marketing Delivery Check
                                            </p>
                                            <p className="text-[9px] text-blue-700 leading-tight">
                                                Marketing messages require a **valid payment method** linked in your
                                                <a href="https://business.facebook.com/wa/manage/phone-numbers/" target="_blank" className="underline ml-1">Meta Billing Settings</a>.
                                                If Billing is not setup, Meta will return a success ID but **NEVER** deliver the message.
                                            </p>
                                        </div>
                                    )}
                                    {!accountInfo.success && (
                                        <p className="text-[10px] font-mono text-red-600 bg-red-50 p-1 rounded border border-red-100">
                                            Status Error: {accountInfo.error}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Recent Status Feed */}
                        {recentStatuses.length > 0 && (
                            <div className="space-y-4 animate-in fade-in duration-500">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-green-500" />
                                        Live Delivery Feed
                                    </h4>
                                    <span className="text-[8px] font-bold text-slate-300 uppercase">Auto-updating</span>
                                </div>
                                <div className="space-y-2">
                                    {recentStatuses.map((s) => (
                                        <div key={s.id} className={cn(
                                            "p-3 rounded-2xl border text-[10px] flex items-center justify-between transition-all",
                                            s.status === 'failed' ? "bg-red-50 border-red-100" :
                                                s.status === 'delivered' ? "bg-green-50/50 border-green-100" :
                                                    s.status === 'read' ? "bg-blue-50/50 border-blue-100" : "bg-slate-50 border-slate-100"
                                        )}>
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full animate-pulse",
                                                    s.status === 'failed' ? "bg-red-500" :
                                                        s.status === 'delivered' ? "bg-green-500" :
                                                            s.status === 'read' ? "bg-blue-500" : "bg-slate-400"
                                                )} />
                                                <div>
                                                    <p className="font-black text-slate-900 leading-none mb-1">
                                                        {s.guest_name || s.guest_phone || 'Campaign Recipient'}
                                                    </p>
                                                    {s.error_message ? (
                                                        <p className="text-red-600 font-bold text-[9px] max-w-[200px] leading-tight">
                                                            Error: {s.error_message}
                                                        </p>
                                                    ) : (
                                                        <p className="text-slate-500 opacity-60 text-[9px]">
                                                            {s.guest_phone} • {s.template_type?.toUpperCase()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-lg font-black uppercase tracking-tighter text-[8px]",
                                                s.status === 'failed' ? "bg-red-100 text-red-600" :
                                                    s.status === 'delivered' ? "bg-green-100 text-green-600" :
                                                        s.status === 'read' ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-500"
                                            )}>
                                                {s.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Layout className="w-5 h-5 text-green-600" />
                                    Step 1: Select Template
                                </h3>
                                <button
                                    onClick={() => setShowTemplateDesigner(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100/50"
                                >
                                    <Megaphone className="w-3 h-3" />
                                    Design New Template
                                </button>
                                <button onClick={fetchTemplates} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-all">
                                    <RefreshCw className={cn("w-4 h-4", isLoadingTemplates && "animate-spin")} />
                                </button>
                            </div>

                            {/* Template Dropdown */}
                            <div className="relative group">
                                <select
                                    value={selectedTemplate?.name || ''}
                                    onChange={(e) => {
                                        const t = templates.find(temp => temp.name === e.target.value);
                                        if (t) handleTemplateSelect(t);
                                    }}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all outline-none text-sm font-bold text-slate-700 appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>Select a Meta Approved Template...</option>
                                    {templates.map(t => (
                                        <option key={t.name} value={t.name}>{t.name.toUpperCase().replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-green-600 transition-colors" />
                            </div>

                            {!selectedTemplate && !isLoadingTemplates && (
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase text-amber-800 tracking-widest">Awaiting Approval?</p>
                                        <p className="text-[10px] text-amber-700 font-medium">Only templates approved by Meta appear here. Manage them in the WhatsApp Hub.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {selectedTemplate && (
                            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                                {/* Media Header Section */}
                                {headerMedia.type !== 'NONE' && (
                                    <div className="space-y-3 p-5 bg-slate-50/50 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/30">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-600 tracking-widest px-1">
                                            <ImageIcon className="w-3 h-3" />
                                            Required: Header {headerMedia.type} Asset
                                            <span className="ml-auto text-red-500 text-[9px]">* REQUIRED TO SEND</span>
                                        </div>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                value={headerMedia.url}
                                                onChange={(e) => setHeaderMedia(prev => ({ ...prev, url: e.target.value }))}
                                                className={cn(
                                                    "w-full px-4 py-2.5 text-xs bg-white border rounded-xl focus:ring-4 focus:ring-green-500/10 outline-none transition-all shadow-inner font-bold",
                                                    headerMedia.url?.trim() ? "border-green-300" : "border-red-300"
                                                )}
                                                placeholder={`Paste a public ${headerMedia.type === 'DOCUMENT' ? 'PDF' : headerMedia.type.toLowerCase()} URL here...`}
                                            />
                                        </div>
                                        {!headerMedia.url?.trim() && (
                                            <p className="text-[9px] text-red-600 font-bold flex items-center gap-1 px-1">
                                                <ShieldAlert className="w-3 h-3" />
                                                Without a valid URL, Meta will reject this message silently.
                                                {headerMedia.type === 'DOCUMENT' && " Use a publicly accessible PDF link (e.g. from your R2 bucket or Google Drive)."}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Variable Mapping Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
                                        <Type className="w-3 h-3" />
                                        Dynamic Data Mapping
                                    </div>
                                    <div className="space-y-3">
                                        {variableMappings.map((m, idx) => (
                                            <div key={idx} className="flex gap-2 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm items-center">
                                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-[10px] font-black text-green-700 border border-green-100 shrink-0">
                                                    {"{{"}{m.index}{"}}"}
                                                    <div className="absolute -top-1 -right-1 text-[8px] bg-white border px-1 rounded shadow-xs uppercase">
                                                        {m.component}
                                                    </div>
                                                </div>

                                                <div className="flex-1 flex gap-2">
                                                    <select
                                                        value={m.mappingType}
                                                        onChange={(e) => {
                                                            const newMappings = [...variableMappings];
                                                            newMappings[idx].mappingType = e.target.value as any;
                                                            newMappings[idx].value = ''; // Reset when type changes
                                                            setVariableMappings(newMappings);
                                                        }}
                                                        className="px-2 py-2 text-[10px] font-bold border-none bg-slate-100 rounded-lg outline-none cursor-pointer hover:bg-slate-200 transition-colors"
                                                    >
                                                        <option value="STATIC">Custom Text</option>
                                                        <option value="PREDEFINED">Guest Data</option>
                                                    </select>

                                                    {m.mappingType === 'STATIC' ? (
                                                        <input
                                                            type="text"
                                                            value={m.value}
                                                            onChange={(e) => {
                                                                const newMappings = [...variableMappings];
                                                                newMappings[idx].value = e.target.value;
                                                                setVariableMappings(newMappings);
                                                            }}
                                                            className="flex-1 px-3 py-2 text-xs border-b border-slate-100 focus:border-green-400 outline-none transition-all bg-transparent font-medium"
                                                            placeholder="Enter fixed text..."
                                                        />
                                                    ) : (
                                                        <select
                                                            value={m.value}
                                                            onChange={(e) => {
                                                                const newMappings = [...variableMappings];
                                                                newMappings[idx].value = e.target.value;
                                                                setVariableMappings(newMappings);
                                                            }}
                                                            className="flex-1 px-3 py-2 text-xs font-bold text-green-700 bg-green-50/30 border-none rounded-lg outline-none cursor-pointer"
                                                        >
                                                            <option value="">Select Data Field...</option>
                                                            <option value="GUEST_NAME">Guest First Name</option>
                                                            <option value="FULL_NAME">Guest Full Name</option>
                                                            <option value="PHONE_NUMBER">Phone Number</option>
                                                        </select>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {hasDynamicButton && (
                                            <div className="flex gap-2 p-3 bg-amber-50 border border-amber-100 rounded-2xl shadow-sm items-center animate-in slide-in-from-top-2 duration-300">
                                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-[10px] font-black text-amber-700 border border-amber-200 shrink-0">
                                                    LINK
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <p className="text-[10px] font-black uppercase text-amber-800 tracking-widest px-1">Review/Action Button Link</p>
                                                    <input
                                                        type="text"
                                                        value={buttonUrlSuffix}
                                                        onChange={(e) => setButtonUrlSuffix(e.target.value)}
                                                        className="w-full px-3 py-2 text-xs border-b border-amber-200 focus:border-amber-400 outline-none transition-all bg-transparent font-bold text-amber-900"
                                                        placeholder="Enter URL suffix (e.g. feedback-link-id)..."
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </BentoCard>

                    {/* Final Campaign Stats/Meta */}
                    <BentoCard className="p-6">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-green-500" />
                            Campaign Logistics
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Campaign Label</label>
                                <input
                                    type="text"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all outline-none font-bold text-slate-900 shadow-inner"
                                    placeholder="e.g. Summer_Pool_Discount"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Live Preview</label>
                                <div className="min-h-[100px] flex flex-col justify-center">
                                    {renderPreview()}
                                </div>
                            </div>
                        </div>
                    </BentoCard>
                </div>

                {/* Right Column: Audience Selector */}
                <div className="lg:col-span-12 xl:col-span-7 space-y-6">
                    <BentoCard className="p-0 overflow-hidden flex flex-col h-[850px] border-2 border-slate-100 shadow-2xl">
                        <div className="p-6 border-b border-slate-100 bg-white">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                                        <Users className="w-5 h-5 text-green-500" />
                                        Blast Audience
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">Map your template to these selected contacts.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setAudienceType('marketing_leads')}
                                        className={cn(
                                            "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border-b-4",
                                            audienceType === 'marketing_leads'
                                                ? "bg-green-600 border-green-800 text-white shadow-xl shadow-green-100 translate-y-[2px]"
                                                : "bg-white border-slate-200 text-slate-400 hover:border-green-300 hover:text-green-600"
                                        )}
                                    >
                                        <Zap className="w-4 h-4" /> Marketing Leads
                                    </button>
                                    <button
                                        onClick={() => setAudienceType('hotel_guests')}
                                        className={cn(
                                            "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border-b-4",
                                            audienceType === 'hotel_guests'
                                                ? "bg-slate-900 border-slate-700 text-white shadow-xl shadow-slate-200 translate-y-[2px]"
                                                : "bg-white border-slate-200 text-slate-400 hover:border-green-300 hover:text-green-600"
                                        )}
                                    >
                                        <Hotel className="w-4 h-4" /> CRM Guests
                                    </button>
                                    <button
                                        onClick={() => setAudienceType('restaurant_customers')}
                                        className={cn(
                                            "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border-b-4",
                                            audienceType === 'restaurant_customers'
                                                ? "bg-slate-900 border-slate-700 text-white shadow-xl shadow-slate-200 translate-y-[2px]"
                                                : "bg-white border-slate-200 text-slate-400 hover:border-green-300 hover:text-green-600"
                                        )}
                                    >
                                        <Utensils className="w-4 h-4" /> Restaurant
                                    </button>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white outline-none text-sm transition-all shadow-inner font-medium"
                                        placeholder="Search by name or number..."
                                    />
                                </div>
                                <button
                                    onClick={selectAll}
                                    className="px-5 py-3 rounded-2xl border-2 border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-2"
                                >
                                    <TrendingUp className="w-3 h-3" />
                                    {selectedGuests.length === filteredGuests.length ? 'Clear' : 'Select All'}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar bg-slate-50/20">
                            {isLoadingGuests ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
                                    <RefreshCw className="w-10 h-10 animate-spin text-green-500/30" />
                                    <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Scanning Audience Database...</p>
                                </div>
                            ) : filteredGuests.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredGuests.map((guest) => (
                                        <div
                                            key={guest.id}
                                            onClick={() => toggleGuestSelection(guest.id)}
                                            className={cn(
                                                "p-4 rounded-3xl border-2 transition-all cursor-pointer group flex items-start gap-4 relative overflow-hidden",
                                                selectedGuests.includes(guest.id)
                                                    ? "bg-green-50/50 border-green-500 shadow-md shadow-green-100/50"
                                                    : "bg-white border-slate-50 hover:border-green-200"
                                            )}
                                        >
                                            {selectedGuests.includes(guest.id) && (
                                                <div className="absolute top-[-20px] right-[-20px] w-12 h-12 bg-green-500 rotate-45 flex items-end justify-center pb-1">
                                                    <Check className="w-3 h-3 text-white -rotate-45" />
                                                </div>
                                            )}
                                            <div className={cn(
                                                "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all border-b-2 shadow-sm",
                                                selectedGuests.includes(guest.id)
                                                    ? "bg-green-600 border-green-700 text-white"
                                                    : "bg-slate-100 border-slate-200 text-slate-400 group-hover:text-green-500 group-hover:bg-green-50"
                                            )}>
                                                <UserCircle className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn(
                                                    "font-black text-xs truncate uppercase tracking-tight",
                                                    selectedGuests.includes(guest.id) ? "text-green-900" : "text-slate-900"
                                                )}>{guest.name || 'Anonymous'}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                                                    <Phone className="w-2.5 h-2.5" />
                                                    <span className="text-[10px] font-bold text-slate-500">{guest.phone}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
                                    <Search className="w-16 h-16 opacity-10" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No matching contacts found</p>
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-white border-t border-slate-100 flex items-center justify-between gap-6 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                            <div className="hidden sm:block">
                                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest leading-none mb-1">Total Payload</span>
                                <span className="text-2xl font-black text-slate-900">{selectedGuests.length} <span className="text-xs font-bold text-slate-400 uppercase">Numbers</span></span>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <button
                                    onClick={handleTestSend}
                                    disabled={isLaunching || !selectedTemplate}
                                    className="px-8 py-5 bg-white border-2 border-green-600 text-green-600 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all hover:bg-green-50 active:scale-[0.98] disabled:opacity-50"
                                >
                                    <Zap className="w-4 h-4" />
                                    Send Test To Me
                                </button>
                                <button
                                    onClick={handleLaunch}
                                    disabled={isLaunching || !selectedTemplate || selectedGuests.length === 0}
                                    className={cn(
                                        "px-10 py-5 bg-green-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 transition-all shadow-[0_20px_40px_-10px_rgba(22,163,74,0.3)] hover:bg-green-700 active:scale-[0.98] disabled:bg-slate-200 disabled:shadow-none disabled:text-slate-400",
                                        isLaunching && "animate-pulse"
                                    )}
                                >
                                    {isLaunching ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Blast Campaign
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </BentoCard>
                </div>
            </div>

            {showTemplateDesigner && (
                <MarketingTemplateEditor
                    onClose={() => setShowTemplateDesigner(false)}
                    onSuccess={() => {
                        setShowTemplateDesigner(false);
                        fetchTemplates();
                        toast.success("Marketing template submitted for review!");
                    }}
                />
            )}
        </>
    );
}
