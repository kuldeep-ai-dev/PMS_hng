require('dotenv').config({ path: '.env.local' });
const { testSendWhatsApp } = require('./.next/server/app/actions/whatsapp.js');
async function run() {
    console.log("Starting test...");
    const result = await testSendWhatsApp('917896094895', 'restaurant');
    console.log("Result:", result);
}
run().catch(console.error);
