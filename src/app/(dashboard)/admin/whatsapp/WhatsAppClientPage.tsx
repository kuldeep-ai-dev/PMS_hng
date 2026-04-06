'use client';

import { useState, useEffect } from 'react';
import {
    MessageSquare,
    Plus,
    Search,
    RefreshCw,
    CheckCircle2,
    Clock,
    AlertCircle,
    XCircle
} from 'lucide-react';
import { BentoCard } from '@/components/ui/BentoCard';
import { TemplateList } from './TemplateList';
import { TemplateForm } from './TemplateForm';
import { useRouter } from 'next/navigation';
import { deleteWhatsAppTemplate } from '@/app/actions/whatsapp-templates';

interface WhatsAppClientPageProps {
    initialTemplates: any[];
    error: string | null;
}

export function WhatsAppClientPage({ initialTemplates, error: initialError }: WhatsAppClientPageProps) {
    const router = useRouter();
    const [templates, setTemplates] = useState(initialTemplates);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Sync templates state when initialTemplates props from server changes
    useEffect(() => {
        setTemplates(initialTemplates);
    }, [initialTemplates]);

    // Calculate stats
    const stats = {
        total: templates.length,
        approved: templates.filter((t: any) => t.status === 'APPROVED').length,
        pending: templates.filter((t: any) => t.status === 'PENDING' || t.status === 'IN_REVIEW').length,
        rejected: templates.filter((t: any) => t.status === 'REJECTED').length,
    };

    const filteredTemplates = templates.filter((t: any) => {
        const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter ? t.category === categoryFilter : true;
        const matchesStatus = statusFilter ? t.status === statusFilter : true;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    const handleSync = async () => {
        setIsSyncing(true);
        // In a real app, we would call the server action here and update state
        // For now, we'll just refresh the router to trigger server-side re-fetch
        router.refresh();
        setTimeout(() => setIsSyncing(false), 1000);
    };

    const handleCreate = () => {
        setEditingTemplate(null);
        setIsFormOpen(true);
    };

    const handleEdit = (template: any) => {
        setEditingTemplate(template);
        setIsFormOpen(true);
    };

    const handleDelete = async (templateId: string, templateName: string, language: string) => {
        try {
            const result = await deleteWhatsAppTemplate(templateId, templateName, language);
            if (result.success) {
                router.refresh();
            } else {
                alert(`Error deleting template: ${result.error}`);
            }
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    return (
        <div className="flex flex-col gap-8 h-full max-w-6xl mx-auto pb-20 px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <div className="p-1.5 bg-green-50 rounded-lg">
                            <MessageSquare className="w-6 h-6 text-green-600" />
                        </div>
                        WhatsApp Control Center
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 ml-1">Manage, edit and monitor your WhatsApp message templates</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        Sync from Meta
                    </button>
                    <button
                        onClick={handleCreate}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-100 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Create Template
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <BentoCard className="p-5 flex flex-col gap-1 border-b-4 border-b-slate-300 hover:translate-y-[-2px] transition-transform cursor-pointer">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Templates</span>
                    <span className="text-3xl font-black text-slate-900 leading-tight">{stats.total}</span>
                </BentoCard>
                <BentoCard className="p-5 flex flex-col gap-1 border-b-4 border-b-green-500 hover:translate-y-[-2px] transition-transform cursor-pointer">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Approved</span>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="text-3xl font-black text-slate-900 leading-tight">{stats.approved}</span>
                </BentoCard>
                <BentoCard className="p-5 flex flex-col gap-1 border-b-4 border-b-amber-500 hover:translate-y-[-2px] transition-transform cursor-pointer">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">In Review</span>
                        <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="text-3xl font-black text-slate-900 leading-tight">{stats.pending}</span>
                </BentoCard>
                <BentoCard className="p-5 flex flex-col gap-1 border-b-4 border-b-red-500 hover:translate-y-[-2px] transition-transform cursor-pointer">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rejected</span>
                        <XCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <span className="text-3xl font-black text-slate-900 leading-tight">{stats.rejected}</span>
                </BentoCard>
            </div>

            {initialError && (
                <div className="p-5 bg-red-50/50 border border-red-100 rounded-2xl flex items-start gap-4 backdrop-blur-sm shadow-sm ring-1 ring-red-200/20">
                    <div className="p-2 bg-red-100 rounded-full text-red-600">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-red-900">API Connection Issue</h3>
                        <p className="text-sm text-red-700/80 mt-0.5 leading-relaxed">{initialError}</p>
                        <div className="mt-3 flex items-center gap-3">
                            <button
                                onClick={handleSync}
                                className="text-xs font-bold text-red-700 underline underline-offset-4 hover:text-red-900"
                            >
                                Try reconnecting
                            </button>
                            <span className="text-slate-300">|</span>
                            <span className="text-[11px] text-red-600/60 font-medium">Please verify credentials in Settings</span>
                        </div>
                    </div>
                </div>
            )}

            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm ring-1 ring-slate-200/50">
                    <div className="relative w-full sm:max-w-md group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by template name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 bg-slate-50/30 transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="flex-1 sm:flex-none px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all font-medium text-slate-600"
                        >
                            <option value="">All Categories</option>
                            <option value="MARKETING">Marketing</option>
                            <option value="UTILITY">Utility</option>
                            <option value="AUTHENTICATION">Authentication</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="flex-1 sm:flex-none px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all font-medium text-slate-600"
                        >
                            <option value="">All Statuses</option>
                            <option value="APPROVED">Approved</option>
                            <option value="PENDING">Pending</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden min-h-[400px] ring-1 ring-slate-200/50">
                    <TemplateList
                        templates={filteredTemplates}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </div>
            </section>

            {/* Template Form Modal */}
            {isFormOpen && (
                <TemplateForm
                    template={editingTemplate}
                    onClose={() => setIsFormOpen(false)}
                    onSuccess={() => {
                        setIsFormOpen(false);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
