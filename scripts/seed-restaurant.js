const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    try {
        console.log('🚀 Starting Database Seeding via Supabase API (Fresh Start)...');

        // 1. Clear existing data to avoid constraint issues
        console.log('🧹 Clearing existing restaurant data...');
        // We do this in reverse order of dependencies
        await supabase.from('restaurant_order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('restaurant_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('restaurant_menu_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('restaurant_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('restaurant_tables').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // 2. Insert Categories
        const categories = [
            { name: 'Appetizers', display_order: 0 },
            { name: 'Main Course', display_order: 1 },
            { name: 'Desserts', display_order: 2 },
            { name: 'Beverages', display_order: 3 }
        ];
        
        const { data: catData, error: catError } = await supabase
            .from('restaurant_categories')
            .insert(categories)
            .select();

        if (catError) throw catError;
        console.log('✅ Categories seeded');

        const getCatId = (name) => catData.find(c => c.name === name).id;

        // 3. Insert Menu Items (5 per category)
        const items = [
            // Appetizers
            { category_id: getCatId('Appetizers'), name: 'Crispy Garlic Bread', price: 150, description: 'Toasted baguette with herb butter and roasted garlic.', is_veg: true },
            { category_id: getCatId('Appetizers'), name: 'Spicy Chicken Wings', price: 350, description: 'Succulent wings tossed in our signature buffalo sauce.', is_veg: false },
            { category_id: getCatId('Appetizers'), name: 'Paneer Tikka', price: 280, description: 'Grilled cottage cheese cubes marinated in yogurt and spices.', is_veg: true },
            { category_id: getCatId('Appetizers'), name: 'Vegetable Spring Rolls', price: 220, description: 'Crispy rolls filled with seasoned shredded vegetables.', is_veg: true },
            { category_id: getCatId('Appetizers'), name: 'Classic Bruschetta', price: 180, description: 'Fresh tomatoes, basil, and garlic on toasted crostini.', is_veg: true },
            
            // Main Course
            { category_id: getCatId('Main Course'), name: 'Butter Chicken Masala', price: 450, description: 'Tender chicken in a rich, creamy tomato gravy.', is_veg: false },
            { category_id: getCatId('Main Course'), name: 'Dal Makhani', price: 320, description: 'Slow-cooked black lentils with cream and butter.', is_veg: true },
            { category_id: getCatId('Main Course'), name: 'Mutton Rogan Josh', price: 550, description: 'Traditional Kashmiri style mutton curry.', is_veg: false },
            { category_id: getCatId('Main Course'), name: 'Paneer Butter Masala', price: 380, description: 'Cottage cheese in a smooth and spicy tomato gravy.', is_veg: true },
            { category_id: getCatId('Main Course'), name: 'Hydrabadi Veg Biryani', price: 420, description: 'Fragrant basmati rice cooked with mixed vegetables and spices.', is_veg: true },
            
            // Desserts
            { category_id: getCatId('Desserts'), name: 'Gulab Jamun', price: 120, description: 'Two warm milk-solid dumplings in rose-scented syrup.', is_veg: true },
            { category_id: getCatId('Desserts'), name: 'Chocolate Lava Cake', price: 250, description: 'Decadent chocolate cake with a molten center.', is_veg: true },
            { category_id: getCatId('Desserts'), name: 'New York Cheesecake', price: 280, description: 'Classic creamy cheesecake with a graham cracker crust.', is_veg: true },
            { category_id: getCatId('Desserts'), name: 'Mango Kulfi', price: 150, description: 'Traditional Indian frozen dessert with fresh mango pulp.', is_veg: true },
            { category_id: getCatId('Desserts'), name: 'Brownie with Ice Cream', price: 220, description: 'Fudgy brownie served with a scoop of vanilla ice cream.', is_veg: true },
            
            // Beverages
            { category_id: getCatId('Beverages'), name: 'Fresh Lime Soda', price: 90, description: 'Refreshing lime juice with soda and mint.', is_veg: true },
            { category_id: getCatId('Beverages'), name: 'Iced Peach Tea', price: 140, description: 'Brewed black tea with sweet peach flavor.', is_veg: true },
            { category_id: getCatId('Beverages'), name: 'Classic Cold Coffee', price: 180, description: 'Creamy blended coffee topped with chocolate syrup.', is_veg: true },
            { category_id: getCatId('Beverages'), name: 'Watermelon Mojito', price: 180, description: 'Muddled watermelon, mint, and lime in soda.', is_veg: true },
            { category_id: getCatId('Beverages'), name: 'Virgin Piña Colada', price: 220, description: 'Blended pineapple juice and coconut cream.', is_veg: true },
        ];

        const { error: itemsError } = await supabase
            .from('restaurant_menu_items')
            .insert(items);

        if (itemsError) throw itemsError;
        console.log('✅ Menu items seeded');

        // 4. Insert 10 Tables
        const tables = [];
        for (let i = 1; i <= 10; i++) {
            tables.push({
                table_number: `Table ${i}`,
                capacity: i <= 4 ? 2 : 4,
                status: 'available'
            });
        }

        const { error: tablesError } = await supabase
            .from('restaurant_tables')
            .insert(tables);

        if (tablesError) throw tablesError;
        console.log('✅ Tables seeded');

        console.log('');
        console.log('🎉 Seeding completed successfully!');

    } catch (err) {
        console.error('❌ Seeding Error:', err.message || err);
    }
}

seed();
