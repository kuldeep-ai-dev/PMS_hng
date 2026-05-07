import { updateCleaningStatus } from '@/app/actions/housekeeping';
import { createAdminClient } from '@/utils/supabase/admin';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ _token?: string }>;
}

export default async function MarkCleanedPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { _token } = await searchParams;

    const expectedToken = process.env.INTERNAL_PDF_TOKEN || '__geny_pms_internal_pdf_2026__';

    if (!_token || _token !== expectedToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Access</h1>
                    <p className="text-gray-600">You are not authorized to access this page.</p>
                </div>
            </div>
        );
    }

    try {
        const supabase = createAdminClient();
        const { data: assignment } = await supabase
            .from('cleaning_assignments')
            .select(`
                *,
                rooms (number)
            `)
            .eq('id', id)
            .single();

        if (!assignment) {
            throw new Error('Assignment not found');
        }

        if (assignment.status === 'completed') {
            return (
                <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Cleaned!</h1>
                        <p className="text-gray-600">Room {assignment.rooms.number} has already been marked as cleaned.</p>
                    </div>
                </div>
            );
        }

        // Perform the update
        await updateCleaningStatus(id, 'completed');

        return (
            <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in duration-500">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Success!</h1>
                    <p className="text-lg text-gray-700 mb-4">
                        Room <span className="font-bold text-blue-600">{assignment.rooms.number}</span> is now marked as <span className="text-green-600 font-bold">Cleaned & Ready</span>.
                    </p>
                    <p className="text-sm text-gray-500 italic">
                        The housekeeping monitor has been updated automatically.
                    </p>
                </div>
            </div>
        );
    } catch (error: any) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Update Failed</h1>
                    <p className="text-gray-600">{error.message || 'An error occurred while updating the status.'}</p>
                </div>
            </div>
        );
    }
}
