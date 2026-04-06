import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { getSettings } from '@/app/(dashboard)/settings/actions';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('id');

    if (!bookingId || bookingId === 'undefined') {
        return new NextResponse('Missing booking ID', { status: 400 });
    }

    const pdfToken = process.env.INTERNAL_PDF_TOKEN || '__geny_pms_internal_pdf_2026__';
    const params = new URLSearchParams({ _token: pdfToken });

    // For Browserless.io, we need an absolute public URL because Browserless cannot see "localhost"
    const host = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const targetUrl = `${host}/print-grc/${bookingId}?${params.toString()}`;

    console.log('[API/download-grc] Generating PDF for:', targetUrl);
    let browser;
    try {
        const browserlessToken = process.env.BROWSERLESS_API_KEY;

        if (browserlessToken) {
            console.log('[API/download-grc] Using Browserless.io for remote PDF generation...');
            browser = await puppeteer.connect({
                browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessToken}`,
            });
        } else {
            console.log('[API/download-grc] BROWSERLESS_API_KEY missing, falling back to local launch (may fail on Vercel)...');
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
        }
        const page = await browser.newPage();

        try {
            await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        } catch (e) {
            if (!browserlessToken) {
                console.warn('[API/download-grc] Localhost failed, trying 127.0.0.1...');
                const fallbackUrl = targetUrl.replace('localhost', '127.0.0.1');
                await page.goto(fallbackUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            } else {
                throw e; // Browserless cannot access 127.0.0.1
            }
        }

        const rawPdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        await browser.close();
        console.log('[API/download-grc] Raw PDF generated successfully');

        // Apply Digital Signature if configured
        const settings = await getSettings();
        let finalBuffer = Buffer.from(rawPdfBuffer);

        if (settings.digital_signature_pfx_base64) {
            console.log('[API/download-grc] Applying cryptographic digital signature to PDF...');
            try {
                const { signPdfDocument } = await import('@/utils/signPdf');
                const signed = await signPdfDocument(Buffer.from(rawPdfBuffer), settings.digital_signature_pfx_base64, settings.digital_signature_password);
                finalBuffer = Buffer.from(signed);
            } catch (sigErr: any) {
                console.error('[API/download-grc] Digital Signature error ignored for fallback:', sigErr);
            }
        }

        return new NextResponse(new Uint8Array(finalBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="GRC-${bookingId.slice(0, 8)}.pdf"`
            }
        });

    } catch (err: any) {
        if (browser) await browser.close();
        console.error('[API/download-grc] PDF Generation Error:', err.message);
        return new NextResponse(`PDF Generation failed: ${err.message}`, { status: 500 });
    }
}
