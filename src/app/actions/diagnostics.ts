"use server";

import { createClient } from '@/utils/supabase/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import nodemailer from 'nodemailer';

export type DiagnosticResult = {
    service: string;
    status: 'healthy' | 'unhealthy' | 'warning';
    message: string;
    latency?: number;
};

export async function runFullDiagnostic(): Promise<DiagnosticResult[]> {
    const startTime = Date.now();
    const results: DiagnosticResult[] = [];

    // 1. Check Supabase Connectivity
    try {
        const supabase = await createClient();
        const start = Date.now();
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) throw error;
        results.push({
            service: 'Supabase Database',
            status: 'healthy',
            message: 'Connection established successfully.',
            latency: Date.now() - start
        });
    } catch (err: any) {
        results.push({
            service: 'Supabase Database',
            status: 'unhealthy',
            message: `Database error: ${err.message || 'Unknown error'}`
        });
    }

    // 2. Check Cloudflare R2
    try {
        const start = Date.now();
        if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
            throw new Error('R2 Credentials missing in environment.');
        }

        const R2 = new S3Client({
            region: 'auto',
            endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID!,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
            },
        });

        await R2.send(new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME!,
            MaxKeys: 1
        }));

        results.push({
            service: 'Cloudflare R2',
            status: 'healthy',
            message: 'Storage bucket is reachable and authenticated.',
            latency: Date.now() - start
        });
    } catch (err: any) {
        results.push({
            service: 'Cloudflare R2',
            status: 'unhealthy',
            message: `Storage error: ${err.message || 'Check credentials/bucket'}`
        });
    }

    // 3. Check WhatsApp Business API
    try {
        const start = Date.now();
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

        if (!accessToken || !phoneNumberId) {
            throw new Error('WhatsApp configuration (Token/ID) is missing in environment.');
        }

        const response = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}?access_token=${accessToken}`);

        if (response.ok || response.status === 400) {
            results.push({
                service: 'WhatsApp API',
                status: response.ok ? 'healthy' : 'warning',
                message: response.ok ? 'Meta Graph API responded.' : 'API reachable but check Token permissions.',
                latency: Date.now() - start
            });
        } else {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error?.message || `Status ${response.status}`);
        }
    } catch (err: any) {
        results.push({
            service: 'WhatsApp API',
            status: 'unhealthy',
            message: `WhatsApp error: ${err.message || 'Connection failed'}`
        });
    }

    // 4. Check SMTP (Email)
    try {
        const start = Date.now();
        const transporter = nodemailer.createTransport({
            host: 'smtp.hostinger.com',
            port: 465,
            secure: true,
            auth: {
                user: 'bookings@hotelnewganga.in',
                pass: 'HNG@mail26'
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        await transporter.verify();
        results.push({
            service: 'Email Service',
            status: 'healthy',
            message: 'SMTP server verified and ready.',
            latency: Date.now() - start
        });
    } catch (err: any) {
        results.push({
            service: 'Email Service',
            status: 'unhealthy',
            message: `SMTP error: ${err.message || 'Auth failed'}`
        });
    }

    return results;
}
