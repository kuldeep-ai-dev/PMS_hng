import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const imageMap = {
    'Crispy Garlic Bread': 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?q=80&w=1000',
    'Spicy Chicken Wings': 'https://images.unsplash.com/photo-1567620822723-535bd9c882ba?q=80&w=1000',
    'Paneer Tikka': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?q=80&w=1000',
    'Vegetable Spring Rolls': 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000',
    'Classic Bruschetta': 'https://images.unsplash.com/photo-1572656631137-7935297eff55?q=80&w=1000',
    'Butter Chicken Masala': 'https://images.unsplash.com/photo-1603894584202-9332617f4987?q=80&w=1000',
    'Dal Makhani': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=1000',
    'Mutton Rogan Josh': 'https://images.unsplash.com/photo-1589302168068-1c4b9cd1d4de?q=80&w=1000',
    'Paneer Butter Masala': 'https://images.unsplash.com/photo-1631233868012-3231267a1793?q=80&w=1000',
    'Hydrabadi Veg Biryani': 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?q=80&w=1000',
    'Gulab Jamun': 'https://images.unsplash.com/photo-1589119908199-4d872f2f703e?q=80&w=1000',
    'New York Cheesecake': 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?q=80&w=1000',
    'Mango Kulfi': 'https://images.unsplash.com/photo-1590159357421-2e65664426e2?q=80&w=1000',
    'Brownie with Ice Cream': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?q=80&w=1000',
    'Fresh Lime Soda': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=1000',
    'Iced Peach Tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=1000',
    'Classic Cold Coffee': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=1000',
    'Watermelon Mojito': 'https://images.unsplash.com/photo-1544145945-f904253db0ad?q=80&w=1000',
    'Virgin Piña Colada': 'https://images.unsplash.com/photo-1517959104021-9538a7c20af0?q=80&w=1000',
    'Chocolate Lava Cake': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=1000'
};

async function updateImages() {
    console.log('Fetching menu items...');
    const { data: items, error: fetchError } = await supabase
        .from('restaurant_menu_items')
        .select('id, name');

    if (fetchError) {
        console.error('Error fetching items:', fetchError);
        return;
    }

    console.log(`Found ${items.length} items. Updating...`);

    for (const item of items) {
        const imageUrl = imageMap[item.name];
        if (imageUrl) {
            console.log(`Updating ${item.name}...`);
            const { error: updateError } = await supabase
                .from('restaurant_menu_items')
                .update({ image_url: imageUrl })
                .eq('id', item.id);

            if (updateError) {
                console.error(`Error updating ${item.name}:`, updateError);
            }
        } else {
            console.log(`No image mapped for ${item.name}`);
        }
    }

    console.log('Update complete!');
}

updateImages();
