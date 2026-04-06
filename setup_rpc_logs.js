const { Client } = require('pg');

const connStr = 'postgresql://postgres.qrddpyqoxhsqurkkusdd:PMS%40hng12345q%23@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function setupLogRpc() {
    const client = new Client({ connectionString: connStr });
    await client.connect();
    console.log('Connected.');

    try {
        // We create a security definer function in the public schema that reads from auth.audit_log_entries
        // This allows our server action (which has the service_role key anyway, but this is simpler than forcing pg queries)
        // to just call supabaseAdmin.rpc('get_user_audit_logs', { p_user_id: '...' })
        await client.query(`
      CREATE OR REPLACE FUNCTION public.get_user_audit_logs(p_user_id UUID, p_limit INT DEFAULT 50)
      RETURNS TABLE (
        id UUID,
        payload JSONB,
        created_at TIMESTAMP WITH TIME ZONE,
        ip_address VARCHAR
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          l.id,
          l.payload,
          l.created_at,
          l.ip_address
        FROM auth.audit_log_entries l
        WHERE l.payload->>'actor_id' = p_user_id::text
           OR l.payload->>'user_id' = p_user_id::text
        ORDER BY l.created_at DESC
        LIMIT p_limit;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
        console.log('Successfully created get_user_audit_logs RPC function.');
    } catch (error) {
        console.error('Error creating RPC:', error.message);
    } finally {
        await client.end();
    }
}

setupLogRpc();
