const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = `postgresql://postgres:PMS%40hng12345q%23@db.qrddpyqoxhsqurkkusdd.supabase.co:5432/postgres`;

const client = new Client({
    connectionString: connectionString,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');
        const sql = `
            CREATE OR REPLACE FUNCTION get_active_booking_details(p_room_id UUID)
            RETURNS TABLE (booking_id UUID, guest_name TEXT) 
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
                RETURN QUERY
                SELECT b.id, g.name
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                WHERE b.room_id = p_room_id 
                AND b.status IN ('Checked_In', 'Active')
                ORDER BY b.created_at DESC
                LIMIT 1;
            END;
            $$;
        `;
        await client.query(sql);
        console.log('RPC created successfully!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
