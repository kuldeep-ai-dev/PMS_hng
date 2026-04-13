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
    // ON MAC / DEVELOPMENT: Prioritize local Chrome even if token exists (faster + avoids localhost tunnel issues)
    if (isMac || (isDev && !browserlessToken)) {
        console.log('[Puppeteer] Launching local Google Chrome on macOS...');
        const standardMacChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        
        globalForPuppeteer.browser = await puppeteer.launch({
            headless: true,
            executablePath: standardMacChromePath,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });
        return globalForPuppeteer.browser!;
    }

    // 3. Remote Execution (Production / Cloud)
    if (browserlessToken) {
        console.log('[Puppeteer] Connecting to Browserless.io...');
        globalForPuppeteer.browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessToken}`,
        });
        return globalForPuppeteer.browser!;
    }

    // 4. Default Fallback
    console.log('[Puppeteer] Launching default bundled browser...');
    globalForPuppeteer.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
    });
    
    return globalForPuppeteer.browser!;
}
