'use client';

import { useState, useRef } from 'react';
import { PenTool, Loader2, X } from 'lucide-react';
import { uploadStaffPhoto } from '@/app/(dashboard)/admin/staff/actions';
import { toast } from 'sonner';

function compressImage(file: File, maxWidth = 512, quality = 0.9): Promise<string> {
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
                // White background to ensure clean transparency/blending if needed
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, w, h);
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

export default function SignatureUpload({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
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
            toast.error('File must be less than 5MB');
            return;
        }

        setIsUploading(true);

        try {
            // Use higher maxWidth and quality for signatures to ensure clean lines
            const compressedBase64 = await compressImage(file, 512, 0.9);
            setPreview(compressedBase64);

            const safeName = `signature_${Date.now()}.webp`;
            const res = await uploadStaffPhoto(compressedBase64, safeName);

            if (!res.success || !res.url) {
                throw new Error(res.error || 'Upload failed');
            }

            onChange(res.url);
            setPreview(res.url);
            toast.success('Signature uploaded');
        } catch (error: any) {
            toast.error(error.message);
            setPreview(value);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex flex-col items-center gap-3 w-full">
            <div className="relative w-full h-32 rounded-2xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden group">
                {preview ? (
                    <img src={preview} alt="Staff Signature" className="w-full h-full object-contain p-2" />
                ) : (
                    <div className="flex flex-col items-center gap-2 opacity-30">
                        <PenTool className="w-8 h-8" />
                        <span className="text-[10px] uppercase font-bold tracking-widest">Authorized Signature</span>
                    </div>
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
                        {preview ? 'Change Signature' : 'Upload Signature'}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-950 bg-slate-100 px-4 py-2 rounded-xl transition-colors"
                >
                    {isUploading ? 'Uploading...' : preview ? 'Replace Signature' : 'Upload Signature Image'}
                </button>
                {preview && (
                    <button
                        type="button"
                        onClick={() => { onChange(null); setPreview(null); }}
                        className="p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                        title="Remove Signature"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />
        </div>
    );
}
