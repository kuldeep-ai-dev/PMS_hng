import { NextResponse } from 'next/server';
import { generateFlashReportData } from '@/app/(dashboard)/admin/actions-night-audit';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const format = searchParams.get('format') || 'json';

    if (!date) {
        return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    try {
        const reportData = await generateFlashReportData(date);

        if (format === 'json') {
            return NextResponse.json(reportData, {
                headers: {
                    'Content-Disposition': `attachment; filename="${date}_Audit_report.json"`,
                    'Content-Type': 'application/json'
                }
            });
        }

        if (format === 'pdf') {
            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
            const { width, height } = page.getSize();

            const margin = 50;
            let y = height - 50;

            // Header Background
            page.drawRectangle({
                x: 0,
                y: height - 120,
                width: width,
                height: 120,
                color: rgb(0.12, 0.16, 0.24), // Slate-900 equivalent
            });

            // Header Text
            page.drawText('HOTEL MANAGER\'S FLASH REPORT', { x: margin, y: height - 50, size: 22, font: boldFont, color: rgb(1, 1, 1) });
            page.drawText(`Audit Date: ${reportData.auditDate}`, { x: margin, y: height - 75, size: 12, font, color: rgb(0.8, 0.85, 0.95) });
            page.drawText(`Generated: ${new Date(reportData.runAt).toLocaleString()}`, { x: width - margin - 180, y: height - 75, size: 10, font, color: rgb(0.8, 0.85, 0.95) });

            y = height - 160;

            // Manager Info block
            page.drawRectangle({ x: margin, y: y - 50, width: width - (margin * 2), height: 60, color: rgb(0.96, 0.97, 0.98), borderColor: rgb(0.9, 0.9, 0.9), borderWidth: 1 });
            page.drawText('PREPARED BY', { x: margin + 15, y: y - 15, size: 10, font: boldFont, color: rgb(0.4, 0.4, 0.45) });
            page.drawText(`${reportData.managerName}`, { x: margin + 15, y: y - 35, size: 14, font: boldFont, color: rgb(0.1, 0.1, 0.15) });
            page.drawText(`${reportData.managerRole}`, { x: margin + 250, y: y - 35, size: 12, font, color: rgb(0.4, 0.4, 0.45) });

            y -= 90;

            // Divider helper
            const drawDividerLine = (yPos: number) => {
                page.drawLine({ start: { x: margin, y: yPos }, end: { x: width - margin, y: yPos }, color: rgb(0.9, 0.9, 0.9), thickness: 1 });
            };

            // Metrics Section
            page.drawText('KEY PERFORMANCE INDICATORS', { x: margin, y, size: 16, font: boldFont, color: rgb(0.1, 0.2, 0.4) });
            y -= 15;
            drawDividerLine(y);
            y -= 25;

            const drawMetric = (label: string, value: string, yPos: number, isCurrency: boolean = false) => {
                page.drawText(label, { x: margin, y: yPos, size: 12, font, color: rgb(0.3, 0.3, 0.35) });
                page.drawText(value, { x: width - margin - 150, y: yPos, size: 12, font: boldFont, color: isCurrency ? rgb(0.1, 0.6, 0.3) : rgb(0.1, 0.1, 0.1) });
            };

            drawMetric('Total Rooms:', `${reportData.totalRooms}`, y); y -= 20;
            drawMetric('Total Occupancy:', `${reportData.occupancy} (${reportData.occupancyRate})`, y); y -= 20;
            drawMetric('Total Room Revenue:', `INR ${reportData.roomRevenue.toFixed(2)}`, y, true); y -= 20;
            drawMetric('ADR (Average Daily Rate):', `INR ${reportData.adr}`, y, true); y -= 20;
            drawMetric('RevPAR (Rev. Per Avail. Room):', `INR ${reportData.revPar}`, y, true); y -= 40;

            // Ledgers Section
            page.drawText('LEDGER BALANCES', { x: margin, y, size: 16, font: boldFont, color: rgb(0.1, 0.2, 0.4) });
            y -= 15;
            drawDividerLine(y);
            y -= 25;

            drawMetric('Guest Ledger (In-House Unpaid):', `INR ${reportData.ledgers.guestLedger.toFixed(2)}`, y, true); y -= 20;
            drawMetric('City Ledger (Billed to Company):', `INR ${reportData.ledgers.cityLedger.toFixed(2)}`, y, true); y -= 20;
            drawMetric('Deposit Ledger (Future Advances):', `INR ${reportData.ledgers.depositLedger.toFixed(2)}`, y, true);

            // Footer
            page.drawText('Confidential Property Management Report', { x: margin, y: 30, size: 9, font, color: rgb(0.6, 0.6, 0.6) });

            const pdfBytes = await pdfDoc.save();

            return new NextResponse(Buffer.from(pdfBytes), {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${date}_Audit_report.pdf"`,
                },
            });
        }

        return NextResponse.json({ error: 'Invalid format' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
