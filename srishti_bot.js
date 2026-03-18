const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * CONFIGURATION
 */
const CONTACT_NAME = 'Srishti Thakur';
const MESSAGE_TEXT = 'Hey Beautiful';
const SESSION_PATH = path.join(__dirname, 'whatsapp_session');

(async () => {
    console.log('--------------------------------------------------');
    console.log('🚀 Srishti Bot starting...');
    console.log(`📡 Targeting: "${CONTACT_NAME}"`);
    console.log(`💬 Message: "${MESSAGE_TEXT}"`);
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
        console.log('✅ Login successful!');
    }

    // 2. SEARCH AND OPEN CHAT
    console.log(`🔎 Searching for "${CONTACT_NAME}"...`);
    
    // Quick focus search box
    await page.keyboard.press('/');
    await page.waitForTimeout(200);

    const searchBoxSelector = 'div[contenteditable="true"][data-tab="3"], [data-testid="search-input-element-role"]';
    const searchBox = page.locator(searchBoxSelector).first();
    
    if (await searchBox.isVisible()) {
        await searchBox.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        
        // Instant typing
        await page.keyboard.type(CONTACT_NAME, { delay: 5 });
        
        console.log(`   Typed "${CONTACT_NAME}", waiting for results...`);
        
        // Wait for results to appear
        const contactSelector = `span[title="${CONTACT_NAME}"], span[title="${CONTACT_NAME} (You)"]`;
        const result = page.locator(`[data-testid="chat-list"] ${contactSelector}, #pane-side ${contactSelector}`).first();
        
        try {
            await result.waitFor({ state: 'visible', timeout: 5000 });
            await result.click();
            console.log('✅ Chat opened successfully!');
        } catch (err) {
            console.log('❌ Could not find contact in search results.');
            process.exit(1);
        }
    } else {
        console.log('❌ Search box not found.');
        process.exit(1);
    }

    // 3. SEND MESSAGE
    const messageBoxSelector = 'footer [contenteditable="true"], [data-testid="conversation-text-input"]';
    console.log(`🚀 Sending message...`);
    try {
        await page.waitForSelector(messageBoxSelector, { timeout: 5000 });
        const messageBox = page.locator(messageBoxSelector).first();
        await messageBox.click({ force: true });
        await page.keyboard.type(MESSAGE_TEXT, { delay: 5 });
        await page.keyboard.press('Enter');
        console.log(`✅ Sent: "${MESSAGE_TEXT}"`);
    } catch (err) {
        console.log(`❌ Failed to send message: ${err.message}`);
    }

    console.log('--------------------------------------------------');
    console.log('🏁 MISSION COMPLETE');
    console.log('--------------------------------------------------');

    await page.waitForTimeout(2000);
    await context.close();
})();
