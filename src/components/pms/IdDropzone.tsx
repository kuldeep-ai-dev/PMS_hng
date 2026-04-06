'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, CheckCircle2, XCircle, Loader2, ImageIcon, ScanSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createWorker } from 'tesseract.js';

interface IdDropzoneProps {
    guestPhone: string;
    onUploadComplete: (url: string, dob?: string) => void;
}

/**
 * Client-side image compression using canvas.
 * Resizes to max 1600px wide and compresses to JPEG quality 0.7 (~70%).
 * Typically reduces a 4MB photo down to ~200–400KB.
 */
async function compressImage(file: File, maxWidth = 1600, quality = 0.72): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => { blob ? resolve(blob) : reject(new Error('Compression failed')); },
                'image/jpeg',
                quality
            );
        };
        img.onerror = reject;
        img.src = url;
    });
}

export default function IdDropzone({ guestPhone, onUploadComplete }: IdDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [status, setStatus] = useState<'idle' | 'compressing' | 'uploading' | 'analyzing' | 'success' | 'error'>('idle');
    const [analyzing, setAnalyzing] = useState(false);
    const workerRef = useRef<any>(null);

    // Pre-load worker for speed
    useEffect(() => {
        let active = true;
        (async () => {
            const worker = await createWorker('eng');
            if (active) {
                workerRef.current = worker;
            } else {
                await worker.terminate();
            }
        })();
        return () => {
            active = false;
            if (workerRef.current) workerRef.current.terminate();
        };
    }, []);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [sizeInfo, setSizeInfo] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const processFile = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setErrorMsg('Please upload an image file (JPG, PNG, WEBP).');
            setStatus('error');
            return;
        }

        const originalKB = (file.size / 1024).toFixed(0);
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        setStatus('compressing');
        setErrorMsg('');
        setAnalyzing(true);

        try {
            // Kick off OCR in the background (Client-side)
            const ocrPromise = (async () => {
                try {
                    const worker = workerRef.current || await createWorker('eng');
                    const { data: { text } } = await worker.recognize(file);
                    const dobRegex = /(?:DOB|Birth|Birth\/DOB)[:\s]+(\d{2}\/\d{2}\/\d{4})/i;
                    const match = text.match(dobRegex);
                    if (match) {
                        const [d, m, y] = match[1].split('/');
                        return `${y}-${m}-${d}`;
                    }
                    const yearRegex = /(?:Year of Birth|Birth Year)[:\s]+(\d{4})/i;
                    const yearMatch = text.match(yearRegex);
                    if (yearMatch) return `${yearMatch[1]}-01-01`;
                    return null;
                } catch (e) {
                    console.error('OCR Background Error:', e);
                    return null;
                }
            })();

            const compressed = await compressImage(file);
            const compressedKB = (compressed.size / 1024).toFixed(0);
            setSizeInfo(`${originalKB}KB → ${compressedKB}KB`);

            const compressedFile = new File([compressed], 'id-document.jpg', { type: 'image/jpeg' });

            setStatus('uploading');
            const formData = new FormData();
            formData.append('file', compressedFile);
            formData.append('guestPhone', guestPhone || 'unknown');

            const uploadPromise = fetch('/api/upload-id', { method: 'POST', body: formData });

            // Wait for both upload and OCR
            const [uploadRes, extractedDob] = await Promise.all([uploadPromise, ocrPromise]);
            const data = await uploadRes.json();

            if (!uploadRes.ok) throw new Error(data.error || 'Upload failed');

            setUploadedUrl(data.url);
            setStatus('success');
            setAnalyzing(false);
            onUploadComplete(data.url, extractedDob || undefined);
        } catch (err: any) {
            setErrorMsg(err.message);
            setStatus('error');
            setAnalyzing(false);
        }
    }, [guestPhone, onUploadComplete]);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const reset = () => {
        setStatus('idle');
        setUploadedUrl(null);
        setPreviewUrl(null);
        setErrorMsg('');
        setSizeInfo('');
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div className="mt-1">
            {status === 'success' && uploadedUrl ? (
                <div className="flex items-center gap-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    {previewUrl && (
                        <img src={previewUrl} alt="Uploaded ID" className="w-16 h-12 object-cover rounded-lg border border-emerald-300 shadow-sm" />
                    )}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                            <CheckCircle2 className="w-4 h-4" /> ID Uploaded Successfully
                        </div>
                        <p className="text-xs text-emerald-600 mt-0.5">Compressed & stored: {sizeInfo}</p>
                    </div>
                    <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-700 underline">Replace</button>
                </div>
            ) : (
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                        "relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200",
                        isDragging ? "border-teal-500 bg-teal-50 scale-[1.01]" : "border-slate-300 bg-slate-50 hover:border-teal-400 hover:bg-slate-100",
                        (status === 'compressing' || status === 'uploading') && "pointer-events-none opacity-80"
                    )}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileInput}
                    />

                    {status === 'compressing' && (
                        <div className="flex flex-col items-center gap-2 text-blue-600">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="text-sm font-medium">Compressing image...</span>
                        </div>
                    )}

                    {status === 'uploading' && (
                        <div className="flex flex-col items-center gap-2 text-teal-600">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="text-sm font-medium">Uploading to secure cloud...</span>
                            <span className="text-xs text-slate-500">{sizeInfo}</span>
                            {analyzing && <span className="text-[10px] text-teal-500 animate-pulse flex items-center gap-1.5 mt-1 border border-teal-200 bg-teal-50 px-2 py-0.5 rounded-full"><ScanSearch className="w-3 h-3" /> Analyzing Document Identity...</span>}
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center gap-2 text-red-600">
                            <XCircle className="w-8 h-8" />
                            <span className="text-sm font-medium">{errorMsg}</span>
                            <span className="text-xs text-slate-500 underline">Click to try again</span>
                        </div>
                    )}

                    {status === 'idle' && (
                        <>
                            {isDragging ? (
                                <div className="flex flex-col items-center gap-2 text-teal-600">
                                    <ImageIcon className="w-10 h-10" />
                                    <span className="text-sm font-semibold">Drop it here!</span>
                                </div>
                            ) : (
                                <>
                                    <div className="p-3 bg-slate-200 rounded-full text-slate-500">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-slate-700">Drag & drop ID document here</p>
                                        <p className="text-xs text-slate-500 mt-1">or click to browse · JPG, PNG · Auto-compressed before upload</p>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
