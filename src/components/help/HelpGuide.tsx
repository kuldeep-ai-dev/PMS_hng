'use client';

import React, { useState, useMemo } from 'react';
import { HELP_CONTENT, HelpItem, HelpCategory } from './HelpContent';
import {
    Search,
    BookOpen,
    Hotel,
    Utensils,
    Package,
    Settings,
    ShieldCheck,
    ChevronRight,
    Lightbulb,
    X,
    Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpGuideProps {
    userRole?: string;
}

export default function HelpGuide({ userRole = 'staff' }: HelpGuideProps) {
    const [activeCategory, setActiveCategory] = useState<HelpCategory | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<HelpItem | null>(null);

    const categories = [
        { id: 'all', label: 'All features', icon: BookOpen },
        { id: 'front-office', label: 'Front Office', icon: Hotel },
        { id: 'restaurant', label: 'Restaurant', icon: Utensils },
        { id: 'inventory', label: 'Inventory', icon: Package },
    ];

    const filteredContent = useMemo(() => {
        return HELP_CONTENT.filter(item => {
            if (item.category === 'admin' || item.category === 'master') return false;
            const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
            const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        }).sort((a, b) => {
            // Priority for user role
            const aMatchesRole = a.roles.includes(userRole);
            const bMatchesRole = b.roles.includes(userRole);
            if (aMatchesRole && !bMatchesRole) return -1;
            if (!aMatchesRole && bMatchesRole) return 1;
            return 0;
        });
    }, [activeCategory, searchTerm, userRole]);

    return (
        <div className="flex flex-col gap-8 pb-20 max-w-7xl mx-auto">
            {/* Search Header */}
            <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-slate-100 text-center space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">How can we help you?</h1>
                    <p className="text-slate-500 font-medium">Search for features, workflows, and role-specific guides.</p>
                </div>

                <div className="relative max-w-2xl mx-auto group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search manual (e.g., 'billing', 'check-in', 'license')..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-bold text-slate-900 focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                    />
                </div>
            </div>

            {/* Category Navigation */}
            <div className="flex flex-wrap items-center justify-center gap-3">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id as any)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                            activeCategory === cat.id
                                ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-100"
                        )}
                    >
                        <cat.icon className="w-4 h-4" />
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Grid of Articles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContent.length > 0 ? (
                    filteredContent.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className="group bg-white p-6 rounded-3xl border border-slate-100 hover:border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                    item.category === 'front-office' ? "bg-teal-50 text-teal-600" :
                                        item.category === 'restaurant' ? "bg-orange-50 text-orange-600" :
                                            item.category === 'admin' ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-500"
                                )}>
                                    {item.category.replace('-', ' ')}
                                </span>
                                {item.roles.includes(userRole) && (
                                    <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                        <ShieldCheck className="w-3 h-3" /> Recommended
                                    </span>
                                )}
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                            <p className="text-sm font-medium text-slate-500 line-clamp-3 mb-6 flex-1 italic">{item.description}</p>
                            <div className="flex items-center text-xs font-black text-slate-400 group-hover:text-slate-900 transition-colors">
                                Read Full Guide <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center">
                        <Filter className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-lg font-black text-slate-300 uppercase tracking-widest">No matching guides found</p>
                    </div>
                )}
            </div>

            {/* Modal Detail View */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-500">
                        {/* Modal Header */}
                        <div className="relative p-8 md:p-12 bg-slate-900 text-white border-b border-slate-800">
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="absolute right-8 top-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                {selectedItem.category.replace('-', ' ')}
                            </span>
                            <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight">{selectedItem.title}</h2>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                <div className="md:col-span-2 space-y-8">
                                    <section>
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Step-by-Step Procedure</h3>
                                        <div className="space-y-4">
                                            {selectedItem.steps.map((step, idx) => (
                                                <div key={idx} className="flex gap-6 group">
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-black text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                        {idx + 1}
                                                    </div>
                                                    <p className="text-base font-bold text-slate-700 leading-relaxed pt-1">{step}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>

                                <div className="space-y-8">
                                    {selectedItem.tips && selectedItem.tips.length > 0 && (
                                        <section className="p-8 bg-amber-50 rounded-[32px] border border-amber-100">
                                            <h4 className="flex items-center gap-2 text-[10px] font-black text-amber-800 uppercase tracking-widest mb-4">
                                                <Lightbulb className="w-4 h-4" /> Pro Tips
                                            </h4>
                                            <ul className="space-y-4">
                                                {selectedItem.tips.map((tip, idx) => (
                                                    <li key={idx} className="text-sm font-bold text-amber-700 leading-relaxed">
                                                        "{tip}"
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    )}

                                    <section className="p-8 bg-indigo-50/50 rounded-[32px] border border-indigo-100/50">
                                        <h4 className="flex items-center gap-2 text-[10px] font-black text-indigo-800 uppercase tracking-widest mb-4">
                                            <ShieldCheck className="w-4 h-4" /> Required Roles
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedItem.roles.map((role) => (
                                                <span key={role} className="px-3 py-1 bg-white border border-indigo-100 rounded-lg text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                                    {role.replace('_', ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
