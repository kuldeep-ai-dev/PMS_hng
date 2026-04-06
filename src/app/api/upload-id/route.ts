import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';

const R2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const guestPhone = formData.get('guestPhone') as string || 'unknown';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Only allow image types
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
        }

        // Limit file size to 5MB (after client-side compression, should be much smaller)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Build a unique, organized key
        const timestamp = Date.now();
        const sanitizedPhone = guestPhone.replace(/[^a-z0-9]/gi, '_');
        const ext = file.type === 'image/jpeg' ? 'jpg' : 'png';
        const key = `guest-ids/${sanitizedPhone}_${timestamp}.${ext}`;

        await R2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        }));

        const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
        return NextResponse.json({ url: publicUrl, key }, { status: 200 });

    } catch (err: any) {
        console.error('R2 upload error:', err);
        return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
    }
}
