'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

// Helper to determine if R2 is configured
export async function checkR2Status() {
    const isLinked = !!process.env.R2_ACCESS_KEY_ID && !!process.env.R2_ACCOUNT_ID && !!process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_NAME || null;
    return { isLinked, bucket };
}

// 1. Full Database JSON Backup to R2
export async function createR2BackupAction() {
    const supabase = createAdminClient();
    
    // Check credentials
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
        return { success: false, error: 'Cloudflare R2 credentials are not fully configured in the environment variables.' };
    }

    try {
        // Tables to extract for a comprehensive backup
        const tables = [
            'hotel_settings', 'profiles', 'rooms', 'restaurant_tables',
            'restaurant_categories', 'restaurant_menu_items', 'companies',
            'guests', 'bookings', 'payments', 'extra_charges', 
            'restaurant_orders', 'restaurant_reservations', 'restaurant_order_items',
            'staff_attendance', 
        ];

        const backupData: Record<string, any> = {};

        // Fetch data from all tables (Resilient approach)
        for (const table of tables) {
            const { data, error } = await supabase.from(table).select('*').limit(10000);
            if (error) {
                console.warn(`[Backup] Skipping ${table} (Possibly missing):`, error.message);
                backupData[table] = []; // Placeholder for missing table
                continue;
            }
            backupData[table] = data || [];
        }

        const jsonPayload = JSON.stringify({
            timestamp: new Date().toISOString(),
            data: backupData
        }, null, 2);

        // Upload to Cloudflare R2
        const s3 = new S3Client({
            region: 'auto',
            endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
            },
        });

        const filename = `db_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

        await s3.send(
            new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: `backups/${filename}`,
                Body: Buffer.from(jsonPayload),
                ContentType: 'application/json',
            })
        );

        return { success: true, message: `Backup uploaded successfully to R2 bucket: ${process.env.R2_BUCKET_NAME}/${filename}`, filename };

    } catch (err: any) {
        console.error('Backup creation error:', err);
        return { success: false, error: err.message || 'An error occurred during backup generation' };
    }
}

// 2. Targeted Date Range Purge
export async function purgeDataByDateRangeAction(startDate: string, endDate: string) {
    const supabase = createAdminClient();
    try {
        console.log(`Purging data between ${startDate} and ${endDate}`);

        // Delete child relationships first
        await supabase.from('restaurant_order_items').delete().gte('created_at', startDate).lte('created_at', endDate);
        await supabase.from('restaurant_orders').delete().gte('created_at', startDate).lte('created_at', endDate);
        
        await supabase.from('extra_charges').delete().gte('created_at', startDate).lte('created_at', endDate);
        await supabase.from('payments').delete().gte('created_at', startDate).lte('created_at', endDate);
        
        await supabase.from('night_audit_logs').delete().gte('audit_date', startDate).lte('audit_date', endDate);
        await supabase.from('system_activity_logs').delete().gte('created_at', startDate).lte('created_at', endDate);
        
        await supabase.from('bookings').delete().gte('created_at', startDate).lte('created_at', endDate);
        
        // Wipe guests in that range
        await supabase.from('guests').delete().gte('created_at', startDate).lte('created_at', endDate);

        return { success: true, message: `Successfully purged transactional data between ${new Date(startDate).toLocaleDateString()} and ${new Date(endDate).toLocaleDateString()}.` };
    } catch (error: any) {
        console.error('Purge error:', error);
        return { success: false, error: error.message };
    }
}

// 3. Complete Factory Reset
export async function factoryResetSystemAction() {
    const supabase = createAdminClient();
    try {
        console.log('INITIATING FACTORY RESET...');
        
        // 1. Delete deeply nested dependencies
        await supabase.from('restaurant_order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('restaurant_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('restaurant_reservations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // 2. Financial records
        await supabase.from('extra_charges').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // 3. Operational records
        await supabase.from('system_activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('night_audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('staff_attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('lost_and_found_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // 4. Primary entities
        await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('guests').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        return { success: true, message: 'Factory reset complete! All transactional data has been securely obliterated. System configuration retained.' };
    } catch (error: any) {
        console.error('Factory Reset Error:', error);
        return { success: false, error: 'Failed to completely reset database. Reason: ' + error.message };
    }
}

// 4. Fetch Available Backups from R2
export async function fetchR2BackupsAction() {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
        return { success: false, error: 'Cloudflare R2 is not configured.' };
    }

    try {
        const s3 = new S3Client({
            region: 'auto',
            endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
            },
        });

        const data = await s3.send(
            new ListObjectsV2Command({
                Bucket: process.env.R2_BUCKET_NAME,
                Prefix: 'backups/',
            })
        );

        if (!data.Contents) return { success: true, backups: [] };

        const backups = data.Contents
            .filter(obj => obj.Key?.endsWith('.json'))
            .map(obj => ({
                key: obj.Key!,
                filename: obj.Key!.split('/').pop()!,
                lastModified: obj.LastModified?.toISOString() || '',
                sizeMB: obj.Size ? (obj.Size / 1024 / 1024).toFixed(3) : '0.000'
            }))
            .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

        return { success: true, backups };
    } catch (err: any) {
        console.error('Fetch backups error:', err);
        return { success: false, error: err.message };
    }
}

// 5. Restore Database from R2 Snapshot (The Re-Roll)
export async function restoreFromR2BackupAction(fileKey: string) {
    const supabase = createAdminClient();

    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
        return { success: false, error: 'Cloudflare R2 is not configured.' };
    }

    try {
        console.log(`[Disaster Recovery] Initiating re-roll from ${fileKey}`);
        const s3 = new S3Client({
            region: 'auto',
            endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
            },
        });

        // 1. Download constraints
        const response = await s3.send(
            new GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: fileKey,
            })
        );

        if (!response.Body) throw new Error("Empty backup payload.");
        
        const rawBody = await response.Body.transformToString();
        const snapshot = JSON.parse(rawBody);

        if (!snapshot.data) throw new Error("Invalid backup schema. 'data' object missing.");

        const backupData = snapshot.data;

        // 2. Perform a Factory Reset FIRST to destroy ghost records not in the backup
        // This ensures the live DB becomes a perfect 1-to-1 reflection of the backup
        console.log('[Disaster Recovery] Executing pre-restore wipe (Factory Reset)...');
        await factoryResetSystemAction();

        // 3. Strictly Ordered Insertion Matrix (Parents -> Children)
        const insertionOrder = [
            'hotel_settings', 
            'companies', 
            'profiles', 
            'rooms', 
            'restaurant_tables',
            'restaurant_categories', 
            'restaurant_menu_items', 
            'guests', 
            'bookings', 
            'payments', 
            'restaurant_orders', 
            'restaurant_order_items', 
            'restaurant_reservations',
            'extra_charges', 
            'staff_attendance',
            'system_activity_logs',
            'night_audit_logs'
        ];

        let totalRecordsRestored = 0;

        for (const table of insertionOrder) {
            const records = backupData[table];
            if (!records || !Array.isArray(records) || records.length === 0) continue;

            console.log(`[Disaster Recovery] Upserting ${records.length} records into ${table}...`);
            
            // Sanitize GENERATED columns that cannot be forcefully inserted
            if (table === 'restaurant_orders') {
                records.forEach((r) => { delete r.total; });
            }
            if (table === 'restaurant_order_items') {
                records.forEach((r) => { delete r.total_price; });
            }

            // Supabase allows bulk upsert arrays. The Admin Client bypasses RLS.
            const { error } = await supabase.from(table).upsert(records);
            
            if (error) {
                console.error(`[Disaster Recovery] Failed to restore table ${table}:`, error);
                throw new Error(`Restoration halted. Integrity violation on table ${table}: ${error.message}`);
            }

            totalRecordsRestored += records.length;
        }

        console.log(`[Disaster Recovery] SUCCEESS! Restored ${totalRecordsRestored} records from ${fileKey}.`);

        return { success: true, message: `System successfully rolled back! Restored ${totalRecordsRestored} records.` };
    } catch (err: any) {
        console.error('Restore Error:', err);
        return { success: false, error: err.message };
    }
}

