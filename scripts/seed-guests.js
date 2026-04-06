
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Try both possible locations
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sampleGuests = [
    {
        name: 'Rajesh Kumar',
        phone: '9876543210',
        email: 'rajesh.k@gmail.com',
        address: 'MG Road, Bangalore, Karnataka',
        preferences: 'High floor, Non-smoking'
    },
    {
        name: 'Priya Sharma',
        phone: '9123456780',
        email: 'priya.s@outlook.com',
        address: 'Hitech City, Hyderabad, Telangana',
        preferences: 'Early check-in requested'
    },
    {
        name: 'Amit Patel',
        phone: '9988776655',
        email: 'amit.patel@yahoo.com',
        address: 'Navrangpura, Ahmedabad, Gujarat',
        preferences: 'Vegetarian meals only'
    },
    {
        name: 'Sneha Reddy',
        phone: '9848012345',
        email: 'sneha.reddy@gmail.com',
        address: 'Banjara Hills, Hyderabad, Telangana',
        preferences: 'Extra towels requested'
    },
    {
        name: 'Vikram Singh',
        phone: '9810054321',
        email: 'vikram.s@hotmail.com',
        address: 'DLF Phase 3, Gurgaon, Haryana',
        preferences: 'Near elevator'
    }
];

async function seedGuests() {
    console.log('Seeding sample guests...');

    for (const guest of sampleGuests) {
        const { data, error } = await supabase
            .from('guests')
            .upsert(guest, { onConflict: 'phone' })
            .select();

        if (error) {
            console.error(`Error seeding guest ${guest.name}:`, error.message);
        } else {
            console.log(`Successfully seeded guest: ${guest.name}`);
        }
    }
}

seedGuests();
