'use client';

import { useState, useEffect } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import { Building2, Plus, Search, Mail, Phone, MapPin, Edit2, Trash2, ArrowRight, Loader2, X } from 'lucide-react';
import { getCompanies, createCompany, deleteCompany } from './actions';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);

    const [newCompany, setNewCompany] = useState({
        name: '',
        email: '',
        phone: '',
        gstin: '',
        address: '',
        city: '',
        state: '',
        contact_person: '',
        notes: ''
    });

    useEffect(() => {
        loadCompanies();
    }, []);

    const loadCompanies = async () => {
        try {
            const data = await getCompanies();
            setCompanies(data);
        } catch (error) {
            toast.error('Failed to load companies');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await createCompany(newCompany);
            toast.success('Company created successfully');
            setShowAddModal(false);
            setNewCompany({
                name: '', email: '', phone: '', gstin: '',
                address: '', city: '', state: '', contact_person: '', notes: ''
            });
            loadCompanies();
        } catch (error) {
            toast.error('Failed to create company');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;
        try {
            await deleteCompany(id);
            toast.success('Company deleted');
            loadCompanies();
        } catch (error) {
            toast.error('Failed to delete company');
        }
    };

    const filtered = companies.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-teal-600" />
                        Corporate Records
                    </h1>
                    <p className="text-slate-500 mt-1">Manage tied business entities and corporate accounts</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-all shadow-sm active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Add Company
                </button>
            </div>

            <BentoCard className="p-0 overflow-hidden border-slate-200/60 shadow-sm">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by company name, contact person, or GSTIN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium placeholder:text-slate-400"
                    />
                </div>

                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                        <p className="text-slate-500 text-sm font-medium">Fetching corporate data...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No company records found matching your search.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                    <th className="px-6 py-4">Company Details</th>
                                    <th className="px-6 py-4">Contact Information</th>
                                    <th className="px-6 py-4">Financials</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((company) => (
                                    <tr key={company.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{company.name}</div>
                                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1 capitalize">
                                                <MapPin className="w-3 h-3" />
                                                {company.city}, {company.state}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-sm font-medium text-slate-700">{company.contact_person || 'N/A'}</div>
                                            <div className="flex flex-col gap-1 mt-1 text-[11px] text-slate-500">
                                                <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {company.email || 'No email'}</span>
                                                <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {company.phone || 'No phone'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-sm font-bold text-slate-800 uppercase tracking-tight">{company.gstin || 'No GSTIN'}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">Corporate Account</div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    href={`/companies/${company.id}`}
                                                    className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                                                    title="View Profile"
                                                >
                                                    <ArrowRight className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(company.id, company.name)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </BentoCard>

            {/* Add Company Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Plus className="w-5 h-5 text-teal-600" />
                                New Corporate Entry
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-8 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Company Name *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Full Legal Name"
                                        value={newCompany.name}
                                        onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">GSTIN</label>
                                    <input
                                        type="text"
                                        placeholder="Tax Identification Number"
                                        value={newCompany.gstin}
                                        onChange={e => setNewCompany({ ...newCompany, gstin: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all uppercase"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Contact Person</label>
                                    <input
                                        type="text"
                                        placeholder="Liaison Name"
                                        value={newCompany.contact_person}
                                        onChange={e => setNewCompany({ ...newCompany, contact_person: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Phone</label>
                                    <input
                                        type="text"
                                        placeholder="Primary Contact"
                                        value={newCompany.phone}
                                        onChange={e => setNewCompany({ ...newCompany, phone: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Email</label>
                                    <input
                                        type="email"
                                        placeholder="Billing / Communication Email"
                                        value={newCompany.email}
                                        onChange={e => setNewCompany({ ...newCompany, email: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">City</label>
                                    <input
                                        type="text"
                                        placeholder="Location"
                                        value={newCompany.city}
                                        onChange={e => setNewCompany({ ...newCompany, city: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">State</label>
                                    <input
                                        type="text"
                                        placeholder="Region"
                                        value={newCompany.state}
                                        onChange={e => setNewCompany({ ...newCompany, state: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {saving ? 'Creating...' : 'Register Company'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
