'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// --- Categories ---
export async function getInventoryCategories() {
    const supabase = await createClient();
    const { data, error } = await supabase.from('inventory_categories').select('*').order('name');
    if (error) throw error;
    return data;
}

export async function addInventoryCategory(name: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from('inventory_categories').insert([{ name }]).select().single();
    if (error) throw error;
    revalidatePath('/restaurant/inventory');
    return data;
}

// --- Items ---
export async function getInventoryItems() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('inventory_items')
        .select('*, category:inventory_categories(name)')
        .order('name');
    if (error) throw error;
    return data;
}

export async function addInventoryItem(item: {
    name: string;
    unit: string;
    min_threshold: number;
    category_id: string;
    current_stock?: number;
}) {
    const supabase = await createClient();
    const { data, error } = await supabase.from('inventory_items').insert([item]).select().single();
    if (error) throw error;
    revalidatePath('/restaurant/inventory');
    return data;
}

export async function updateInventoryStock(id: string, newStock: number) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('inventory_items')
        .update({ current_stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    revalidatePath('/restaurant/inventory');
    return data;
}

// --- Vendors ---
export async function getInventoryVendors() {
    const supabase = await createClient();
    const { data, error } = await supabase.from('inventory_vendors').select('*').order('name');
    if (error) throw error;
    return data;
}

export async function addInventoryVendor(vendor: {
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
}) {
    const supabase = await createClient();
    const { data, error } = await supabase.from('inventory_vendors').insert([vendor]).select().single();
    if (error) throw error;
    revalidatePath('/restaurant/inventory/procurement');
    return data;
}

// --- Menu Items (for Recipes) ---
export async function getRestaurantMenuItems() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('restaurant_menu_items')
        .select('*, category:restaurant_categories(name, display_order)')
        .order('name');
    if (error) throw error;
    return data;
}

// --- Recipes ---
export async function getRecipesForMenuItem(menuItemId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('inventory_recipes')
        .select('*, item:inventory_items(name, unit)')
        .eq('menu_item_id', menuItemId);
    if (error) throw error;
    return data;
}

export async function updateRecipe(menuItemId: string, ingredients: { inventory_item_id: string; quantity_required: number }[]) {
    const supabase = await createClient();

    // Delete existing recipe items
    await supabase.from('inventory_recipes').delete().eq('menu_item_id', menuItemId);

    if (ingredients.length > 0) {
        const { error } = await supabase.from('inventory_recipes').insert(
            ingredients.map(ing => ({ ...ing, menu_item_id: menuItemId }))
        );
        if (error) throw error;
    }

}

// --- Procurement (PO & GRN) ---
export async function getPurchaseOrders() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('inventory_purchase_orders')
        .select('*, vendor:inventory_vendors(name), items:inventory_po_items(inventory_item_id, quantity, unit_price, item:inventory_items(name, unit))')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function createPurchaseOrder(po: { vendor_id: string; items: any[] }) {
    const supabase = await createClient();

    // 1. Insert PO
    const { data: poData, error: poError } = await supabase
        .from('inventory_purchase_orders')
        .insert([{ vendor_id: po.vendor_id, status: 'sent', total_amount: po.items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0) }])
        .select()
        .single();

    if (poError) throw poError;

    // 2. Insert PO Items
    const { error: itemsError } = await supabase
        .from('inventory_po_items')
        .insert(po.items.map(item => ({ ...item, po_id: poData.id })));

    if (itemsError) throw itemsError;

    revalidatePath('/restaurant/inventory/procurement');
    return poData;
}

export async function receivePurchaseOrder(poId: string) {
    const supabase = await createClient();

    // 1. Get PO items
    const { data: items, error: itemsError } = await supabase
        .from('inventory_po_items')
        .select('inventory_item_id, quantity')
        .eq('po_id', poId);

    if (itemsError) throw itemsError;

    // 2. Update stock for each item
    for (const item of items) {
        const { error: stockError } = await supabase.rpc('increment_inventory_stock', {
            item_id: item.inventory_item_id,
            amount: item.quantity
        });
        if (stockError) throw stockError;
    }

    // 3. Mark PO as received
    const { error: updateError } = await supabase
        .from('inventory_purchase_orders')
        .update({ status: 'received', received_at: new Date().toISOString() })
        .eq('id', poId);

    if (updateError) throw updateError;

    revalidatePath('/restaurant/inventory');
    revalidatePath('/restaurant/inventory/procurement');
}

// --- Wastage & Audits ---
export async function recordWastage(waste: { inventory_item_id: string; quantity: number; reason: string }) {
    const supabase = await createClient();

    // 1. Record wastage
    const { error: wasteError } = await supabase.from('inventory_wastage').insert([waste]);
    if (wasteError) throw wasteError;

    // 2. Deduct from stock
    const { error: stockError } = await supabase.rpc('deduct_inventory_stock', {
        item_id: waste.inventory_item_id,
        amount: waste.quantity
    });
    if (stockError) throw stockError;

    revalidatePath('/restaurant/inventory');
    revalidatePath('/restaurant/inventory/audit');
}

export async function getStockAudits() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('inventory_audits')
        .select('*, item:inventory_items(name, unit)')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function performStockAudit(audit: { item_id: string; actual_stock: number; remarks?: string }) {
    const supabase = await createClient();

    // 1. Get current theoretical stock
    const { data: item, error: itemError } = await supabase
        .from('inventory_items')
        .select('current_stock')
        .eq('id', audit.item_id)
        .single();

    if (itemError) throw itemError;

    // 2. Insert audit record
    const { error: auditError } = await supabase.from('inventory_audits').insert([{
        ...audit,
        opening_stock: item.current_stock
    }]);

    if (auditError) throw auditError;

    // 3. Reset item current_stock to actual_stock
    const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ current_stock: audit.actual_stock, updated_at: new Date().toISOString() })
        .eq('id', audit.item_id);

    if (updateError) throw updateError;

    revalidatePath('/restaurant/inventory');
    revalidatePath('/restaurant/inventory/audit');
}

// --- Smart Auto-Deduction ---
export async function deductInventoryForOrder(orderId: string) {
    const supabase = await createClient();

    // 1. Get all items in this order
    const { data: items, error: itemsError } = await supabase
        .from('restaurant_order_items')
        .select('menu_item_id, quantity')
        .eq('order_id', orderId);

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) return;

    // 2. For each item, find its recipe and deduct stock
    for (const item of items) {
        const { data: recipe, error: recipeError } = await supabase
            .from('inventory_recipes')
            .select('inventory_item_id, quantity_required')
            .eq('menu_item_id', item.menu_item_id);

        if (recipeError) continue;
        if (!recipe || recipe.length === 0) continue;

        for (const ingredient of recipe) {
            const totalDeduction = ingredient.quantity_required * item.quantity;

            // Deduct from stock using RPC
            await supabase.rpc('deduct_inventory_stock', {
                item_id: ingredient.inventory_item_id,
                amount: totalDeduction
            });
        }
    }

    revalidatePath('/restaurant/inventory');
}
