'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { uploadStaffPhoto } from '@/app/(dashboard)/admin/staff/actions';
import { toast } from 'sonner';

function compressImage(file: File, maxWidth = 256, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width;
                let h = img.height;
                if (w > maxWidth) {
                    h = Math.round((h * maxWidth) / w);
                    w = maxWidth;
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/webp', quality));
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default function PhotoUpload({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(value);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        setIsUploading(true);

        try {
            // 1. Compress on client (resize to 256px, convert to webp)
            const compressedBase64 = await compressImage(file, 256, 0.75);
            setPreview(compressedBase64); // Show instant preview

            // 2. Upload via server action
            const safeName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
            const res = await uploadStaffPhoto(compressedBase64, safeName);

            if (!res.success || !res.url) {
                throw new Error(res.error || 'Upload failed');
            }

            onChange(res.url);
            setPreview(res.url);
            toast.success('Photo uploaded');
        } catch (error: any) {
            toast.error(error.message);
            setPreview(value); // Revert preview
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-24 rounded-full border-2 border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 group">
                {preview ? (
                    <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <Camera className="w-8 h-8 text-slate-300" />
                )}

                {isUploading && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                    </div>
                )}

                {!isUploading && (
                    <div
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-xs font-semibold"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {preview ? 'Change' : 'Upload'}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="text-xs font-medium text-teal-600 hover:text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full transition-colors"
                >
                    {isUploading ? 'Uploading...' : preview ? 'Change Photo' : 'Upload Photo'}
                </button>
                {preview && (
                    <button
                        type="button"
                        onClick={() => { onChange(null); setPreview(null); }}
                        className="p-1.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-full transition-colors"
                        title="Remove Photo"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
            />
        </div>
    );
}
