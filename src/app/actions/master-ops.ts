'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getTodayIST } from '@/utils/date';
import { revalidatePath } from 'next/cache';

// ─── R2 Client Setup ────────────────────────────────────────────────────────
const R2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

// Tables priority for deletion (to avoid foreign key constraint issues)
const TRANSACTIONAL_TABLES = [
    'payments',
    'extra_charges',
    'restaurant_order_items',
    'restaurant_orders',
    'lost_and_found',
    'whatsapp_campaigns',
    'marketing_leads',
    'bookings',
    'guests',
    'companies',
    'room_blocks',
    'staff_attendance',
    'system_activity_logs',
    'marketing_campaigns'
];

/**
 * Creates a JSON snapshot of the entire database and uploads to R2.
 */
export async function backupDatabaseAction() {
    const supabase = createAdminClient();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folder = `db-backups/${timestamp}`;
    
    console.log(`[Backup] Starting full database snapshot in folder: ${folder}`);

    try {
        const backupData: Record<string, any> = {};
        
        // Fetch data from all transactional tables (Resilient approach)
        for (const table of TRANSACTIONAL_TABLES) {
            const { data, error } = await supabase.from(table).select('*').limit(10000);
            if (error) {
                console.warn(`[Backup] Skipping ${table} (Possibly missing or unreachable):`, error.message);
                backupData[table] = []; // Placeholder for missing table
                continue;
            }
            backupData[table] = data || [];
        }

        // Include settings
        const { data: settings } = await supabase.from('hotel_settings').select('*');
        backupData['settings'] = settings;

        const body = JSON.stringify(backupData, null, 2);
        const fileName = `${folder}/full_backup.json`;

        await R2.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: fileName,
            Body: body,
            ContentType: 'application/json'
        }));

        console.log(`[Backup] Successfully uploaded to R2: ${fileName}`);
        return { success: true, fileName };
    } catch (err: any) {
        console.error('[Backup] Critical failure:', err.message);
        throw err;
    }
}

/**
 * Lists all backups available in R2.
 */
export async function listBackupsAction() {
    try {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET,
            Prefix: 'db-backups/'
        });
        const response = await R2.send(command);
        
        // Group by folder and get the .json files
        const backups = response.Contents?.filter(c => c.Key?.endsWith('.json')).map(c => ({
            key: c.Key,
            size: c.Size,
            lastModified: c.LastModified
        })).sort((a, b) => (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0));

        return { success: true, backups: backups || [] };
    } catch (err: any) {
        console.error('[Backup] Failed to list backups:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Targeted deletion of data within a date range.
 */
export async function deleteDateRangeAction(startDate: string, endDate: string) {
    const supabase = createAdminClient();
    console.log(`[Cleaner] Wiping records from ${startDate} to ${endDate}`);

    try {
        // We delete in reverse order of dependencies
        for (const table of TRANSACTIONAL_TABLES) {
            // Determine date column (mostly created_at, but some have specific ones)
            let dateCol = 'created_at';
            if (table === 'night_audit_logs') dateCol = 'audit_date';
            if (table === 'restaurant_orders') dateCol = 'order_time';
            
            const query = supabase.from(table).delete().gte(dateCol, `${startDate}T00:00:00Z`).lte(dateCol, `${endDate}T23:59:59Z`);
            const { error, count } = await query;
            
            if (error) console.error(`[Cleaner] Error on ${table}:`, error.message);
            else console.log(`[Cleaner] Deleted ${count} from ${table}`);
        }

        revalidatePath('/', 'layout');
        return { success: true };
    } catch (err: any) {
        throw err;
    }
}

/**
 * RESETS THE ENTIRE SYSTEM: Wipes all transactional data.
 * PROTECTS: settings, profiles (accounts), and rooms (inventory structure).
 */
export async function resetSystemAction() {
    const supabase = createAdminClient();
    console.log('[System Reset] INITIATING FULL WIPE OF ALL TRANSACTIONAL TABLES');

    try {
        // Deleting everything in order
        for (const table of TRANSACTIONAL_TABLES) {
            const { error, count } = await supabase.from(table).delete().filter('id', 'neq', '00000000-0000-0000-0000-000000000000');
            if (error) console.error(`[Reset] Failed to wipe ${table}:`, error.message);
            else console.log(`[Reset] Formatted ${table} (${count} records)`);
        }

        console.log('[System Reset] Completed. System is now clean for new hotel onboarding.');
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (err: any) {
        throw err;
    }
}

/**
 * RESTORES a backup from R2 to the database.
 */
export async function restoreBackupAction(key: string) {
    const supabase = createAdminClient();
    console.log(`[Restore] Downloading and applying backup: ${key}`);

    try {
        const response = await R2.send(new GetObjectCommand({
            Bucket: BUCKET,
            Key: key
        }));

        const bodyString = await response.Body?.transformToString();
        if (!bodyString) throw new Error('Empty backup file');

        const backupData = JSON.parse(bodyString);

        // 1. First Wipe Current Data
        await resetSystemAction();

        // 2. Insert Data in Correct Order (Reverse of transactional tables for insertion)
        const insertionOrder = [...TRANSACTIONAL_TABLES].reverse();
        
        for (const table of insertionOrder) {
            const data = backupData[table];
            if (data && data.length > 0) {
                console.log(`[Restore] Injecting ${data.length} records into ${table}...`);
                const { error } = await supabase.from(table).insert(data);
                if (error) console.error(`[Restore] Error injecting into ${table}:`, error.message);
            }
        }

        revalidatePath('/', 'layout');
        return { success: true };
    } catch (err: any) {
        console.error('[Restore] Restoration failed:', err.message);
        throw err;
    }
}
