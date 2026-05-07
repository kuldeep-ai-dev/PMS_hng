'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import puppeteer from 'puppeteer';
import { getSettings } from '@/app/(dashboard)/settings/actions';
import { formatISTDate, formatISTTime } from '@/utils/date';
import { getBrowser } from '@/utils/puppeteer';

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
 * Parse a template name that may include a language suffix (e.g. "food_confirm|en_US").
 * Returns { name, lang } where lang defaults to 'en' if not specified.
 */
function parseTemplateSetting(setting: string): { name: string; lang: string } {
    if (setting.includes('|')) {
        const [name, lang] = setting.split('|');
        return { name: name.trim(), lang: lang.trim() || 'en' };
    }
    return { name: setting.trim(), lang: 'en' };
}

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
    const pdfToken = process.env.INTERNAL_PDF_TOKEN || '__GENY_PMS_INTERNAL_SECRET_2026__';
    const params = new URLSearchParams({ _token: pdfToken });
    if (isProvisional) params.set('type', 'provisional');
    const url = `http://localhost:3000/print-bill/${bookingId}?${params.toString()}`;

    console.log('[WhatsApp] Generating PDF for:', url);
    let browser;
    let page;
    try {
        browser = await getBrowser();
        page = await browser.newPage();

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

        await page.close();
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
        if (page) await page.close();
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
    let page;
    try {
        browser = await getBrowser();
        page = await browser.newPage();

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

        await page.close();
        return rawPdfBuffer as unknown as Uint8Array;
    } catch (err: any) {
        if (page) await page.close();
        console.error('[WhatsApp] Restaurant PDF Error:', err.message);
        throw new Error(`Restaurant PDF fail: ${err.message}`);
    }
}

// ─── Core WhatsApp API Call ───────────────────────────────────────────────────
// ... (lines 126-451 exist below, I'll use the proper replacement range)


// ─── Core WhatsApp API Call ───────────────────────────────────────────────────

/**
 * Send a WhatsApp template message via the Cloud API.
 * Supports Marketing campaigns with media headers and dynamic buttons.
 */
export async function sendWhatsAppTemplate({
    to,
    templateName,
    languageCode = 'en',
    mediaType,
    mediaUrl,
    mediaHandle,
    headerParams,
    bodyParams,
    buttonUrlSuffix,
}: {
    to: string;
    templateName: string;
    languageCode?: string;
    mediaType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    mediaUrl?: string;
    mediaHandle?: string;
    headerParams?: string[];
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

    // --- Header Component (Text or Media) ---
    if (mediaType && (mediaUrl || mediaHandle)) {
        const mediaObj: any = {};
        if (mediaHandle) mediaObj.handle = mediaHandle;
        else if (mediaUrl) mediaObj.link = mediaUrl;

        // Document specific filename
        if (mediaType === 'DOCUMENT') {
            mediaObj.filename = 'Document.pdf';
        }

        components.push({
            type: 'header',
            parameters: [{
                type: mediaType.toLowerCase(),
                [mediaType.toLowerCase()]: mediaObj
            }]
        });
    } else if (headerParams && headerParams.length > 0) {
        components.push({
            type: 'header',
            parameters: headerParams.map(text => ({ type: 'text', text }))
        });
    }

    // --- Body Component ---
    if (bodyParams.length > 0) {
        components.push({
            type: 'body',
            parameters: bodyParams.map(text => ({ type: 'text', text }))
        });
    }

    // --- Button Component (Dynamic URL) ---
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
        const checkIn = formatISTDate(booking.check_in_date);
        const checkOut = formatISTDate(booking.check_out_date);
        const room = `${booking.rooms.number} (${booking.rooms.type})`;
        const guests = `${booking.adults} Adults${booking.children > 0 ? `, ${booking.children} Children` : ''}`;

        // Generate & upload PDF
        const pdfBuffer = await generateInvoicePDF(bookingId, true);
        const pdfFilename = `Provisional_${bookingId.split('-')[0].toUpperCase()}_${Date.now()}.pdf`;
        const pdfUrl = await uploadPdfToR2(pdfBuffer, pdfFilename);

        const tpl = parseTemplateSetting(settings.whatsapp_booking_template || process.env.WHATSAPP_BOOKING_TEMPLATE || 'booking_confirmation');

        const result = await sendWhatsAppTemplate({
            to: phone,
            templateName: tpl.name,
            languageCode: tpl.lang,
            mediaType: 'DOCUMENT',
            mediaUrl: pdfUrl,
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
        const checkIn = formatISTDate(booking.check_in_date);
        const checkOut = formatISTDate(booking.check_out_date);
        const room = `${booking.rooms.number} (${booking.rooms.type})`;

        // Generate & upload PDF
        const pdfBuffer = await generateInvoicePDF(bookingId, false);
        const pdfFilename = `Invoice_${bookingId.split('-')[0].toUpperCase()}_${Date.now()}.pdf`;
        const pdfUrl = await uploadPdfToR2(pdfBuffer, pdfFilename);

        // Generate a tracking ID for the "Rate Us" button URL
        // The full button URL will be: base_url_from_template + trackingId
        const trackingId = crypto.randomUUID().split('-')[0];

        const tpl = parseTemplateSetting(settings.whatsapp_checkout_template || process.env.WHATSAPP_CHECKOUT_TEMPLATE || 'checkout_thankyou');

        const result = await sendWhatsAppTemplate({
            to: phone,
            templateName: tpl.name,
            languageCode: tpl.lang,
            mediaType: 'DOCUMENT',
            mediaUrl: pdfUrl,
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
                const adminSupabase = createAdminClient();
                const { error: insError } = await adminSupabase.from('whatsapp_analytics').insert({
                    wamid: result.messageId,
                    booking_id: bookingId,
                    status: 'sent',
                    template_type: 'check_out',
                    guest_name: booking.guests.name,
                    guest_phone: phone,
                    destination_url: settings.google_review_url,
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
export async function testSendWhatsApp(phoneNumber: string, type: 'check_in' | 'check_out' | 'restaurant' = 'check_in') {
    try {
        const settings = await getSettings();
        const phone = formatPhoneForWhatsApp(phoneNumber);

        let templateName = '';
        let bodyParams: string[] = [];
        let headerDocFilename = 'Test_Invoice.pdf';
        let buttonUrlSuffix: string | undefined = undefined;

        let languageCode = 'en';

        if (type === 'check_in') {
            const tpl = parseTemplateSetting(settings.whatsapp_booking_template || process.env.WHATSAPP_BOOKING_TEMPLATE || 'booking_confirmation');
            templateName = tpl.name;
            languageCode = tpl.lang;
            bodyParams = [
                'Test Guest',
                settings.hotel_name,
                'Mon, 07 Apr 2026',
                'Wed, 09 Apr 2026',
                '101 (Deluxe)',
                '2 Adults',
                settings.phone || ''
            ];
            headerDocFilename = 'Test_Provisional_Invoice.pdf';
        } else if (type === 'check_out') {
            const tpl = parseTemplateSetting(settings.whatsapp_checkout_template || process.env.WHATSAPP_CHECKOUT_TEMPLATE || 'checkout_thankyou');
            templateName = tpl.name;
            languageCode = tpl.lang;
            bodyParams = [
                'Test Guest',
                settings.hotel_name,
                'Mon, 07 Apr 2026',
                'Wed, 09 Apr 2026',
                '101 (Deluxe)'
            ];
            headerDocFilename = 'Test_Final_Invoice.pdf';
            buttonUrlSuffix = 'test_click_tracker';
        } else if (type === 'restaurant') {
            const tpl = parseTemplateSetting(settings.whatsapp_restaurant_template || process.env.WHATSAPP_RESTAURANT_TEMPLATE || 'food_confirm');
            templateName = tpl.name;
            languageCode = tpl.lang;
            bodyParams = [
                settings.hotel_name || 'Restaurant',
                'TEST-123',
                '₹1,250',
                '07 Apr 2026'
            ];
            headerDocFilename = 'Test_Restaurant_Bill.pdf';
            // Important: we do not set buttonUrlSuffix because food_confirm uses a static button URL
        }
        const result = await sendWhatsAppTemplate({
            to: phone,
            templateName,
            languageCode,
            // Use a reliable public PDF for testing. Settings logo might be a data: URI which Meta rejects.
            mediaType: 'DOCUMENT',
            mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            bodyParams,
            buttonUrlSuffix
        });

        // Save analytics record for test messages too
        if (result.success && result.messageId) {
            try {
                const adminSupabase = createAdminClient();
                await adminSupabase.from('whatsapp_analytics').insert({
                    wamid: result.messageId,
                    booking_id: null,
                    status: 'sent',
                    template_type: type === 'restaurant' ? 'restaurant_order' : (type === 'check_out' ? 'check_out' : 'check_in'),
                    guest_name: 'Test Guest',
                    guest_phone: phone,
                    destination_url: settings.google_review_url,
                    sent_at: new Date().toISOString(),
                    tracking_id: buttonUrlSuffix
                });
                console.log(`[WhatsApp] Test analytics record (${type}) saved for wamid:`, result.messageId);
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
        const totalAmount = Number(order.total_amount || 0).toLocaleString('en-IN');
        const billDate = formatISTDate(order.order_time);

        console.log(`[WhatsApp] Preparing restaurant bill for ${guestName} (${phone}), Order: ${orderId}, Bill: ${billNo}`);

        // Generate & upload PDF
        console.log(`[WhatsApp] Generating PDF for restaurant order: ${orderId}...`);
        const pdfBuffer = await generateRestaurantBillPDF(orderId);
        const pdfFilename = `Bill_${billNo}_${Date.now()}.pdf`;
        console.log(`[WhatsApp] Uploading PDF to R2: ${pdfFilename}...`);
        const pdfUrl = await uploadPdfToR2(pdfBuffer, pdfFilename);

        // Generate a tracking ID for the "Rate Us" button URL (if supported by template)
        const trackingId = crypto.randomUUID().split('-')[0];
        console.log(`[WhatsApp] Generated tracking ID: ${trackingId}, PDF URL: ${pdfUrl}`);

        const tpl = parseTemplateSetting(settings.whatsapp_restaurant_template || process.env.WHATSAPP_RESTAURANT_TEMPLATE || 'food_confirm');

        const result = await sendWhatsAppTemplate({
            to: phone,
            templateName: tpl.name,
            languageCode: tpl.lang,
            mediaType: 'DOCUMENT',
            mediaUrl: pdfUrl,
            bodyParams: [
                settings.hotel_name || 'Restaurant',
                billNo,
                `₹${totalAmount}`,
                billDate
            ]
        });

        console.log(`[WhatsApp] Restaurant request to ${phone} results:`, JSON.stringify(result));

        // Save tracking record if message was sent successfully
        if (result.success && result.messageId) {
            try {
                const adminSupabase = createAdminClient();
                const { error: insError } = await adminSupabase.from('whatsapp_analytics').insert({
                    wamid: result.messageId,
                    booking_id: null,
                    restaurant_order_id: orderId,
                    status: 'sent',
                    template_type: 'restaurant_order',
                    guest_name: (order.customer_name || 'Guest'),
                    guest_phone: phone,
                    destination_url: settings.google_review_url,
                    tracking_id: trackingId,
                    sent_at: new Date().toISOString(),
                });

                if (insError) {
                    console.error(`[WhatsApp] Analytics insert failed:`, insError.message);
                } else {
                    console.log(`[WhatsApp] Analytics record saved for restaurant message: ${result.messageId}`);
                }
            } catch (err) {
                console.error("[WhatsApp] Analytics save error:", err);
            }
        }

        return result;
    } catch (err: any) {
        console.error('[WhatsApp] Error in sendRestaurantOrderWhatsApp:', err.message);
        return { success: false, message: err.message };
    }
}

/**
 * Notify restaurant staff of a new order placed via QR menu.
 */
export async function notifyRestaurantOrderStaff(orderId: string) {
    try {
        const supabase = await createClient();
        const { data: order, error: orderError } = await supabase
            .from('restaurant_orders')
            .select(`
                *,
                room:rooms(number),
                table:restaurant_tables(table_number)
            `)
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            console.error('[WhatsApp] Staff Notify: Order not found:', orderId);
            return { success: false, message: 'Order not found' };
        }

        // Fetch order items separately to ensure we get item names
        const { data: items, error: itemsError } = await supabase
            .from('restaurant_order_items')
            .select(`
                quantity,
                menu_item:restaurant_menu_items(name)
            `)
            .eq('order_id', orderId);

        if (itemsError) throw itemsError;

        const { data: settings, error: setErr } = await supabase
            .from('restaurant_settings')
            .select('*')
            .limit(1)
            .single();

        if (setErr || !settings?.notification_whatsapp_number) {
            console.log('[WhatsApp] Staff Notify: No destination number configured.');
            return { success: false, message: 'No notification number' };
        }

        const phone = formatPhoneForWhatsApp(settings.notification_whatsapp_number);
        const location = order.room?.number ? `Room ${order.room.number}` : (order.table?.table_number ? `Table ${order.table.table_number}` : 'Unknown');
        const itemsList = items?.map((i: any) => `${i.quantity}x ${i.menu_item?.name || 'Item'}`).join(', ') || 'No Items';
        const totalAmount = Number(order.total_amount || 0).toLocaleString('en-IN');
        const orderTime = formatISTTime(order.order_time);

        console.log(`[WhatsApp] Notifying staff at ${phone} for new order from ${location}`);

        // Using the newly created 'qr_order_alert' utility template
        // Params: 1: Location, 2: Items, 3: Total, 4: Time
        const result = await sendWhatsAppTemplate({
            to: phone,
            templateName: 'qr_order_alert',
            languageCode: 'en',
            bodyParams: [
                location,
                itemsList.substring(0, 1024),
                `₹${totalAmount}`,
                orderTime
            ]
        });

        if (result.success && result.messageId) {
            console.log(`[WhatsApp] Staff notification sent: ${result.messageId}`);
        }

        return result;
    } catch (err: any) {
        console.error('[WhatsApp] Error in notifyRestaurantOrderStaff:', err.message);
        return { success: false, message: err.message };
    }
}


/**
 * Fetch WhatsApp Phone Number Account status and details from Meta.
 */
export async function getWhatsAppAccountInfo() {
    try {
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

        if (!phoneNumberId || !accessToken) {
            return { success: false, error: 'WhatsApp credentials missing in .env.local' };
        }

        const apiUrl = `https://graph.facebook.com/${WA_API_VERSION}/${phoneNumberId}?access_token=${accessToken}`;

        const res = await fetch(apiUrl, { cache: 'no-store' });
        const data = await res.json();

        if (!res.ok) {
            console.error('[WhatsApp Account] Meta API Error:', data);
            return {
                success: false,
                error: data.error?.message || 'Failed to fetch account info from Meta'
            };
        }

        return {
            success: true,
            appStatus: 'live', // We return live if the API responds
            appName: data.verified_name || 'WhatsApp Official Account',
            phoneNumberId: data.id,
            displayPhoneNumber: data.display_phone_number,
            isTestNumber: data.id?.startsWith('105') || false
        };
    } catch (err: any) {
        console.error('[WhatsApp Account] Fetch Error:', err.message);
        return { success: false, error: err.message };
    }
}
