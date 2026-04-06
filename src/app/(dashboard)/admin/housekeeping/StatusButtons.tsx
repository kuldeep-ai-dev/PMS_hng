'use client';

import { useState } from 'react';
import { updateCleaningStatus } from '@/app/actions/housekeeping';
import { PlayCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StatusButtons({ assignmentId, status }: { assignmentId: string, status: string }) {
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (newStatus: 'in_progress' | 'completed') => {
        setLoading(true);
        try {
            await updateCleaningStatus(assignmentId, newStatus);
            toast.success(`Cleaning status updated to ${newStatus.replace('_', ' ')}`);
            // No need for window.location.reload() if revalidatePath works, 
            // but in many setups a quick reload ensures the server component re-fetches.
            // Actually, revalidatePath should work for many cases.
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const s = status?.toLowerCase();
    if (s === 'completed') return null;

    return (
        <div className="flex gap-2">
            {s === 'pending' && (
                <button
                    onClick={() => handleUpdate('in_progress')}
                    disabled={loading}
                    className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                    title="Start Cleaning"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                    Start
                </button>
            )}
            {s === 'in_progress' && (
                <button
                    onClick={() => handleUpdate('completed')}
                    disabled={loading}
                    className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                    title="Finish Cleaning"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Finish
                </button>
            )}
        </div>
    );
}
