'use server';

import { getBrowser } from '@/utils/puppeteer';
import nodemailer from 'nodemailer';
import { createClient } from '@/utils/supabase/server';
import puppeteer from 'puppeteer';
import { getSettings } from '@/app/(dashboard)/settings/actions';
import { sendBookingWhatsApp, sendCheckoutWhatsApp } from './whatsapp';
import { formatISTDate, formatISTTime } from '@/utils/date';

const transporter = nodemailer.createTransport({
    // Using Hostinger Business Mail SMTP - Switching to port 465 (SSL/TLS) for higher reliability
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
        user: 'bookings@hotelnewganga.in',
        pass: 'HNG@mail26'
    },
    tls: {
        // Essential for Hostinger sometimes when connecting from local dev
        rejectUnauthorized: false
    },
    pool: true, // Reuse connections for better performance
    maxConnections: 5,
    maxMessages: 100
});

async function generateInvoicePDF(bookingId: string, isProvisional: boolean, devOrigin?: string, view?: 'room' | 'food' | 'full') {
    // Internal token to bypass auth middleware for PDF generation
    const pdfToken = process.env.INTERNAL_PDF_TOKEN || '__geny_pms_internal_pdf_2026__';
    const params = new URLSearchParams({ _token: pdfToken });
    if (isProvisional) params.set('type', 'provisional');
    if (view) params.set('view', view);

    // Priority: 1. Passed devOrigin (from client), 2. env variable, 3. production fallback
    const baseUrl = devOrigin || process.env.NEXT_PUBLIC_APP_URL || 'https://genypms.hotelnewganga.in';
    const url = `${baseUrl}/print-bill/${bookingId}?${params.toString()}`;

    console.log('[Mailer] Generating PDF for:', url);
    let browser;
    let page;
    try {
        browser = await getBrowser();
        page = await browser.newPage();

        const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Check for 404 or other failure
        if (response && response.status() === 404) {
            console.error('[Mailer] PDF Route 404:', url);
            throw new Error(`Invoice page not found (404). URL: ${url}`);
        }

        // Generate PDF buffer
        const rawPdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        await page.close();
        console.log('[Mailer] Raw PDF generated successfully');

        // Apply Digital Signature if configured
        const settings = await getSettings();
        if (settings.digital_signature_pfx_base64) {
            console.log('[Mailer] Applying cryptographic digital signature to PDF...');
            const { signPdfDocument } = await import('@/utils/signPdf');
            const signedBuffer = await signPdfDocument(rawPdfBuffer, settings.digital_signature_pfx_base64, settings.digital_signature_password);
            return signedBuffer;
        }

        return rawPdfBuffer;
    } catch (err: any) {
        if (page) await page.close();
        console.error('[Mailer] PDF Generation Error:', err.message);
        throw new Error(`PDF Generation failed: ${err.message}`);
    }
}

// ----------------------------------------------------------------------------
// NEW HELPER: Generates Responsive Light-Themed Email HTML
// ----------------------------------------------------------------------------
function generateEmailHTML({
    settings,
    title,
    heroImage,
    guestName,
    introLines,
    stayDetails,
    disclaimer,
    reviewUrl,
    isTest
}: {
    settings: any;
    title: string;
    heroImage?: string;
    guestName: string;
    introLines: string[];
    stayDetails?: {
        checkIn: string;
        checkOut: string;
        room: string;
        guests: string;
    };
    disclaimer?: string;
    reviewUrl?: string;
    isTest?: boolean;
}) {
    const currentYear = new Date().getFullYear();

    // Extract actual static image URL if it's a Next.js optimized link (email clients block _next/image)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://genypms.hotelnewganga.in';
    let finalLogoUrl = settings.logo_url;

    // Handle Next.js image optimization URLs
    if (finalLogoUrl && finalLogoUrl.includes('_next/image')) {
        try {
            const urlObj = new URL(finalLogoUrl);
            const actualPath = urlObj.searchParams.get('url');
            if (actualPath) {
                finalLogoUrl = urlObj.origin + actualPath;
            }
        } catch (e) { }
    }

    // ENFORCE ABSOLUTE URL for Logo
    if (finalLogoUrl && finalLogoUrl.startsWith('/')) {
        finalLogoUrl = `${baseUrl}${finalLogoUrl}`;
    }

    // ENFORCE ABSOLUTE URL for Hero Image
    let finalHeroImage = heroImage;
    if (finalHeroImage && finalHeroImage.startsWith('/')) {
        finalHeroImage = `${baseUrl}${finalHeroImage}`;
    }

    const logoHtml = finalLogoUrl
        ? `<img src="${finalLogoUrl}" alt="${settings.hotel_name}" style="max-height: 80px; max-width: 240px; object-fit: contain; margin: 0 auto; display: block;" />`
        : `<h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #0f172a !important; text-transform: uppercase; letter-spacing: 1px;">${settings.hotel_name}</h1>`;

    let stayDetailsHtml = '';
    if (stayDetails) {
        stayDetailsHtml = `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700;">Stay Details</h3>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 15px;">
                    <tr>
                        <td style="padding: 10px 0; color: #64748b; width: 40%; border-bottom: 1px solid #f1f5f9;">Check-in</td>
                        <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right; border-bottom: 1px solid #f1f5f9;">${stayDetails.checkIn}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Check-out</td>
                        <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right; border-bottom: 1px solid #f1f5f9;">${stayDetails.checkOut}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Room</td>
                        <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right; border-bottom: 1px solid #f1f5f9;">${stayDetails.room}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #64748b;">Guests</td>
                        <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right;">${stayDetails.guests}</td>
                    </tr>
                </table>
            </div>
        `;
    }

    const reviewBoxHtml = reviewUrl ? `
        <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 12px; padding: 30px 20px; text-align: center; margin-bottom: 35px;">
            <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #0f172a; font-weight: 700;">How was your experience?</h3>
            <p style="font-size: 15px; color: #475569; margin-bottom: 25px;">
                We strive to provide the best service. Your feedback means the world to us!
            </p>
            <a href="${reviewUrl}" style="display: inline-block; background-color: #0d9488; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.3);">
                Rate Us on Google ★★★★★
            </a>
        </div>
    ` : '';

    return `
    <!DOCTYPE html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <!--[if mso]>
        <noscript>
        <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
        </xml>
        </noscript>
        <![endif]-->
        <style>
            :root {
                color-scheme: light;
                supported-color-schemes: light;
            }
            @media screen and (max-width: 600px) {
                .email-container { width: 100% !important; border-radius: 0 !important; margin: 0 !important; }
                .email-body { padding: 20px !important; }
                .hero-img { height: auto !important; }
            }
            /* Force Gmail to respect light theme */
            u + #body a {
                color: inherit;
                text-decoration: none;
                font-size: inherit;
                font-family: inherit;
                font-weight: inherit;
                line-height: inherit;
            }
        </style>
    </head>
    <body id="body" style="margin: 0; padding: 0; background-color: #f8fafc !important; color: #334155 !important; -webkit-text-size-adjust: 100%;">
        <div style="background-color: #f8fafc !important; padding: 40px 10px;">
            <!-- Main Container -->
            <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff !important; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); font-family: 'Inter', Arial, sans-serif; color: #334155 !important;">
                
                <!-- Header / Logo -->
                <div style="text-align: center; padding: 35px 20px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff !important;">
                    ${logoHtml}
                </div>
                
                <!-- Hero Section -->
                <div style="padding: 40px 30px 20px 30px; text-align: center; background-color: #ffffff !important;">
                    <h2 style="margin: 0 0 25px 0; font-size: 28px; color: #0f172a !important; line-height: 1.3; font-weight: 800; letter-spacing: -0.5px;">
                        ${title}
                    </h2>
                    ${finalHeroImage ? `<img class="hero-img" src="${finalHeroImage}" alt="${settings.hotel_name}" style="width: 100%; max-width: 450px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />` : ''}
                </div>

                <!-- Body Content -->
                <div class="email-body" style="padding: 10px 40px 40px 40px; background-color: #ffffff !important;">
                    <p style="font-size: 16px; margin-bottom: 20px; color: #334155 !important; font-weight: 600;">
                        Hi ${guestName},${isTest ? ' <span style="color:#ef4444;font-size:14px;">(Test Email)</span>' : ''}
                    </p>
                    
                    ${introLines.map(line => `<p style="font-size: 15px; line-height: 1.6; color: #475569 !important; margin-bottom: ${stayDetails ? '20' : '15'}px;">${line}</p>`).join('')}

                    ${stayDetailsHtml}
                    ${reviewBoxHtml}

                    ${disclaimer ? `<p style="font-size: 14px; color: #64748b !important; line-height: 1.6; margin-bottom: 40px; padding: 20px; background-color: #f8fafc !important; border-radius: 8px; border-left: 4px solid #cbd5e1;">${disclaimer}</p>` : ''}

                    <!-- Support Section -->
                    <div style="text-align: center; margin-bottom: 20px; padding-top: 30px; border-top: 1px solid #f1f5f9; background-color: #ffffff !important;">
                        <h2 style="font-size: 20px; color: #0f172a !important; margin: 0 0 15px 0;">We are always ready to help!</h2>
                        <p style="font-size: 15px; color: #475569 !important; line-height: 1.6; margin-bottom: 25px;">
                            If you have any questions, please don't hesitate to contact our front desk.
                        </p>
                        <a href="tel:${settings.phone || '+917099017799'}" style="display: inline-block; padding: 12px 30px; border: 1px solid #e2e8f0; border-radius: 30px; color: #0f172a !important; text-decoration: none; font-weight: 600; font-size: 15px; background-color: #ffffff !important;">
                            📞 ${settings.phone || '+91 70990 17799'}
                        </a>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8fafc !important; padding: 40px 20px; text-align: center; border-top: 1px solid #f1f5f9;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b !important; font-weight: 500;">&copy; ${currentYear} ${settings.hotel_name}</p>
                    <p style="margin: 0 0 25px 0; font-size: 13px; line-height: 1.6; color: #94a3b8 !important;">
                        ${settings.address}<br />
                        <a href="https://www.hotelnewganga.in" style="color: #64748b !important; text-decoration: underline;">www.hotelnewganga.in</a>
                    </p>
                    
                    <div style="background-color: #f1f5f9 !important; padding: 15px; border-radius: 8px; max-width: 300px; margin: 0 auto;">
                        <p style="margin: 0; font-size: 11px; color: #64748b !important; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                            Powered by <a href="https://www.mediageny.com" style="color: #0d9488 !important; text-decoration: none;">Geny PMS</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

export async function sendBookingConfirmation(bookingId: string) {
    try {
        const supabase = await createClient();

        // 1. DEDUPLICATION: Check if a confirmation was already sent in the last 2 minutes
        const { data: existing } = await supabase
            .from('whatsapp_analytics')
            .select('id')
            .eq('booking_id', bookingId)
            .eq('template_type', 'check_in')
            .gt('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString())
            .maybeSingle();

        if (existing) {
            console.log('[Mailer] Skipping duplicate booking confirmation for:', bookingId);
            return { success: true, message: 'Notification already sent recently', alreadySent: true };
        }

        const settings = await getSettings();

        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`*, guests(*), rooms(*)`)
            .eq('id', bookingId)
            .single();

        if (error || !booking || !booking.guests) {
            console.log('[Mailer] No booking or guest found for:', bookingId);
            return { success: false, message: 'Booking not found' };
        }

        const pdfBuffer = await generateInvoicePDF(bookingId, true);

        // TRIGGER WHATSAPP (Concurrent with Email, passing the pdfBuffer we already generated)
        let waResult: any = null;
        const waPromise = sendBookingWhatsApp(bookingId, pdfBuffer).then(r => { waResult = r; return r; }).catch(err => {
            console.error('[Mailer] WhatsApp booking send failed:', err.message);
            waResult = { success: false, error: err.message };
        });

        // Check if we can send email
        if (!booking.guests.email) {
            console.log('[Mailer] Skipping email (no email found), but WhatsApp was triggered.');
            await waPromise;
            return { success: true, message: 'WhatsApp sent, no email found', whatsappSent: waResult?.success ?? false, whatsappError: waResult?.error };
        }

        const mailOptions = {
            from: `"Booking @ ${settings.hotel_name}" <bookings@hotelnewganga.in>`,
            to: booking.guests.email,
            subject: `Booking Confirmed - ${settings.hotel_name}`,
            html: generateEmailHTML({
                settings,
                title: 'Your reservation is confirmed.',
                heroImage: 'https://res.cloudinary.com/dqoqr3rss/image/upload/v1772958306/IMG20241223170000_b4rf8p.jpg',
                guestName: booking.guests.name.split(' ')[0],
                introLines: [
                    `We would like to inform you that your reservation at <strong>${settings.hotel_name}</strong> has been successfully confirmed.`,
                    `We are delighted to host you and ensure you have a wonderful stay.`
                ],
                stayDetails: {
                    checkIn: formatISTDate(booking.check_in_date),
                    checkOut: formatISTDate(booking.check_out_date),
                    room: `${booking.rooms.number} (${booking.rooms.type})`,
                    guests: `${booking.adults} Adults ${booking.children > 0 ? `, ${booking.children} Children` : ''}`
                },
                disclaimer: 'Please find attached the provisional receipt for your booking. Cancellations within 24 hours of arrival will be charged for the entire stay. No-shows will be charged 100% of the booking value.'
            }),
            attachments: [
                {
                    filename: `Provisional_Receipt_${bookingId.split('-')[0].toUpperCase()}.pdf`,
                    content: Buffer.from(pdfBuffer),
                    contentType: 'application/pdf'
                }
            ]
        };

        const emailResult = await transporter.sendMail(mailOptions);
        console.log('[Mailer] Booking confirmation sent to', booking.guests.email);

        await waPromise; // Ensure WA attempted

        return { success: true, emailId: emailResult.messageId, whatsappSent: waResult?.success ?? false, whatsappError: waResult?.error };
    } catch (err: any) {
        console.error('[Mailer] Error sending check-in mail:', err.message);
        return { success: false, message: err.message, whatsappSent: false };
    }
}

export async function sendCheckoutMail(bookingId: string, devOrigin?: string, view: 'room' | 'full' = 'full') {
    try {
        const supabase = await createClient();

        // 1. DEDUPLICATION: Check if a checkout mail was already sent in the last 2 minutes
        const { data: existing } = await supabase
            .from('whatsapp_analytics')
            .select('id')
            .eq('booking_id', bookingId)
            .eq('template_type', 'check_out')
            .gt('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString())
            .maybeSingle();

        if (existing) {
            console.log('[Mailer] Skipping duplicate checkout mail for:', bookingId);
            return { success: true, message: 'Notification already sent recently', alreadySent: true };
        }

        const settings = await getSettings();
        console.log('[Mailer] Preparing checkout mail for booking:', bookingId);

        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`*, guests(*), rooms(*), companies(*)`)
            .eq('id', bookingId)
            .single();

        if (!booking) {
            console.log('[Mailer] Booking not found for checkout mail:', bookingId);
            return { success: false, message: 'Booking not found' };
        }

        const pdfBuffer = await generateInvoicePDF(bookingId, false, devOrigin, view);
        const attachment = [
            {
                filename: `Tax_Invoice_${bookingId.split('-')[0].toUpperCase()}.pdf`,
                content: Buffer.from(pdfBuffer),
                contentType: 'application/pdf'
            }
        ];

        // TRIGGER WHATSAPP (Early, passing the pdfBuffer we already generated)
        let waResult: any = null;
        const waPromise = sendCheckoutWhatsApp(bookingId, pdfBuffer, view).then(r => { waResult = r; return r; }).catch(err => {
            console.error('[Mailer] WhatsApp checkout send failed:', err.message);
            waResult = { success: false, error: err.message };
        });

        const hasGuestEmail = !!booking.guests?.email;
        const hasCompanyEmail = !!(booking.bill_to_company && booking.companies?.email);

        if (!hasGuestEmail && !hasCompanyEmail) {
            console.warn('[Mailer] Skipping emails. No valid email recipient found, but WhatsApp was triggered.');
            await waPromise;
            return { success: true, message: 'WhatsApp attempted, no emails found', whatsappSent: waResult?.success ?? false, whatsappError: waResult?.error };
        }

        // 1. Send Email to Guest (Thank You)
        if (booking.guests?.email) {
            try {
                const guestMailOptions = {
                    from: `"Thank You @ ${settings.hotel_name}" <bookings@hotelnewganga.in>`,
                    to: booking.guests.email,
                    subject: `Thank you for staying at ${settings.hotel_name}`,
                    html: generateEmailHTML({
                        settings,
                        title: 'Thank you for your stay.',
                        heroImage: 'https://res.cloudinary.com/dqoqr3rss/image/upload/v1772958306/IMG20241223170000_b4rf8p.jpg',
                        guestName: booking.guests.name.split(' ')[0],
                        stayDetails: {
                            checkIn: formatISTDate(booking.check_in_date),
                            checkOut: formatISTDate(booking.check_out_date),
                            room: booking.rooms.number,
                            guests: `${booking.adults + (booking.children || 0)} PAX`
                        },
                        introLines: [
                            `We hope you had a wonderful and comfortable stay with us at <strong>${settings.hotel_name}</strong>.`,
                            `Your check-out process is complete, and we have attached your final tax invoice below.`
                        ],
                        reviewUrl: 'https://g.page/r/your-google-review-link'
                    }),
                    attachments: attachment
                };
                await transporter.sendMail(guestMailOptions);
                console.log('[Mailer] Guest checkout mail sent successfully');
            } catch (mailErr: any) {
                console.error('[Mailer] Guest email failed but continuing:', mailErr.message);
            }
        }

        // 2. Send Email to Company (Payment Due Notification)
        if (booking.bill_to_company && booking.companies?.email) {
            try {
                const companyMailOptions = {
                    from: `"Accounts @ ${settings.hotel_name}" <bookings@hotelnewganga.in>`,
                    to: booking.companies.email,
                    subject: `Invoice for Employee Stay - ${booking.guests.name} (${booking.companies.name})`,
                    html: generateEmailHTML({
                        settings,
                        title: 'Corporate Settlement Notification',
                        guestName: booking.companies.contact_person || 'Accounts Team',
                        introLines: [
                            `This is to inform you that your employee, <strong>${booking.guests.name}</strong>, has checked out after their stay at ${settings.hotel_name}.`,
                            `The guest has requested the bill to be settled against the company ledger. Please find the attached invoice for your records.`,
                            `<strong>Payment Status:</strong> Pending Corporate Settlement.`
                        ],
                        stayDetails: {
                            checkIn: formatISTDate(booking.check_in_date),
                            checkOut: formatISTDate(booking.check_out_date),
                            room: `${booking.rooms.number} (${booking.rooms.type})`,
                            guests: `Employee: ${booking.guests.name}`
                        },
                        disclaimer: `Please process the payment as per the agreed corporate credit terms. For any billing queries, please contact our accounts department.`
                    }),
                    attachments: attachment
                };
                await transporter.sendMail(companyMailOptions);
                console.log('[Mailer] Corporate checkout mail sent to', booking.companies.email);
            } catch (mailErr: any) {
                console.error('[Mailer] Corporate email failed but continuing:', mailErr.message);
            }
        }

        await waPromise; // Ensure WA attempted
        return { success: true, whatsappSent: waResult?.success ?? false, whatsappError: waResult?.error };
    } catch (err: any) {
        console.error('[Mailer] Error sending checkout mail info:', err.message);
        return { success: false, message: err.message, whatsappSent: false };
    }
}

export async function sendSettlementMail(bookingId: string) {
    try {
        const supabase = await createClient();
        const settings = await getSettings();
        console.log('[Mailer] Preparing settlement THANK YOU mail for booking:', bookingId);

        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`*, guests(*), rooms(*), companies(*)`)
            .eq('id', bookingId)
            .single();

        if (error || !booking || !booking.companies?.email) {
            console.log('[Mailer] Skipping settlement email. No company email found for:', bookingId);
            return { success: false, message: 'No company email found' };
        }

        const pdfBuffer = await generateInvoicePDF(bookingId, false);
        const attachment = [
            {
                filename: `Settled_Invoice_${bookingId.split('-')[0].toUpperCase()}.pdf`,
                content: Buffer.from(pdfBuffer),
                contentType: 'application/pdf'
            }
        ];

        const mailOptions = {
            from: `"Accounts @ ${settings.hotel_name}" <bookings@hotelnewganga.in>`,
            to: booking.companies.email,
            subject: `Payment Received & Settled - ${settings.hotel_name}`,
            html: generateEmailHTML({
                settings,
                title: 'Payment Successfully Settled.',
                heroImage: 'https://res.cloudinary.com/dqoqr3rss/image/upload/v1772958306/IMG20241223170000_b4rf8p.jpg',
                guestName: 'Accounts Team',
                introLines: [
                    `We are pleased to inform you that the payment for the stay of <strong>${booking.guests.name}</strong> has been successfully settled in our records.`,
                    `Thank you for your continued business with <strong>${settings.hotel_name}</strong>. We truly appreciate our partnership.`,
                    `Please find the settled invoice attached for your records.`
                ],
                stayDetails: {
                    checkIn: formatISTDate(booking.check_in_date),
                    checkOut: formatISTDate(booking.check_out_date),
                    room: `${booking.rooms.number} (${booking.rooms.type})`,
                    guests: `Folio Settled: ₹${Number(booking.total_bill).toLocaleString()}`
                },
                disclaimer: `This is an automated confirmation of settlement. No further action is required from your side.`
            }),
            attachments: attachment
        };

        await transporter.sendMail(mailOptions);
        console.log('[Mailer] Settlement confirmation sent to', booking.companies.email);
        return { success: true };
    } catch (err: any) {
        console.error('[Mailer] Error sending settlement mail:', err.message);
        return { success: false, message: err.message };
    }
}

// ==== TEST FUNCTIONS FOR SETTINGS PAGE ====

export async function testSendBookingConfirmation(targetEmail: string) {
    try {
        const supabase = await createClient();

        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`id`)
            .eq('status', 'Active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !booking) {
            return { success: false, message: 'No active bookings found to use as test data' };
        }

        const settings = await getSettings();
        const { data: fullBooking } = await supabase
            .from('bookings')
            .select(`*, guests(*), rooms(*)`)
            .eq('id', booking.id)
            .single();

        if (!fullBooking) return { success: false, message: 'Failed to fetch test booking details' };

        fullBooking.guests.email = targetEmail;
        const pdfBuffer = await generateInvoicePDF(booking.id, true);

        const mailOptions = {
            from: `"Booking @ ${settings.hotel_name}" <bookings@hotelnewganga.in>`,
            to: targetEmail,
            subject: `[TEST] Booking Confirmed - ${settings.hotel_name}`,
            html: generateEmailHTML({
                settings,
                title: 'Your reservation is confirmed.',
                heroImage: 'https://res.cloudinary.com/dqoqr3rss/image/upload/v1772958306/IMG20241223170000_b4rf8p.jpg',
                guestName: fullBooking.guests.name.split(' ')[0],
                introLines: [
                    `We would like to inform you that your reservation at <strong>${settings.hotel_name}</strong> has been successfully confirmed.`,
                    `We are delighted to host you and ensure you have a wonderful stay.`
                ],
                stayDetails: {
                    checkIn: formatISTDate(fullBooking.check_in_date),
                    checkOut: formatISTDate(fullBooking.check_out_date),
                    room: `${fullBooking.rooms.number} (${fullBooking.rooms.type})`,
                    guests: `${fullBooking.adults} Adults ${fullBooking.children > 0 ? `, ${fullBooking.children} Children` : ''}`
                },
                disclaimer: 'Please find attached the provisional receipt for your booking. Cancellations within 24 hours of arrival will be charged for the entire stay. No-shows will be charged 100% of the booking value.',
                isTest: true
            }),
            attachments: [
                {
                    filename: `Provisional_Receipt_${booking.id.split('-')[0].toUpperCase()}.pdf`,
                    content: Buffer.from(pdfBuffer),
                    contentType: 'application/pdf'
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (err: any) {
        console.error('[Mailer] Error sending test check-in mail:', err.message);
        return { success: false, message: err.message };
    }
}

export async function testSendCheckoutMail(targetEmail: string) {
    try {
        const supabase = await createClient();

        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`id`)
            .eq('status', 'Completed')
            .order('check_out_date', { ascending: false })
            .limit(1)
            .single();

        const targetId = booking?.id || (await supabase.from('bookings').select('id').limit(1).single()).data?.id;

        if (!targetId) {
            return { success: false, message: 'No bookings found to use as test data' };
        }

        const settings = await getSettings();
        const { data: fullBooking } = await supabase
            .from('bookings')
            .select(`*, guests(*), rooms(*)`)
            .eq('id', targetId)
            .single();

        if (!fullBooking) return { success: false, message: 'Failed to fetch test booking details' };

        fullBooking.guests.email = targetEmail;
        const pdfBuffer = await generateInvoicePDF(targetId, false);

        const mailOptions = {
            from: `"Thank You @ ${settings.hotel_name}" <bookings@hotelnewganga.in>`,
            to: targetEmail,
            subject: `[TEST] Thank you for staying at ${settings.hotel_name}`,
            html: generateEmailHTML({
                settings,
                title: 'Thank you for your stay.',
                heroImage: 'https://storage.googleapis.com/gweb-developer-staging.appspot.com/a931ca8a29a435ad-PXL_20250212_120155029.jpg',
                guestName: fullBooking.guests.name.split(' ')[0],
                introLines: [
                    `We hope you had a wonderful and comfortable stay with us at <strong>${settings.hotel_name}</strong>.`,
                    `Your check-out process is complete, and we have attached your final tax invoice below.`
                ],
                reviewUrl: 'https://g.page/r/your-google-review-link',
                isTest: true
            }),
            attachments: [
                {
                    filename: `Tax_Invoice_${targetId.split('-')[0].toUpperCase()}.pdf`,
                    content: Buffer.from(pdfBuffer),
                    contentType: 'application/pdf'
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (err: any) {
        console.error('[Mailer] Error sending test checkout mail:', err.message);
        return { success: false, message: err.message };
    }
}

export async function sendAccountsPortalEmail(startDate: string, endDate: string, link: string, targetEmail: string, accountantName: string) {
    try {
        const settings = await getSettings();
        const hotelName = settings?.hotel_name || 'Hotel New Ganga';

        await transporter.sendMail({
            from: `"Accounts Department | ${hotelName}" <bookings@hotelnewganga.in>`,
            to: targetEmail,
            subject: `Accounts Audit Link: Temporary Access to Invoices & Receipts (${startDate} to ${endDate})`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #333;">
                    <h2 style="color: #0f766e;">Hello ${accountantName || 'Accountant'},</h2>
                    <p>The management at <strong>${hotelName}</strong> has exported a batch of Money Receipts and Invoices for your review.</p>
                    
                    <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #0f766e; margin: 20px 0;">
                        <strong>Period:</strong> ${startDate} to ${endDate}<br/>
                    </div>
                    
                    <p>You can access, view, and securely download these documents (individually or collectively) using your dedicated Accounts Portal access link below. <strong>No login is required.</strong></p>
                    
                    <div style="margin: 30px 0;">
                        <a href="${link}" style="background-color: #0f766e; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Access Accounts Portal</a>
                    </div>
                    
                    <p style="font-size: 11px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                        This is an automated administrative export from the Geny PMS Pro Engine.<br/>
                        For security purposes, do not forward this email to unauthorized personnel as the link provides direct access to financial documents.
                    </p>
                </div>
            `
        });

        return { success: true };
    } catch (e: any) {
        console.error('[Mailer] Error sending Accounts email:', e);
        return { success: false, error: e.message };
    }
}
