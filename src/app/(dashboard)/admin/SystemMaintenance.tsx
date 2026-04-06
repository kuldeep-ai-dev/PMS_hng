'use client';

import { useState } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import { Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { clearCanceledBookings, clearAllBookings } from './actions-admin';

export function SystemMaintenance() {
    const [loading, setLoading] = useState<string | null>(null);

    const handleClearCanceled = async () => {
        if (!confirm('Are you sure you want to permanently delete all canceled bookings?')) return;
        setLoading('canceled');
        try {
            await clearCanceledBookings();
            alert('Canceled bookings cleared successfully!');
        } catch (e) {
            alert('Failed to clear bookings.');
        } finally {
            setLoading(null);
        }
    };

    const handleClearAll = async () => {
        if (!confirm('CRITICAL WARNING: This will delete ALL bookings and reset ALL rooms to Available. This action CANNOT be undone. Proceed?')) return;
        setLoading('all');
        try {
            await clearAllBookings();
            alert('System reset successfully!');
        } catch (e) {
            alert('Failed to reset system.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BentoCard className="p-6 border-red-100 bg-red-50/10">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-100 rounded-xl text-red-600">
                        <Trash2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-900">Clear Canceled Bookings</h3>
                        <p className="text-sm text-slate-500 mt-1">Purge inactive data to keep the database clean and improve performance.</p>
                        <button
                            onClick={handleClearCanceled}
                            disabled={!!loading}
                            className="mt-4 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading === 'canceled' && <Loader2 className="w-3 h-3 animate-spin" />}
                            Execute Purge
                        </button>
                    </div>
                </div>
            </BentoCard>

            <BentoCard className="p-6 border-slate-900 bg-slate-900 text-white">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-teal-500 rounded-xl text-white">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold">Hard System Reset</h3>
                        <p className="text-sm text-slate-400 mt-1">Delete all booking data and restore all rooms to available status. Use for demo cleanup.</p>
                        <button
                            onClick={handleClearAll}
                            disabled={!!loading}
                            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading === 'all' && <Loader2 className="w-3 h-3 animate-spin" />}
                            Reset All Data
                        </button>
                    </div>
                </div>
            </BentoCard>
        </div>
    );
}
