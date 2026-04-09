require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function sendWhatsAppTemplate({
    to,
    templateName,
    bodyParams,
    headerDocUrl,
    headerDocFilename,
    buttonUrlSuffix
}) {
    try {
        const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            to: to,
            type: 'template',
            template: {
                name: templateName,
                language: { code: 'en' },
                components: []
            }
        };

        if (headerDocUrl) {
            payload.template.components.push({
                type: 'header',
                parameters: [{
                    type: 'document',
                    document: {
                        link: headerDocUrl,
                        filename: headerDocFilename || 'Document.pdf'
                    }
                }]
            });
        }

        if (bodyParams && bodyParams.length > 0) {
            payload.template.components.push({
                type: 'body',
                parameters: bodyParams.map(text => ({
                    type: 'text',
                    text: String(text)
                }))
            });
        }

        if (buttonUrlSuffix) {
            payload.template.components.push({
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [{
                    type: 'text',
                    text: buttonUrlSuffix
                }]
            });
        }

        console.log("Sending payload:", JSON.stringify(payload, null, 2));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("Meta Response:", JSON.stringify(data, null, 2));

        return data;
    } catch (err) {
        console.error("Error:", err);
    }
}

async function test() {
    await sendWhatsAppTemplate({
        to: '917896094895',
        templateName: 'restaurant_thankyou',
        headerDocUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        headerDocFilename: 'Test_Restaurant_Bill.pdf',
        bodyParams: [
            'Test Guest',
            'Saffron Stay',
            'Order #TEST-123',
            '₹1,250',
            '07 Apr 2026'
        ],
        buttonUrlSuffix: 'test_rest_tracker'
    });
}

test();
