'use server';

import { revalidatePath } from 'next/cache';

const WA_API_VERSION = 'v21.0';

/**
 * Helper to get WhatsApp configuration from environment variables
 */
function getAuthConfig() {
    return {
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
        appId: process.env.WHATSAPP_APP_ID,
    };
}

/**
 * Fetches message templates from Meta Graph API
 */
export async function getWhatsAppTemplates() {
    try {
        const { businessAccountId, accessToken } = getAuthConfig();
        if (!businessAccountId || !accessToken) {
            throw new Error('WhatsApp configuration missing');
        }

        const url = `https://graph.facebook.com/${WA_API_VERSION}/${businessAccountId}/message_templates?limit=100`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            cache: 'no-store' // Disable caching to see immediate changes
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[WhatsApp Templates] Fetch Error:', data);
            throw new Error(data.error?.message || 'Failed to fetch templates');
        }

        return { success: true, data: data.data };
    } catch (err: any) {
        console.error('[WhatsApp Templates] getTemplates error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Creates a new message template
 */
export async function createWhatsAppTemplate(templateData: any) {
    try {
        const { businessAccountId, accessToken } = getAuthConfig();
        const url = `https://graph.facebook.com/${WA_API_VERSION}/${businessAccountId}/message_templates`;

        console.log('[WhatsApp Templates] Creating template with payload:', JSON.stringify(templateData, null, 2));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(templateData),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('[WhatsApp Templates] Meta API Error:', JSON.stringify(result, null, 2));
            return {
                success: false,
                error: result.error?.message || 'Failed to create template',
                details: result.error
            };
        }

        console.log('[WhatsApp Templates] Success! Template created:', result.id);
        revalidatePath('/admin/whatsapp');
        return { success: true, data: result };
    } catch (err: any) {
        console.error('[WhatsApp Templates] Create error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Updates an existing message template
 */
export async function editWhatsAppTemplate(templateName: string, templateData: any) {
    try {
        const { businessAccountId, accessToken } = getAuthConfig();
        const url = `https://graph.facebook.com/${WA_API_VERSION}/${businessAccountId}/message_templates`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...templateData,
                name: templateName,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('[WhatsApp Templates] Edit Error:', result);
            return {
                success: false,
                error: result.error?.message || 'Failed to edit template',
                details: result.error
            };
        }

        revalidatePath('/admin/whatsapp');
        return { success: true, data: result };
    } catch (err: any) {
        console.error('[WhatsApp Templates] Edit error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Deletes a message template
 */
export async function deleteWhatsAppTemplate(templateId: string, templateName: string, language?: string) {
    try {
        const { businessAccountId, accessToken } = getAuthConfig();

        let url = `https://graph.facebook.com/${WA_API_VERSION}/${businessAccountId}/message_templates?name=${templateName}`;
        if (language) {
            url += `&language=${language}`;
        }

        let response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        let result = await response.json();

        if (!response.ok && templateId) {
            const idUrl = `https://graph.facebook.com/${WA_API_VERSION}/${templateId}`;
            const idResponse = await fetch(idUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            const idResult = await idResponse.json();

            if (idResponse.ok) {
                result = idResult;
                response = idResponse;
            }
        }

        if (!response.ok) {
            console.error('[WhatsApp Templates] Delete Error details:', JSON.stringify(result, null, 2));
            return {
                success: false,
                error: result.error?.message || 'Failed to delete template',
                code: result.error?.code,
                subcode: result.error?.error_subcode
            };
        }

        revalidatePath('/admin/whatsapp');
        return { success: true };
    } catch (err: any) {
        console.error('[WhatsApp Templates] Delete error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Uploads a media file from a URL to Meta's Resumable Upload API
 */
export async function uploadMediaToMeta(url: string, fileType: string) {
    try {
        const { appId, accessToken } = getAuthConfig();
        if (!appId) throw new Error('WHATSAPP_APP_ID is missing from environment');

        const fileResponse = await fetch(url);
        if (!fileResponse.ok) throw new Error(`Failed to download file from URL: ${fileResponse.statusText}`);

        const blob = await fileResponse.blob();
        const fileLength = blob.size;

        let mimeType = blob.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
            const ext = url.split('.').pop()?.toLowerCase();
            if (ext === 'pdf') mimeType = 'application/pdf';
            else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
            else if (ext === 'png') mimeType = 'image/png';
            else if (ext === 'mp4') mimeType = 'video/mp4';
            else if (fileType === 'DOCUMENT') mimeType = 'application/pdf';
            else if (fileType === 'IMAGE') mimeType = 'image/jpeg';
            else if (fileType === 'VIDEO') mimeType = 'video/mp4';
        }

        const createSessionUrl = `https://graph.facebook.com/${WA_API_VERSION}/${appId}/uploads?file_length=${fileLength}&file_type=${mimeType}&access_token=${accessToken}`;

        const sessionResponse = await fetch(createSessionUrl, { method: 'POST' });
        const sessionResult = await sessionResponse.json();

        if (!sessionResponse.ok) {
            throw new Error(sessionResult.error?.message || 'Failed to create upload session');
        }

        const uploadSessionId = sessionResult.id;
        const uploadUrl = `https://graph.facebook.com/${WA_API_VERSION}/${uploadSessionId}`;
        const binaryData = await blob.arrayBuffer();

        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `OAuth ${accessToken}`,
                'file_offset': '0',
            },
            body: binaryData
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
            throw new Error(uploadResult.error?.message || 'Failed to upload binary content');
        }

        return { success: true, handle: uploadResult.h };
    } catch (err: any) {
        console.error('[WhatsApp Upload] Error:', err.message);
        return { success: false, error: err.message };
    }
}
