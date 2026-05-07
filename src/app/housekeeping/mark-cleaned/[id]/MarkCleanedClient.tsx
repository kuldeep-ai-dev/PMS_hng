'use client';

import { useEffect, useState } from 'react';
import { updateCleaningStatus } from '@/app/actions/housekeeping';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export function MarkCleanedClient({ id, roomNumber }: { id: string, roomNumber: string }) {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const performUpdate = async () => {
            try {
                const result = await updateCleaningStatus(id, 'completed');
                if (result.success) {
                    setStatus('success');
                } else {
                    throw new Error('Update returned unsuccessful');
                }
            } catch (error: any) {
                console.error('[MarkCleaned] Update failed:', error);
                setStatus('error');
                setErrorMessage(error.message || 'An error occurred while updating the status.');
            }
        };

        performUpdate();
    }, [id]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Updating Status...</h1>
                    <p className="text-gray-600">Please wait while we mark Room {roomNumber} as cleaned.</p>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in duration-500">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Success!</h1>
                    <p className="text-lg text-gray-700 mb-4">
                        Room <span className="font-bold text-blue-600">{roomNumber}</span> is now marked as <span className="text-green-600 font-bold">Cleaned & Ready</span>.
                    </p>
                    <p className="text-sm text-gray-500 italic">
                        The housekeeping monitor has been updated automatically.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Update Failed</h1>
                <p className="text-gray-600">{errorMessage}</p>
            </div>
        </div>
    );
}
