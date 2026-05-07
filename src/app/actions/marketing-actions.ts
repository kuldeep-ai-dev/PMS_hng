'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendWhatsAppTemplate } from './whatsapp';

/**
 * Fetches WhatsApp templates from Meta Cloud API
 */
export async function getWhatsAppTemplates() {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneId) {
        throw new Error('WhatsApp configuration missing in .env.local (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID)');
    }

    const res = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/message_templates`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.data || [];
}

/**
 * Syncs all verified contacts from the guest CRM into the marketing_leads table.
 */
export async function syncGuestContactsToLeads() {
    const supabase = await createClient();

    // 1. Fetch all guests with phone numbers
    const { data: guests } = await supabase
        .from('guests')
        .select('name, phone, email, state')
        .not('phone', 'is', null);

    if (!guests) return { success: false, message: 'No guests found' };

    // 2. Format and upsert into marketing_leads
    const leads = guests.map(g => ({
        full_name: g.name,
        phone_number: g.phone,
        email: g.email || '',
        region: g.state || 'Unknown',
        source: 'CRM_SYNC',
        status: 'active'
    }));

    const { error } = await supabase
        .from('marketing_leads')
        .upsert(leads, { onConflict: 'phone_number' });

    if (error) throw error;

    revalidatePath('/admin/marketing');
    return { success: true, count: leads.length };
}

/**
 * Launches a bulk WhatsApp campaign with dynamic media and variable mapping.
 */
export async function sendMarketingCampaignAction(data: {
    templateName: string;
    languageCode: string;
    audienceIds: string[];
    audienceType: 'hotel_guests' | 'restaurant_customers' | 'marketing_leads';
    mappings: { index: number, value: string, mappingType: 'STATIC' | 'PREDEFINED', component: 'HEADER' | 'BODY' }[];
    headerMedia?: { type: string, url: string, handle?: string };
    buttonUrlSuffix?: string;
}) {
    const supabase = await createClient();

    // 1. Create Campaign Log
    const { data: campaign, error: cErr } = await supabase
        .from('whatsapp_campaigns')
        .insert({
            name: `${data.templateName}_Blast_${new Date().getTime()}`,
            template_name: data.templateName,
            status: 'processing'
        })
        .select()
        .single();

    if (cErr) throw cErr;

    // 2. Fetch Leads based on Audience Type
    let leads: { phone_number: string, full_name: string }[] = [];

    if (data.audienceType === 'marketing_leads') {
        const { data: res } = await supabase.from('marketing_leads').select('phone_number, full_name').in('id', data.audienceIds);
        if (res) leads = res;
    } else if (data.audienceType === 'hotel_guests') {
        const { data: res } = await supabase.from('guests').select('phone_number:phone, full_name:name').in('id', data.audienceIds);
        if (res) leads = res;
    } else if (data.audienceType === 'restaurant_customers') {
        const { data: res } = await supabase.from('restaurant_orders').select('phone_number:customer_mobile, full_name:customer_name').in('id', data.audienceIds);
        if (res) leads = res;
    }

    if (!leads || leads.length === 0) {
        await supabase.from('whatsapp_campaigns').update({ status: 'failed' }).eq('id', campaign.id);
        throw new Error('No valid contacts found for the selected audience.');
    }

    // 3. Dispatch
    const results = await Promise.all(leads.map(async (lead) => {
        try {
            // Resolve variables for this specific lead
            const resolveVar = (m: any) => {
                if (m.mappingType === 'STATIC') return m.value;
                if (m.value === 'GUEST_NAME') return lead.full_name?.split(' ')[0] || 'Guest';
                if (m.value === 'FULL_NAME') return lead.full_name || 'Guest';
                if (m.value === 'PHONE_NUMBER') return lead.phone_number;
                return '';
            };

            const headerParams = data.mappings.filter(m => m.component === 'HEADER').sort((a, b) => a.index - b.index).map(resolveVar);
            const bodyParams = data.mappings.filter(m => m.component === 'BODY').sort((a, b) => a.index - b.index).map(resolveVar);

            await sendWhatsAppTemplate({
                to: lead.phone_number,
                templateName: data.templateName,
                languageCode: data.languageCode,
                mediaType: data.headerMedia?.type as any,
                mediaUrl: data.headerMedia?.url,
                mediaHandle: data.headerMedia?.handle,
                headerParams,
                bodyParams,
                buttonUrlSuffix: data.buttonUrlSuffix
            });
            return { phone: lead.phone_number, success: true };
        } catch (err) {
            return { phone: lead.phone_number, success: false };
        }
    }));

    const delivered = results.filter(r => r.success).length;

    // 4. Update Status
    await supabase.from('whatsapp_campaigns').update({
        status: 'completed',
        sent_count: leads.length,
        delivered_count: delivered
    }).eq('id', campaign.id);

    revalidatePath('/admin/marketing');
    return { success: true, delivered, message: `Sent to ${delivered} of ${leads.length} contacts`, messageId: campaign.id };
}

/**
 * Sends a single test message for the campaign builder.
 */
export async function sendTestCampaignAction(data: {
    templateName: string;
    languageCode: string;
    testPhone: string;
    mappings: { index: number, value: string, mappingType: 'STATIC' | 'PREDEFINED', component: 'HEADER' | 'BODY' }[];
    headerMedia?: { type: string, url: string, handle?: string };
    buttonUrlSuffix?: string;
}) {
    try {
        const resolveVar = (m: any) => {
            if (m.mappingType === 'STATIC') return m.value || `[${m.index}]`;
            if (m.value === 'GUEST_NAME') return 'TestGuest';
            if (m.value === 'FULL_NAME') return 'Test Guest Fullname';
            if (m.value === 'PHONE_NUMBER') return data.testPhone;
            return 'TestVar';
        };

        const headerParams = data.mappings.filter(m => m.component === 'HEADER').sort((a, b) => a.index - b.index).map(resolveVar);
        const bodyParams = data.mappings.filter(m => m.component === 'BODY').sort((a, b) => a.index - b.index).map(resolveVar);

        const res = await sendWhatsAppTemplate({
            to: data.testPhone,
            templateName: data.templateName,
            languageCode: data.languageCode,
            mediaType: data.headerMedia?.type as any,
            mediaUrl: data.headerMedia?.url,
            mediaHandle: data.headerMedia?.handle,
            headerParams,
            bodyParams,
            buttonUrlSuffix: data.buttonUrlSuffix
        });

        if (!res.success) throw new Error(res.error || 'Failed to send test message');
        const supabase = await createClient();
        if (res.success && res.messageId) {
            await supabase.from('whatsapp_analytics').insert({
                wamid: res.messageId,
                status: 'sent',
                template_type: 'test',
                guest_name: 'Campaign Test',
                guest_phone: data.testPhone,
                sent_at: new Date().toISOString()
            });
        }

        return { success: true, messageId: res.messageId };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
