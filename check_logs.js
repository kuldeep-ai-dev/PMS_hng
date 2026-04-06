const { Client } = require('pg');

const connStr = 'postgresql://postgres.qrddpyqoxhsqurkkusdd:PMS%40hng12345q%23@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function checkLogs() {
    const client = new Client({ connectionString: connStr });
    await client.connect();

    try {
        const { rows } = await client.query(`
      SELECT * FROM auth.audit_log_entries
      ORDER BY created_at DESC
      LIMIT 10;
    `);

        console.log(`Found ${rows.length} rows in audit_log_entries.`);
        if (rows.length > 0) {
            console.log('Sample payload[0]:', JSON.stringify(rows[0].payload, null, 2));
            console.log('Sample payload[1]:', JSON.stringify(rows[1]?.payload, null, 2));
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

checkLogs();
