import puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';

/**
 * Global Cache to prevent browser leaks during Next.js Hot Module Replacement (HMR)
 */
const globalForPuppeteer = globalThis as unknown as {
    browser: Browser | undefined;
};

/**
 * Intelligent Browser Launcher for Puppeteer.
 * Implements a Singleton pattern to reuse the browser across multiple PDF requests.
 */
export async function getBrowser(): Promise<Browser> {
    // 1. Reuse existing connected browser if available
    if (globalForPuppeteer.browser && globalForPuppeteer.browser.isConnected()) {
        console.log('[Puppeteer] Reusing existing browser instance');
        return globalForPuppeteer.browser;
    }

    const browserlessToken = process.env.BROWSERLESS_API_KEY?.trim();
    const isMac = process.platform === 'darwin';
    const isDev = process.env.NODE_ENV === 'development';

    // 2. Logic to decide between Remote (Browserless) vs Local
    // PRODUCTION / CLOUD: Always prioritize Remote Execution if token exists
    if (browserlessToken) {
        console.log('[Puppeteer] Connecting to Browserless.io...');
        globalForPuppeteer.browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessToken}`,
        });
        return globalForPuppeteer.browser!;
    }

    // 3. ON MAC / LOCAL DEV: Fallback to local Google Chrome
    if (isMac || isDev) {
        console.log('[Puppeteer] Launching local Google Chrome...');
        const standardMacChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

        // Try to launch with standard Mac path if it exists, else let puppeteer find its bundled one
        const launchOptions: any = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        };

        if (isMac) {
            launchOptions.executablePath = standardMacChromePath;
        }

        globalForPuppeteer.browser = await puppeteer.launch(launchOptions);
        return globalForPuppeteer.browser!;
    }

    // 4. Default Fallback
    console.log('[Puppeteer] Launching default bundled browser...');
    try {
        globalForPuppeteer.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        return globalForPuppeteer.browser!;
    } catch (e) {
        console.error('[Puppeteer] CRITICAL: Failed to launch local/bundled browser.');
        if (!isMac && !browserlessToken) {
            throw new Error(
                'PDF Generation failed: Could not find Chrome on this Linux/Server environment. ' +
                'Action Required: Please set the BROWSERLESS_API_KEY environment variable to use cloud-based browser execution.'
            );
        }
        throw e;
    }
}
