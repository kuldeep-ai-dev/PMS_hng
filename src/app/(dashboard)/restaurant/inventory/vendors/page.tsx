'use client';

import { useState, useEffect } from 'react';
import {
    Users,
    Plus,
    Search,
    ArrowLeft,
    Phone,
    Mail,
    MapPin,
    User,
    ChevronRight,
    Building2,
    Briefcase
} from 'lucide-react';
import Link from 'next/link';
import { getInventoryVendors, addInventoryVendor } from '../actions';
import { toast } from 'sonner';

export default function VendorManagementPage() {
    const [loading, setLoading] = useState(true);
    const [vendors, setVendors] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [newVendor, setNewVendor] = useState({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        setMounted(true);
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await getInventoryVendors();
            setVendors(data);
        } catch (error) {
            toast.error('Failed to load vendors');
        } finally {
            setLoading(false);
        }
    };

    const handleAddVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addInventoryVendor(newVendor);
            toast.success('Vendor added successfully');
            setIsAddModalOpen(false);
            setNewVendor({ name: '', contact_person: '', email: '', phone: '', address: '' });
            loadData();
        } catch (error) {
            toast.error('Failed to add vendor');
        }
    };

    const filteredVendors = vendors.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading || !mounted) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
            {/* Nav Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/restaurant/inventory" className="p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 leading-tight">Vendor Directory</h1>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mt-1">Manage Central Kitchen Suppliers</p>
                    </div>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    ADD NEW SUPPLIER
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Search vendors by company name or contact person..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                    />
                </div>
            </div>

            {/* Vendor Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map((vendor) => (
                    <div key={vendor.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden group">
                        <div className="p-8">
                            <div className="flex items-start justify-between mb-6">
                                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                                    <Building2 className="w-7 h-7" />
                                </div>
                                <span className="bg-slate-50 text-slate-400 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                                    Active Vendor
                                </span>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">{vendor.name}</h3>
                            <div className="flex items-center gap-2 text-slate-400 mb-6">
                                <User className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">{vendor.contact_person || 'N/A'}</span>
                            </div>

                            <div className="space-y-3 pt-6 border-t border-slate-50">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                    <span className="text-xs font-bold">{vendor.phone || 'No phone'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                    <span className="text-xs font-bold truncate max-w-[200px]">{vendor.email || 'No email'}</span>
                                </div>
                                <div className="flex items-start gap-3 text-slate-600">
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center mt-0.5">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                    <span className="text-xs font-medium leading-relaxed">{vendor.address || 'No address provided'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-4 bg-slate-50/50 flex items-center justify-between group-hover:bg-orange-50 transition-colors">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-orange-600">View Statement</span>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-600" />
                        </div>
                    </div>
                ))}

                {filteredVendors.length === 0 && (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <Users className="w-10 h-10 text-slate-200" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900">No Vendors Found</h3>
                        <p className="text-slate-400 text-sm max-w-[280px] mt-2 font-medium">Add your suppliers to start Raising Purchase Orders.</p>
                    </div>
                )}
            </div>

            {/* Add Vendor Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Register Vendor</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors font-bold text-sm">CLOSE</button>
                        </div>

                        <form onSubmit={handleAddVendor} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newVendor.name}
                                    onChange={e => setNewVendor({ ...newVendor, name: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                                    placeholder="e.g. Fresh Garden Supplies Ltd"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Person</label>
                                    <input
                                        type="text"
                                        value={newVendor.contact_person}
                                        onChange={e => setNewVendor({ ...newVendor, contact_person: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={newVendor.phone}
                                        onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                                        placeholder="+91 999 888 7777"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                <input
                                    type="email"
                                    value={newVendor.email}
                                    onChange={e => setNewVendor({ ...newVendor, email: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                                    placeholder="orders@freshgarden.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
                                <textarea
                                    value={newVendor.address}
                                    onChange={e => setNewVendor({ ...newVendor, address: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500/20 transition-all outline-none h-24 resize-none"
                                    placeholder="123 Market Street, New Delhi"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-5 bg-orange-600 text-white rounded-[20px] font-black text-sm shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all"
                            >
                                REGISTER VENDOR & ENABLE POs
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
