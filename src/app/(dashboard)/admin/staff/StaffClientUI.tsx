'use client';

import { useState } from 'react';
import { Plus, Pencil, X, Loader2 } from 'lucide-react';
import { createStaffMember, updateStaffMember, deleteStaffMember } from './actions';
import { toast } from 'sonner';
import PhotoUpload from '@/components/admin/PhotoUpload';
import SignatureUpload from '@/components/admin/SignatureUpload';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

type StaffData = {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    photo_url?: string | null;
    signature_url?: string | null;
    phone?: string | null;
    address?: string | null;
};

export default function StaffClientUI({ mode, staff }: { mode: 'add' | 'edit'; staff?: StaffData }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    // Form State
    const [photoUrl, setPhotoUrl] = useState<string | null>(staff?.photo_url || null);
    const [signatureUrl, setSignatureUrl] = useState<string | null>(staff?.signature_url || null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const formData = new FormData(e.currentTarget);
            if (photoUrl) {
                formData.set('photo_url', photoUrl);
            }
            if (signatureUrl) {
                formData.set('signature_url', signatureUrl);
            }

            let res;
            if (mode === 'add') {
                res = await createStaffMember(formData);
            } else {
                if (staff?.id) formData.set('id', staff.id);
                res = await updateStaffMember(formData);
            }

            if (res?.success) {
                toast.success(mode === 'add' ? 'Staff created successfully' : 'Staff updated successfully');
                if (res.warning) toast.warning(res.warning);
                setIsOpen(false);
            } else {
                throw new Error(res?.error || 'Failed to save staff member');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!staff?.id) return;

        if (window.confirm(`Are you sure you want to remove ${staff.name}? This will revoke their access completely.`)) {
            setIsDeleting(true);
            try {
                const res = await deleteStaffMember(staff.id);
                if (res?.success) {
                    toast.success('Staff member removed successfully');
                    setIsOpen(false);
                    router.refresh(); // Refresh page if needed
                } else {
                    throw new Error(res?.error || 'Failed to remove staff member');
                }
            } catch (error: any) {
                toast.error(error.message);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    // Trigger Button
    const triggerButton = mode === 'add' ? (
        <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-teal-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
        >
            <Plus className="w-5 h-5" /> Add New Staff
        </button>
    ) : (
        <button
            onClick={() => setIsOpen(true)}
            className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
            title="Edit Staff"
        >
            <Pencil className="w-4 h-4" />
        </button>
    );

    return (
        <>
            {triggerButton}

            {/* Modal Backdrop & Container */}
            {isOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto w-screen h-screen">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
                        {/* Header */}
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-900">
                                {mode === 'add' ? 'Add Staff Member' : 'Edit Staff Profile'}
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="px-6 py-6 pb-8 space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Staff Photo</label>
                                    <PhotoUpload value={photoUrl} onChange={setPhotoUrl} />
                                </div>
                                <div className="space-y-2 text-center">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block">Digital Signature</label>
                                    <SignatureUpload value={signatureUrl} onChange={setSignatureUrl} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5 hidden">
                                    {/* Keep ID around for editing */}
                                    {mode === 'edit' && <input type="hidden" name="id" value={staff?.id} />}
                                </div>

                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-sm font-semibold text-slate-800">Full Name</label>
                                    <input
                                        name="name"
                                        required
                                        defaultValue={staff?.name || ''}
                                        placeholder="e.g. Elena Fisher"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-colors"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-800">Email Address {mode === 'edit' && <span className="text-slate-400 font-normal">(Cannot edit)</span>}</label>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        readOnly={mode === 'edit'}
                                        defaultValue={staff?.email || ''}
                                        placeholder="elena@example.com"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-colors read-only:bg-slate-100 read-only:text-slate-500 read-only:focus:ring-0"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-800">Phone</label>
                                    <input
                                        name="phone"
                                        type="tel"
                                        defaultValue={staff?.phone || ''}
                                        placeholder="+1 234 567 890"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-colors"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-800">Address / Location</label>
                                    <input
                                        name="address"
                                        type="text"
                                        defaultValue={staff?.address || ''}
                                        placeholder="123 Main St, City"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-colors"
                                    />
                                </div>

                                {mode === 'add' && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-800">Assign Password</label>
                                        <input
                                            name="password"
                                            type="password"
                                            required
                                            placeholder="Min 6 characters"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-colors"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-800">Primary Role</label>
                                    <select
                                        name="role"
                                        required
                                        defaultValue={staff?.role || 'front_desk'}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 bg-slate-50 focus:bg-white text-slate-900 transition-colors"
                                    >
                                        <option value="admin">Administrator</option>
                                        <option value="manager">Manager</option>
                                        <option value="front_desk">Front Desk</option>
                                        <option value="restaurant_staff">Restaurant Staff</option>
                                        <option value="cleaning_staff">Housekeeping (Cleaning)</option>
                                    </select>
                                </div>

                                {mode === 'edit' && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-800">Status</label>
                                        <select
                                            name="status"
                                            required
                                            defaultValue={staff?.status || 'active'}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 bg-slate-50 focus:bg-white text-slate-900 transition-colors"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                )}

                            </div>

                            <div className="pt-6 flex justify-between items-center mt-4 border-t border-slate-100">
                                <div>
                                    {mode === 'edit' && staff?.id && (
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            disabled={isDeleting || isLoading}
                                            className="px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
                                        >
                                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove Staff'}
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || isDeleting}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                PROCESSING...
                                            </>
                                        ) : (
                                            mode === 'add' ? 'Create Staff' : 'Save Changes'
                                        )}
                                    </button>
                                </div>
                            </div>

                        </form>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
