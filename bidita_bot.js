const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * CONFIGURATION
 */
const CONTACT_NAME = 'Bidita lpu';
const MESSAGE_TEXT = 'Tum sundari ho';
const MESSAGE_COUNT = 5;
const SESSION_PATH = path.join(__dirname, 'whatsapp_session');

(async () => {
    console.log('--------------------------------------------------');
    console.log('🚀 Bidita Bot starting (Ultimate Speed & Reliability)...');
    console.log(`📡 Targeting: "${CONTACT_NAME}"`);
    console.log(`💬 Message: "${MESSAGE_TEXT}" (${MESSAGE_COUNT} times)`);
    console.log('--------------------------------------------------');

    if (!fs.existsSync(SESSION_PATH)) {
        fs.mkdirSync(SESSION_PATH, { recursive: true });
    }

    const context = await chromium.launchPersistentContext(SESSION_PATH, {
        headless: false,
        viewport: { width: 1280, height: 800 },
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-extensions',
            '--disable-component-update',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-client-side-phishing-detection',
            '--disable-default-apps',
            '--disable-dev-shm-usage',
            '--disable-features=TranslateUI',
            '--disable-hang-monitor',
            '--disable-ipc-flooding-protection',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-renderer-backgrounding',
            '--disable-sync',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            '--use-mock-keychain'
        ],
        ignoreHTTPSErrors: true
    });

    const page = await context.newPage();
    page.setDefaultTimeout(60000); 

    // Performance: Block unnecessary resources
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,otf}', route => route.abort());

    console.log('🌐 Opening WhatsApp Web...');
    await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded' });

    // 1. WAIT FOR LOAD
    console.log('🔍 Waiting for WhatsApp list...');
    try {
        await page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 45000 });
        console.log('✅ WhatsApp Loaded!');
    } catch (e) {
        console.log('👉 ACTION REQUIRED: Please login/scan if needed.');
        await page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 0 });
        console.log('✅ Login confirmed!');
    }

    // 2. SEARCH AND OPEN CHAT
    const clickAggressive = async (locator) => {
        try {
            await locator.dispatchEvent('mousedown');
            await locator.click();
            return true;
        } catch (e) {
            return false;
        }
    };

    console.log(`🔎 Initiating search for "${CONTACT_NAME}"...`);
    let chatOpened = false;
    let retries = 3; // Reduced retries for speed

    while (retries > 0 && !chatOpened) {
        try {
            // A. Focus search box
            await page.keyboard.press('/');
            await page.waitForTimeout(200);

            const searchBoxSelectors = [
                'div[contenteditable="true"][data-tab="3"]',
                '[data-testid="search-input-element-role"]',
                '[aria-label="Search text input field"]'
            ];

            let searchBox = null;
            for (const selector of searchBoxSelectors) {
                const locator = page.locator(selector).first();
                if (await locator.isVisible()) {
                    searchBox = locator;
                    break;
                }
            }

            if (searchBox) {
                await searchBox.click();
                await page.keyboard.down('Control');
                await page.keyboard.press('A');
                await page.keyboard.up('Control');
                await page.keyboard.press('Backspace');
                
                // Instant typing
                await page.keyboard.type(CONTACT_NAME, { delay: 5 });
                
                console.log(`   Typed "${CONTACT_NAME}", waiting for results...`);
                
                const contactSelector = `span[title="${CONTACT_NAME}"]`;
                const result = page.locator(`[data-testid="chat-list"] ${contactSelector}, #pane-side ${contactSelector}`).first();
                
                try {
                    await result.waitFor({ state: 'visible', timeout: 5000 });
                    await clickAggressive(result);
                    
                    const messageBoxSelector = 'footer [contenteditable="true"], [data-testid="conversation-text-input"]';
                    await page.waitForSelector(messageBoxSelector, { timeout: 5000 });
                    chatOpened = true;
                    console.log('✅ Chat opened successfully!');
                } catch (e) {
                    console.log('   Results did not appear quickly. Retrying...');
                }
            }
        } catch (e) {
            console.log(`⚠️ Search attempt failed. Retrying...`);
        }
        
        if (!chatOpened) {
            retries--;
            if (retries > 0) await page.waitForTimeout(1000);
        }
    }

    if (!chatOpened) {
        console.log('❌ Auto-open failed. Please click "Bidita lpu" manually.');
        await page.waitForSelector('footer [contenteditable="true"]', { timeout: 0 });
        console.log('✅ Chat is now ready!');
    }

    // 3. BURST
    const messageBoxSelector = 'footer [contenteditable="true"], [data-testid="conversation-text-input"]';
    console.log(`🚀 Bursting "${MESSAGE_TEXT}" x ${MESSAGE_COUNT}...`);
    for (let i = 1; i <= MESSAGE_COUNT; i++) {
        try {
            const messageBox = page.locator(messageBoxSelector).first();
            await messageBox.click({ force: true });
            await page.keyboard.type(MESSAGE_TEXT, { delay: 5 });
            await page.keyboard.press('Enter');
            console.log(`   ➜ Sent ${i}/${MESSAGE_COUNT}`);
            // Reduced delay between bursts
            await page.waitForTimeout(300 + Math.random() * 200);
        } catch (err) {
            console.log(`   ⚠️ Message ${i} failed, retrying...`);
            i--;
        }
    }

    console.log('--------------------------------------------------');
    console.log('🏁 MISSION COMPLETE');
    console.log('--------------------------------------------------');

    await page.waitForTimeout(2000);
    await context.close();
})();
