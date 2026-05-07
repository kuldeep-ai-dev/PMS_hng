import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { getBrowser } from '@/utils/puppeteer';

export async function GET(request: NextRequest) {
    const range = request.nextUrl.searchParams.get('range') || '7d';
    const pdfToken = process.env.INTERNAL_PDF_TOKEN || '__geny_pms_internal_pdf_2026__';

    const url = `http://localhost:3000/print-insights?range=${range}&_token=${pdfToken}`;

    let browser;
    let page;
    try {
        browser = await getBrowser();
        page = await browser.newPage();

        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        } catch {
            const fallback = url.replace('localhost', '127.0.0.1');
            await page.goto(fallback, { waitUntil: 'networkidle2', timeout: 30000 });
        }

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
        });

        await page.close();

        const rangeLabels: Record<string, string> = { '7d': '7Days', '1m': '1Month', '2m': '2Months', '3m': '3Months' };
        const filename = `WhatsApp_Insights_${rangeLabels[range] || range}_${new Date().toISOString().split('T')[0]}.pdf`;

        return new NextResponse(Buffer.from(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (err: any) {
        if (page) await page.close();
        console.error('[Export Insights] PDF generation error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
