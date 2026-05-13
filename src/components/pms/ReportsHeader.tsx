'use client';

import { useState } from 'react';
import { Calendar, Download, FileText, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getTodayIST } from '@/utils/date';

interface ReportsHeaderProps {
    title: string;
    description: string;
    onDateChange: (date: string) => void;
    currentDate: string;
    onExport?: () => void;
}

export function ReportsHeader({ title, description, onDateChange, currentDate, onExport }: ReportsHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h1>
                <p className="text-sm font-medium text-slate-500">{description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex items-center">
                    <Calendar className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="date"
                        value={currentDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    />
                </div>

                <button
                    onClick={onExport}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                    <Download className="w-4 h-4" />
                    <span>Export PDF</span>
                </button>
            </div>
        </div>
    );
}
