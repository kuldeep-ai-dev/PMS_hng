'use server';

import { createClient } from '@/utils/supabase/server';
import { sendWhatsAppTemplate } from '@/app/actions/whatsapp';

export async function sendMarketingCampaignAction(params: {
    templateName: string;
    languageCode: string;
    audienceIds: string[];
    audienceType: 'hotel_guests' | 'restaurant_customers';
    mappings: { index: number, value: string, mappingType: 'STATIC' | 'PREDEFINED', component: 'HEADER' | 'BODY' }[];
    headerMedia?: { type: string, url?: string, handle?: string };
    buttonUrlSuffix?: string;
}) {
    const supabase = await createClient();
    
    // 1. Fetch audience data
    const table = params.audienceType === 'hotel_guests' ? 'guests' : 'restaurant_orders';
    const { data: audience, error } = await supabase
        .from(table)
        .select('*')
        .in('id', params.audienceIds);

    if (error || !audience) {
        return { success: false, error: 'Failed to fetch audience data' };
    }

    let successCount = 0;
    let failCount = 0;
    let firstError: string | undefined;
    let firstMessageId: string | undefined;
    const errors: { phone: string; reason: string }[] = [];

    // 2. Loop and Send — with rate-limit delay between each recipient
    for (let i = 0; i < audience.length; i++) {
        const member = audience[i];
        const phone = params.audienceType === 'hotel_guests' 
            ? member.phone 
            : member.customer_mobile;
            
        if (!phone) {
            failCount++;
            errors.push({ phone: 'UNKNOWN', reason: 'No phone number stored for this contact' });
            continue;
        }

        // Helper to resolve a single mapping
        const resolveValue = (m: any) => {
            if (m.mappingType === 'STATIC') return m.value;
            
            const fullName = params.audienceType === 'hotel_guests' 
                ? (member.name || '') 
                : (member.customer_name || '');

            switch (m.value) {
                case 'GUEST_NAME':
                    return (fullName || 'Guest').split(' ')[0];
                case 'FULL_NAME':
                    return fullName || 'Guest';
                case 'PHONE_NUMBER':
                    return phone;
                default:
                    return m.value || ' '; // never send empty string to Meta
            }
        };

        // Resolve variables into separate components
        const headerParams = params.mappings
            .filter(m => m.component === 'HEADER')
            .sort((a, b) => a.index - b.index)
            .map(resolveValue);

        const bodyParams = params.mappings
            .filter(m => m.component === 'BODY')
            .sort((a, b) => a.index - b.index)
            .map(resolveValue);

        // Rate-limit: wait 500ms between each send to avoid Meta throttling
        if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`[Marketing] Sending to ${phone} (${i + 1}/${audience.length})...`);

        const result = await sendWhatsAppTemplate({
            to: phone,
            templateName: params.templateName,
            languageCode: params.languageCode,
            mediaType: params.headerMedia?.type as any,
            mediaUrl: params.headerMedia?.url,
            mediaHandle: params.headerMedia?.handle,
            headerParams,
            bodyParams,
            buttonUrlSuffix: params.buttonUrlSuffix
        });

        if (result.success) {
            successCount++;
            if (!firstMessageId) firstMessageId = result.messageId;

            // Log to analytics for webhook tracking
            if (result.messageId) {
                await supabase.from('whatsapp_analytics').insert({
                    wamid: result.messageId,
                    status: 'sent',
                    recipient_phone: phone,
                    template_name: params.templateName,
                    metadata: {
                        audience_type: params.audienceType,
                        category: 'Marketing'
                    }
                });
            }
        } else {
            const reason = result.error || 'Unknown Meta API error';
            if (!firstError) firstError = reason;
            console.error(`[Marketing] Failed to send to ${phone}:`, reason);
            errors.push({ phone, reason });
            failCount++;
        }
    }

    return { 
        success: failCount === 0, 
        message: `Campaign complete: ${successCount} sent, ${failCount} failed.`,
        error: firstError,
        errors: errors.length > 0 ? errors : undefined,
        messageId: firstMessageId
    };
}

export async function sendTestCampaignAction(params: {
    templateName: string;
    languageCode: string;
    testPhone: string;
    mappings: { index: number, value: string, mappingType: 'STATIC' | 'PREDEFINED', component: 'HEADER' | 'BODY' }[];
    headerMedia?: { type: string, url?: string, handle?: string };
    buttonUrlSuffix?: string;
}) {
    const supabase = await createClient();
    
    // Resolve variables with dummy data or just use static values
    const resolveValue = (m: any) => {
        if (m.mappingType === 'STATIC') return m.value || ' ';
        return `[${m.value}]`; // For test, just show the type
    };

    const headerParams = params.mappings
        .filter(m => m.component === 'HEADER')
        .sort((a, b) => a.index - b.index)
        .map(resolveValue);

    const bodyParams = params.mappings
        .filter(m => m.component === 'BODY')
        .sort((a, b) => a.index - b.index)
        .map(resolveValue);

    const result = await sendWhatsAppTemplate({
        to: params.testPhone,
        templateName: params.templateName,
        languageCode: params.languageCode,
        mediaType: params.headerMedia?.type as any,
        mediaUrl: params.headerMedia?.url,
        mediaHandle: params.headerMedia?.handle,
        headerParams,
        bodyParams,
        buttonUrlSuffix: params.buttonUrlSuffix
    });

    if (result.success && result.messageId) {
        // Log to analytics so we can also track test delivery
        await supabase.from('whatsapp_analytics').insert({
            wamid: result.messageId,
            status: 'sent',
            recipient_phone: params.testPhone,
            template_name: params.templateName,
            metadata: { category: 'Test' }
        });
    }

    return result;
}
