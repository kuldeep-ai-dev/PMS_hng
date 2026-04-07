'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@/utils/supabase/server';
import puppeteer from 'puppeteer';
import { getSettings } from '@/app/(dashboard)/settings/actions';

// ─── R2 Client (reuses existing Cloudflare R2 config) ─────────────────────────
const R2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

// ─── WhatsApp Cloud API Config ────────────────────────────────────────────────
const WA_API_VERSION = 'v22.0';
// Moved constants into functions to ensure they pick up .env.local changes instantly.

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format phone number to WhatsApp-compatible international format (E.164).
 * Handles Indian numbers by default. Strips spaces, dashes, and leading 0.
 */
function formatPhoneForWhatsApp(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If already starts with country code (91 for India) and is 12 digits
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return cleaned;
    }

    // If it's a 10-digit Indian number
    if (cleaned.length === 10) {
        return `91${cleaned}`;
    }

    // If it starts with 0 (trunk prefix), strip it
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
        if (cleaned.length === 10) {
            return `91${cleaned}`;
        }
    }

    // Return as-is if it looks like it already has a country code
    return cleaned;
}

/**
 * Upload a PDF buffer to Cloudflare R2 and return the public URL.
 * Files are stored under `whatsapp-invoices/` with auto-cleanup in mind.
 */
async function uploadPdfToR2(pdfBuffer: Uint8Array, filename: string): Promise<string> {
    const key = `whatsapp-invoices/${filename}`;

    await R2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: Buffer.from(pdfBuffer),
        ContentType: 'application/pdf',
    }));

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    console.log('[WhatsApp] PDF uploaded to R2:', publicUrl);
    return publicUrl;
}

/**
 * Generate invoice PDF using Puppeteer (same logic as mail.ts).
 */
async function generateInvoicePDF(bookingId: string, isProvisional: boolean): Promise<Uint8Array> {
    const pdfToken = process.env.INTERNAL_PDF_TOKEN || '__geny_pms_internal_pdf_2026__';
    const params = new URLSearchParams({ _token: pdfToken });
    if (isProvisional) params.set('type', 'provisional');
    const url = `http://localhost:3000/print-bill/${bookingId}?${params.toString()}`;

    console.log('[WhatsApp] Generating PDF for:', url);
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();

        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        } catch (e) {
            console.warn('[WhatsApp] Localhost failed, trying 127.0.0.1...');
            const fallbackUrl = url.replace('localhost', '127.0.0.1');
            await page.goto(fallbackUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        }

        const rawPdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        await browser.close();
        console.log('[WhatsApp] Raw PDF generated successfully');

        // Apply Digital Signature if configured
        const { getSettings } = await import('@/app/(dashboard)/settings/actions');
        const settings = await getSettings();
        if (settings.digital_signature_pfx_base64) {
            console.log('[WhatsApp] Applying cryptographic digital signature to PDF...');
            const { signPdfDocument } = await import('@/utils/signPdf');
            const signedBuffer = await signPdfDocument(rawPdfBuffer, settings.digital_signature_pfx_base64, settings.digital_signature_password);
            return signedBuffer;
        }

        return rawPdfBuffer as unknown as Uint8Array;
    } catch (err: any) {
        if (browser) await browser.close();
        console.error('[WhatsApp] PDF Generation Error:', err.message);
        throw new Error(`PDF Generation failed: ${err.message}`);
    }
}

/**
 * Generate Restaurant Bill PDF using Puppeteer.
 */
async function generateRestaurantBillPDF(orderId: string): Promise<Uint8Array> {
    const pdfToken = process.env.INTERNAL_PDF_TOKEN || '__geny_pms_internal_pdf_2026__';
    const url = `http://localhost:3000/print-pos-bill/${orderId}?_token=${pdfToken}`;

    console.log('[WhatsApp] Generating Restaurant PDF for:', url);
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();

        // Emulate thermal printer width if needed, but the page already has 80mm CSS
        await page.setViewport({ width: 400, height: 800 });

        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        } catch (e) {
            console.warn('[WhatsApp] Localhost failed, trying 127.0.0.1...');
            const fallbackUrl = url.replace('localhost', '127.0.0.1');
            await page.goto(fallbackUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        }

        const rawPdfBuffer = await page.pdf({
            width: '80mm',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        await browser.close();
        return rawPdfBuffer as unknown as Uint8Array;
    } catch (err: any) {
        if (browser) await browser.close();
        console.error('[WhatsApp] Restaurant PDF Error:', err.message);
        throw new Error(`Restaurant PDF fail: ${err.message}`);
    }
}

// ─── Core WhatsApp API Call ───────────────────────────────────────────────────
// ... (lines 126-451 exist below, I'll use the proper replacement range)


// ─── Core WhatsApp API Call ───────────────────────────────────────────────────

/**
 * Send a WhatsApp template message via the Cloud API.
 */
async function sendWhatsAppTemplate({
    to,
    templateName,
    languageCode = 'en',
    headerDocUrl,
    headerDocFilename,
    bodyParams,
    buttonUrlSuffix,
}: {
    to: string;
    templateName: string;
    languageCode?: string;
    headerDocUrl?: string;
    headerDocFilename?: string;
    bodyParams: string[];
    buttonUrlSuffix?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';

    if (!phoneNumberId || !accessToken) {
        console.warn('[WhatsApp] Not configured. Missing Phone ID or Access Token.');
        return { success: false, error: 'WhatsApp not configured in .env.local' };
    }

    const components: any[] = [];

    // Document header component
    if (headerDocUrl) {
        components.push({
            type: 'header',
            parameters: [{
                type: 'document',
                document: {
                    link: headerDocUrl,
                    filename: headerDocFilename || 'Invoice.pdf'
                }
            }]
        });
    }

    // Body parameters
    if (bodyParams.length > 0) {
        components.push({
            type: 'body',
            parameters: bodyParams.map(text => ({ type: 'text', text }))
        });
    }

    // Button URL parameter (for dynamic URL buttons like "Rate Us")
    if (buttonUrlSuffix) {
        components.push({
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: buttonUrlSuffix }]
        });
    }

    const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
            name: templateName,
            language: { code: languageCode },
            components
        }
    };

    const apiUrl = `https://graph.facebook.com/${WA_API_VERSION}/${phoneNumberId}/messages`;

    try {
        console.log(`[WhatsApp] Sending template "${templateName}" to ${to} using ID ${phoneNumberId.substring(0, 4)}...`);
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('[WhatsApp] API Error:', JSON.stringify(data));
            return { success: false, error: data.error?.message || 'API request failed' };
        }

        const messageId = data.messages?.[0]?.id;
        console.log('[WhatsApp] Message sent successfully. ID:', messageId);
        return { success: true, messageId };
    } catch (err: any) {
        console.error('[WhatsApp] Network Error:', err.message);
        return { success: false, error: err.message };
    }
}

// ─── Public Actions ───────────────────────────────────────────────────────────

/**
 * Send booking confirmation WhatsApp with provisional invoice PDF.
 */
export async function sendBookingWhatsApp(bookingId: string) {
    try {
        const settings = await getSettings();
        if (!settings.whatsapp_enabled) {
            console.log('[WhatsApp] Disabled in settings. Skipping.');
            return { success: false, message: 'WhatsApp disabled' };
        }

        const supabase = await createClient();
        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`*, guests(*), rooms(*)`)
            .eq('id', bookingId)
            .single();

        if (error || !booking?.guests?.phone) {
            console.log('[WhatsApp] Skipping. No booking or guest phone for:', bookingId);
            return { success: false, message: 'No phone found' };
        }

        const phone = formatPhoneForWhatsApp(booking.guests.phone);
        const guestName = booking.guests.name.split(' ')[0];
        const checkIn = new Date(booking.check_in_date).toLocaleDateString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        });
        const checkOut = new Date(booking.check_out_date).toLocaleDateString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        });
        const room = `${booking.rooms.number} (${booking.rooms.type})`;
        const guests = `${booking.adults} Adults${booking.children > 0 ? `, ${booking.children} Children` : ''}`;

        // Generate & upload PDF
        const pdfBuffer = await generateInvoicePDF(bookingId, true);
        const pdfFilename = `Provisional_${bookingId.split('-')[0].toUpperCase()}_${Date.now()}.pdf`;
        const pdfUrl = await uploadPdfToR2(pdfBuffer, pdfFilename);

        const result = await sendWhatsAppTemplate({
            to: phone,
            templateName: settings.whatsapp_booking_template || process.env.WHATSAPP_BOOKING_TEMPLATE || 'booking_confirmation',
            headerDocUrl: pdfUrl,
            headerDocFilename: `Provisional_Receipt_${bookingId.split('-')[0].toUpperCase()}.pdf`,
            bodyParams: [
                guestName,
                settings.hotel_name,
                checkIn,
                checkOut,
                room,
                guests,
                settings.phone || ''
            ]
        });

        console.log('[WhatsApp] Booking confirmation result:', result);

        // Save tracking record if message was sent successfully
        if (result.success && result.messageId) {
            try {
                await supabase.from('whatsapp_analytics').insert({
                    wamid: result.messageId,
                    booking_id: bookingId,
                    status: 'sent',
                    template_type: 'check_in',
                    guest_name: booking.guests.name,
                    guest_phone: phone,
                    sent_at: new Date().toISOString(),
                });
                console.log('[WhatsApp] Analytics record saved for wamid:', result.messageId);
            } catch (analyticsErr: any) {
                console.warn('[WhatsApp] Failed to save analytics record:', analyticsErr.message);
            }
        }

        return result;
    } catch (err: any) {
        console.error('[WhatsApp] Error in sendBookingWhatsApp:', err.message);
        return { success: false, message: err.message };
    }
}

/**
 * Send checkout thank-you WhatsApp with final tax invoice PDF.
 */
export async function sendCheckoutWhatsApp(bookingId: string) {
    try {
        const settings = await getSettings();
        if (!settings.whatsapp_enabled) {
            console.log('[WhatsApp] Disabled in settings. Skipping.');
            return { success: false, message: 'WhatsApp disabled' };
        }

        const supabase = await createClient();
        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`*, guests(*), rooms(*)`)
            .eq('id', bookingId)
            .single();

        if (error || !booking?.guests?.phone) {
            console.log('[WhatsApp] Skipping. No booking or guest phone for:', bookingId);
            return { success: false, message: 'No phone found' };
        }

        const phone = formatPhoneForWhatsApp(booking.guests.phone);
        const guestName = booking.guests.name.split(' ')[0];
        const checkIn = new Date(booking.check_in_date).toLocaleDateString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        });
        const checkOut = new Date(booking.check_out_date).toLocaleDateString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        });
        const room = `${booking.rooms.number} (${booking.rooms.type})`;

        // Generate & upload PDF
        const pdfBuffer = await generateInvoicePDF(bookingId, false);
        const pdfFilename = `Invoice_${bookingId.split('-')[0].toUpperCase()}_${Date.now()}.pdf`;
        const pdfUrl = await uploadPdfToR2(pdfBuffer, pdfFilename);

        // Generate a tracking ID for the "Rate Us" button URL
        // The full button URL will be: base_url_from_template + trackingId
        const trackingId = crypto.randomUUID().split('-')[0];

        const result = await sendWhatsAppTemplate({
            to: phone,
            templateName: settings.whatsapp_checkout_template || process.env.WHATSAPP_CHECKOUT_TEMPLATE || 'checkout_thankyou',
            headerDocUrl: pdfUrl,
            headerDocFilename: `Tax_Invoice_${bookingId.split('-')[0].toUpperCase()}.pdf`,
            bodyParams: [
                guestName,
                settings.hotel_name,
                checkIn,
                checkOut,
                room
            ],
            buttonUrlSuffix: trackingId,
        });

        console.log('[WhatsApp] Checkout WhatsApp result:', result);

        // Save tracking record if message was sent successfully
        if (result.success && result.messageId) {
            try {
                await supabase.from('whatsapp_analytics').insert({
                    wamid: result.messageId,
                    booking_id: bookingId,
                    status: 'sent',
                    template_type: 'check_out',
                    guest_name: booking.guests.name,
                    guest_phone: phone,
                    destination_url: settings.google_review_url || null,
                    tracking_id: trackingId,
                    sent_at: new Date().toISOString(),
                });
                console.log('[WhatsApp] Analytics record saved for wamid:', result.messageId);
            } catch (analyticsErr: any) {
                console.warn('[WhatsApp] Failed to save analytics record:', analyticsErr.message);
            }
        }

        return result;
    } catch (err: any) {
        console.error('[WhatsApp] Error in sendCheckoutWhatsApp:', err.message);
        return { success: false, message: err.message };
    }
}

/**
 * Send a test WhatsApp message. Used from the Settings page.
 * Sends to the provided phone number using the booking template with sample data.
 */
export async function testSendWhatsApp(phoneNumber: string) {
    try {
        const settings = await getSettings();
        const phone = formatPhoneForWhatsApp(phoneNumber);

        const result = await sendWhatsAppTemplate({
            to: phone,
            templateName: settings.whatsapp_booking_template || process.env.WHATSAPP_BOOKING_TEMPLATE || 'booking_confirmation',
            // Use a reliable public PDF for testing. Settings logo might be a data: URI which Meta rejects.
            headerDocUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            headerDocFilename: 'Test_Invoice.pdf',
            bodyParams: [
                'Test Guest',
                settings.hotel_name,
                'Mon, 07 Apr 2026',
                'Wed, 09 Apr 2026',
                '101 (Deluxe)',
                '2 Adults',
                settings.phone || ''
            ]
        });

        // Save analytics record for test messages too
        if (result.success && result.messageId) {
            try {
                const supabase = await createClient();
                await supabase.from('whatsapp_analytics').insert({
                    wamid: result.messageId,
                    booking_id: null,
                    status: 'sent',
                    template_type: 'check_in',
                    guest_name: 'Test Guest',
                    guest_phone: phone,
                    sent_at: new Date().toISOString(),
                });
                console.log('[WhatsApp] Test analytics record saved for wamid:', result.messageId);
            } catch (analyticsErr: any) {
                console.warn('[WhatsApp] Failed to save test analytics:', analyticsErr.message);
            }
        }

        return result;
    } catch (err: any) {
        console.error('[WhatsApp] Error in testSendWhatsApp:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Send restaurant order thank-you WhatsApp with bill PDF and rating link.
 */
export async function sendRestaurantOrderWhatsApp(orderId: string) {
    try {
        const settings = await getSettings();
        if (!settings.whatsapp_enabled) {
            console.log('[WhatsApp] Restaurant disabled in settings. Skipping.');
            return { success: false, message: 'WhatsApp disabled' };
        }

        const supabase = await createClient();
        const { data: order, error } = await supabase
            .from('restaurant_orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (error || !order?.customer_mobile) {
            console.log('[WhatsApp] Skipping restaurant order. No mobile for:', orderId);
            return { success: false, message: 'No phone found' };
        }

        const phone = formatPhoneForWhatsApp(order.customer_mobile);
        const guestName = (order.customer_name || 'Guest').split(' ')[0];
        const billNo = order.bill_no || 'N/A';
        const totalAmount = (order.total_amount || 0).toLocaleString('en-IN');
        const billDate = new Date(order.order_time).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        // Generate & upload PDF
        const pdfBuffer = await generateRestaurantBillPDF(orderId);
        const pdfFilename = `Bill_${billNo}_${Date.now()}.pdf`;
        const pdfUrl = await uploadPdfToR2(pdfBuffer, pdfFilename);

        // Generate a tracking ID for the "Rate Us" button URL (if supported by template)
        const trackingId = crypto.randomUUID().split('-')[0];

        const result = await sendWhatsAppTemplate({
            to: phone,
            templateName: settings.whatsapp_restaurant_template || process.env.WHATSAPP_RESTAURANT_TEMPLATE || 'restaurant_thankyou',
            headerDocUrl: pdfUrl,
            headerDocFilename: `Bill_${billNo}.pdf`,
            bodyParams: [
                guestName,
                settings.hotel_name,
                `Order #${billNo}`,
                `₹${totalAmount}`,
                billDate
            ],
            buttonUrlSuffix: trackingId, // Useful if the template has a dynamic URL button
        });

        console.log('[WhatsApp] Restaurant WhatsApp result:', result);

        // Save tracking record if message was sent successfully
        if (result.success && result.messageId) {
            try {
                await supabase.from('whatsapp_analytics').insert({
                    wamid: result.messageId,
                    booking_id: null, // Restaurant order doesn't always have a room booking
                    restaurant_order_id: orderId,
                    status: 'sent',
                    template_type: 'restaurant_bill',
                    guest_name: order.customer_name || 'Guest',
                    guest_phone: phone,
                    destination_url: settings.google_review_url || null,
                    tracking_id: trackingId,
                    sent_at: new Date().toISOString(),
                });
                console.log('[WhatsApp] Analytics record saved for restaurant message:', result.messageId);
            } catch (analyticsErr: any) {
                console.warn('[WhatsApp] Failed to save restaurant analytics:', analyticsErr.message);
            }
        }

        return result;
    } catch (err: any) {
        console.error('[WhatsApp] Error in sendRestaurantOrderWhatsApp:', err.message);
        return { success: false, message: err.message };
    }
}

