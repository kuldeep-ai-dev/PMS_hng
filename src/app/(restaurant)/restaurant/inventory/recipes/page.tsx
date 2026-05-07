'use client';

import { useState, useEffect } from 'react';
import {
    UtensilsCrossed,
    Plus,
    Search,
    ArrowLeft,
    Trash2,
    Save,
    ChevronRight,
    Beaker,
    ListFilter,
    CheckCircle2,
    ChefHat
} from 'lucide-react';
import Link from 'next/link';
import {
    getInventoryItems,
    getRestaurantMenuItems,
    getRecipesForMenuItem,
    updateRecipe
} from '../actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function RecipeManagementPage() {
    const [loading, setLoading] = useState(true);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
    const [currentRecipe, setCurrentRecipe] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [materialSearchTerm, setMaterialSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [menus, items] = await Promise.all([
                getRestaurantMenuItems(),
                getInventoryItems()
            ]);
            setMenuItems(menus);
            setInventoryItems(items);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectMenuItem = async (item: any) => {
        setSelectedMenuItem(item);
        try {
            const recipeData = await getRecipesForMenuItem(item.id);
            setCurrentRecipe(recipeData.map((r: any) => ({
                inventory_item_id: r.inventory_item_id,
                quantity_required: r.quantity_required,
                name: r.item?.name,
                unit: r.item?.unit
            })));
        } catch (error) {
            toast.error('Failed to load recipe');
        }
    };

    const addIngredient = (invItem: any) => {
        if (currentRecipe.find(r => r.inventory_item_id === invItem.id)) {
            return toast.error('Ingredient already added');
        }
        setCurrentRecipe([...currentRecipe, {
            inventory_item_id: invItem.id,
            quantity_required: 1,
            name: invItem.name,
            unit: invItem.unit
        }]);
    };

    const removeIngredient = (id: string) => {
        setCurrentRecipe(currentRecipe.filter(r => r.inventory_item_id !== id));
    };

    const updateQuantity = (id: string, qty: number) => {
        setCurrentRecipe(currentRecipe.map(r =>
            r.inventory_item_id === id ? { ...r, quantity_required: qty } : r
        ));
    };

    const handleSaveRecipe = async () => {
        if (!selectedMenuItem) return;
        setIsSaving(true);
        try {
            await updateRecipe(selectedMenuItem.id, currentRecipe.map(r => ({
                inventory_item_id: r.inventory_item_id,
                quantity_required: r.quantity_required
            })));
            toast.success('Recipe saved successfully');
        } catch (error) {
            toast.error('Failed to save recipe');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredMenuItems = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group items by category for cleaner organization (matching Menu Editor)
    const groupedMenuItems = filteredMenuItems.reduce((acc: any, item: any) => {
        const catName = item.category?.name || 'General';
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(item);
        return acc;
    }, {});

    // Sort categories by display_order if available
    const sortedCategories = Object.keys(groupedMenuItems).sort((a, b) => {
        const orderA = groupedMenuItems[a][0]?.category?.display_order ?? 999;
        const orderB = groupedMenuItems[b][0]?.category?.display_order ?? 999;
        return orderA - orderB;
    });

    if (loading || !mounted) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/restaurant/inventory" className="p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 leading-tight">Recipe Management</h1>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-1">Map Menu Items to Raw Ingredients</p>
                    </div>
                </div>

                {selectedMenuItem && (
                    <button
                        onClick={handleSaveRecipe}
                        disabled={isSaving}
                        className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        SAVE RECIPE FOR {selectedMenuItem.name.toUpperCase()}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* menu Item Sidebar */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col h-[700px]">
                        <div className="p-6 border-b border-slate-50">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    type="text"
                                    placeholder="Search dishes..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 custom-scrollbar">
                            {sortedCategories.map((catName) => (
                                <div key={catName} className="space-y-2">
                                    <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 sticky top-0 bg-white py-2 z-10">
                                        {catName}
                                    </h4>
                                    <div className="space-y-1">
                                        {groupedMenuItems[catName].map((item: any) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleSelectMenuItem(item)}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all group",
                                                    selectedMenuItem?.id === item.id
                                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                                                        : "hover:bg-slate-50 text-slate-600"
                                                )}
                                            >
                                                <div className="flex flex-col items-start text-left">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black tracking-tight">{item.name}</span>
                                                        {!item.is_available && (
                                                            <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full font-bold uppercase">Hidden</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight className={cn(
                                                    "w-4 h-4 transition-transform group-hover:translate-x-1",
                                                    selectedMenuItem?.id === item.id ? "text-white" : "text-slate-300"
                                                )} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {filteredMenuItems.length === 0 && (
                                <div className="py-20 text-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No dishes found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recipe Builder */}
                <div className="lg:col-span-8">
                    {!selectedMenuItem ? (
                        <div className="h-full min-h-[500px] bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                                <ChefHat className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Select a Dish to Edit Recipe</h3>
                            <p className="text-slate-400 text-sm max-w-[300px] mt-2 font-medium">Choose a dish from the sidebar to link its required raw materials and quantities.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            {/* Selected Header */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center">
                                        <Beaker className="w-8 h-8 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedMenuItem.name}</h2>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Recipe Configuration</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-indigo-600 tracking-tighter">
                                        {currentRecipe.length}
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingredients Linked</p>
                                </div>
                            </div>

                            {/* Ingredient Selection and Recipe List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Ingredients Picker */}
                                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col h-[500px]">
                                    <div className="p-6 bg-slate-50/50 border-b border-slate-100 space-y-4">
                                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <ListFilter className="w-4 h-4 text-indigo-500" />
                                            Available Materials
                                        </h3>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                            <input
                                                type="text"
                                                placeholder="Search materials..."
                                                value={materialSearchTerm}
                                                className="w-full pl-9 pr-4 py-2 bg-white border-none rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                                onChange={(e) => setMaterialSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                        {inventoryItems
                                            .filter(item => item.name.toLowerCase().includes(materialSearchTerm.toLowerCase()))
                                            .map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => addIngredient(item)}
                                                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 hover:scale-[1.02] transition-all rounded-2xl group"
                                                >
                                                    <div className="flex flex-col items-start">
                                                        <span className="text-sm font-black text-slate-900">{item.name}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{item.unit}</span>
                                                    </div>
                                                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                                                </button>
                                            ))}
                                    </div>
                                </div>

                                {/* Recipe Formula */}
                                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col h-[500px]">
                                    <div className="p-6 bg-emerald-50/30 border-b border-slate-100">
                                        <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <UtensilsCrossed className="w-4 h-4 text-emerald-500" />
                                            Recipe Formula
                                        </h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar max-h-[400px]">
                                        {currentRecipe.length > 0 ? (
                                            currentRecipe.map((ing) => (
                                                <div key={ing.inventory_item_id} className="p-4 bg-white border border-slate-100 rounded-2xl group animate-in zoom-in-95">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-sm font-black text-slate-900">{ing.name}</span>
                                                        <button
                                                            onClick={() => removeIngredient(ing.inventory_item_id)}
                                                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="number"
                                                            step="0.0001"
                                                            value={ing.quantity_required}
                                                            onChange={(e) => updateQuantity(ing.inventory_item_id, parseFloat(e.target.value))}
                                                            className="flex-1 px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500/10"
                                                        />
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[30px]">
                                                            {ing.unit}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 px-6 py-20">
                                                <Beaker className="w-10 h-10 text-slate-200 mb-4" />
                                                <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-tight">Add ingredients from the left list to build the recipe formula.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
