'use client';

import { useState, useEffect } from 'react';
import {
    CheckCircle2,
    Clock,
    XCircle,
    MoreHorizontal,
    Eye,
    Edit2,
    Trash2,
    Globe,
    Tag,
    ChevronRight,
    MessageSquare,
    Image as ImageIcon,
    Layout,
    ExternalLink,
    AlertCircle,
    RefreshCw
} from 'lucide-react';

interface TemplateListProps {
    templates: any[];
    onEdit: (template: any) => void;
    onDelete: (templateId: string, templateName: string, language: string) => void;
}

export function TemplateList({ templates, onEdit, onDelete }: TemplateListProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (templates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No templates found</h3>
                <p className="text-sm text-slate-500 max-w-xs mt-1">
                    Connect your WhatsApp Business Account or create your first message template to get started.
                </p>
            </div>
        );
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                        <CheckCircle2 className="w-3 h-3" />
                        Approved
                    </span>
                );
            case 'PENDING':
            case 'IN_REVIEW':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                        <Clock className="w-3 h-3" />
                        Pending
                    </span>
                );
            case 'REJECTED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                        <XCircle className="w-3 h-3" />
                        Rejected
                    </span>
                );
            case 'PAUSED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        Paused
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-100">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm shadow-sm">
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <th className="px-6 py-4">Template Name</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Language</th>
                        <th className="px-6 py-4">Last Updated</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {templates.map((template) => (
                        <tr
                            key={template.id}
                            className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                            onClick={() => setSelectedTemplate(template)}
                        >
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-slate-900 group-hover:text-green-600 transition-colors">
                                        {template.name.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">{template.id}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                {getStatusBadge(template.status)}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5">
                                    <Tag className="w-3 h-3 text-slate-400" />
                                    <span className="text-xs text-slate-600 capitalize">{template.category.toLowerCase()}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5">
                                    <Globe className="w-3 h-3 text-slate-400" />
                                    <span className="text-xs text-slate-600 uppercase">{template.language}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500">
                                {isClient ? new Date().toLocaleDateString() : '--'}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-all"
                                        title="Preview"
                                        onClick={(e) => { e.stopPropagation(); setSelectedTemplate(template); }}
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                                        title="Edit"
                                        onClick={(e) => { e.stopPropagation(); onEdit(template); }}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                                        title="Delete"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
                                                onDelete(template.id, template.name, template.language);
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <MoreHorizontal className="w-4 h-4 text-slate-300 group-hover:hidden transition-all inline-block" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Template Details / Preview Side/Modal (Simplified Placeholder) */}
            {selectedTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 capitalize">{selectedTemplate.name.replace(/_/g, ' ')}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    {getStatusBadge(selectedTemplate.status)}
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{selectedTemplate.category}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTemplate(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            {/* WhatsApp Phone Mockup Preview */}
                            <div className="max-w-[320px] mx-auto bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                                <div className="bg-[#075e54] p-3 text-white flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-200" />
                                    <span className="text-sm font-semibold">Business Support</span>
                                </div>
                                <div className="p-4 bg-[#e5ddd5] min-h-[300px] flex flex-col gap-2">
                                    <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm text-sm relative">
                                        <div className="flex flex-col gap-2">
                                            {selectedTemplate.components.map((comp: any, idx: number) => {
                                                if (comp.type === 'HEADER') {
                                                    return (
                                                        <div key={idx} className="bg-slate-100 p-3 rounded-md mb-2 flex items-center gap-2 text-slate-500 italic">
                                                            {comp.format === 'DOCUMENT' ? 'PDF Attachment' : comp.format === 'IMAGE' ? 'Image File' : comp.text}
                                                        </div>
                                                    );
                                                }
                                                if (comp.type === 'BODY') {
                                                    return (
                                                        <p key={idx} className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                                                            {comp.text.replace(/\{\{\d\}\}/g, '...')}
                                                        </p>
                                                    );
                                                }
                                                if (comp.type === 'FOOTER') {
                                                    return (
                                                        <p key={idx} className="text-[11px] text-slate-400 mt-2">
                                                            {comp.text}
                                                        </p>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                        <span className="block text-[10px] text-slate-400 text-right mt-1">10:45 AM</span>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex flex-col gap-1.5 mt-1">
                                        {selectedTemplate.components.find((c: any) => c.type === 'BUTTONS')?.buttons?.map((btn: any, idx: number) => (
                                            <div key={idx} className="bg-white/90 py-2.5 px-4 rounded-xl shadow-sm text-blue-600 text-sm font-medium text-center hover:bg-white transition-colors cursor-default">
                                                {btn.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 space-y-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Metadata</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                                        <span className="block text-[10px] text-slate-400 uppercase">Language</span>
                                        <span className="text-sm font-semibold text-slate-700 uppercase">{selectedTemplate.language}</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                                        <span className="block text-[10px] text-slate-400 uppercase">Variables</span>
                                        <span className="text-sm font-semibold text-slate-700">
                                            {selectedTemplate.components.reduce((acc: number, comp: any) => {
                                                const matches = comp.text?.match(/\{\{\d\}\}/g);
                                                return acc + (matches ? matches.length : 0);
                                            }, 0)} count
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => onEdit(selectedTemplate)}
                                className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Edit Template
                            </button>
                            <button className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors">
                                Use Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
