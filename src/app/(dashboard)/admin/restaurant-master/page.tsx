'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Save, Image as ImageIcon, UtensilsCrossed, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function RestaurantMasterPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settingsId, setSettingsId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        restaurant_name: '',
        tagline: '',
        logo_url: ''
    });

    useEffect(() => {
        fetchSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('restaurant_settings')
            .select('*')
            .limit(1)
            .single();

        if (data) {
            setSettingsId(data.id);
            setFormData({
                restaurant_name: data.restaurant_name || '',
                tagline: data.tagline || '',
                logo_url: data.logo_url || ''
            });
        }
        setLoading(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'image/svg+xml') {
                toast.error('Please upload an SVG file');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, logo_url: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (settingsId) {
                const { error } = await supabase
                    .from('restaurant_settings')
                    .update({
                        restaurant_name: formData.restaurant_name,
                        tagline: formData.tagline,
                        logo_url: formData.logo_url,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', settingsId);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('restaurant_settings')
                    .insert([{
                        restaurant_name: formData.restaurant_name,
                        tagline: formData.tagline,
                        logo_url: formData.logo_url
                    }]);

                if (error) throw error;
            }

            toast.success('Restaurant settings saved successfully');
            fetchSettings(); // refresh ID if newly inserted
        } catch (error: any) {
            toast.error(error.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center">
                    <UtensilsCrossed className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Restaurant Master</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Configure restaurant branding and QR ordering splash screen details.</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="p-8 space-y-8">

                    {/* Logo Preview Section */}
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="shrink-0 w-48 space-y-3">
                            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-slate-400" />
                                Brand Logo
                            </label>
                            <div className="w-32 h-32 rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                                {formData.logo_url && formData.logo_url.startsWith('data:image/svg+xml') ? (
                                    <img src={formData.logo_url} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                                ) : formData.logo_url ? (
                                    <img src={formData.logo_url} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <UtensilsCrossed className="w-8 h-8 text-slate-300" />
                                )}
                            </div>
                        </div>

                        <div className="flex-1 space-y-6 w-full">
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">Upload SVG Logo</label>
                                <input
                                    type="file"
                                    accept=".svg,image/svg+xml"
                                    onChange={handleImageUpload}
                                    className="w-full text-sm file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                />
                                <p className="text-xs text-slate-500 mt-2">Required: Upload a scalable vector graphics (.svg) file.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">Restaurant Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. The Grand Kitchen"
                                    value={formData.restaurant_name}
                                    onChange={(e) => setFormData({ ...formData, restaurant_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">Tagline (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Fine Dining & Culinary Excellence"
                                    value={formData.tagline}
                                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 px-8 py-5 flex justify-end border-t border-slate-100">
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? 'Saving Changes...' : 'Save Settings'}
                    </motion.button>
                </div>
            </form>
        </div>
    );
}
