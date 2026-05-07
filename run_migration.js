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
        const sql = fs.readFileSync(path.join(__dirname, 'supabase/migrations/20260507200000_accountant_export.sql'), 'utf-8');
        await client.query(sql);
        console.log('Migration executed successfully!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
