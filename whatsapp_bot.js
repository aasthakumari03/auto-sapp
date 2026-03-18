const { chromium } = require('playwright');
const path = require('path');

/**
 * CONFIGURATION
 */
const CONTACT_NAME = 'Bidita lpu';
const MESSAGE_TEXT = 'Tum pyaari ho or yeh majak tha';
const MESSAGE_COUNT = 5;
const SESSION_PATH = path.join(__dirname, 'whatsapp_session');

(async () => {
    console.log('--------------------------------------------------');
    console.log('🚀 WhatsApp Automation Bot starting (Optimized)...');
    console.log('--------------------------------------------------');

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

    // 1. CHECK LOGIN / WAIT FOR LOGIN
    console.log('🔍 Waiting for WhatsApp to load...');
    try {
        await page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 45000 });
        console.log('✅ WhatsApp Loaded!');
    } catch (e) {
        console.log('👉 ACTION REQUIRED: Please scan the QR code if visible.');
        await page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 0 });
        console.log('✅ Login confirmed!');
    }

    // 2. SEARCH AND OPEN CHAT AUTOMATICALLY
    console.log(`🔎 Automatically opening chat: "${CONTACT_NAME}"...`);
    
    try {
        const searchBoxSelector = '[contenteditable="true"][data-tab="3"], [aria-label="Search"], [data-testid="search"]';
        await page.waitForSelector(searchBoxSelector, { timeout: 10000 });
        const searchBox = page.locator(searchBoxSelector).first();
        
        await searchBox.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        
        // Faster typing
        await page.keyboard.type(CONTACT_NAME, { delay: 10 });
        
        console.log(`   - Looking for "${CONTACT_NAME}" in results...`);
        const itemSelector = `[title="${CONTACT_NAME}"]`;
        const result = page.locator(itemSelector).first();
        
        await result.waitFor({ state: 'visible', timeout: 5000 });
        await result.click();
        
        console.log(`✅ Success: Chat with "${CONTACT_NAME}" opened.`);
    } catch (e) {
        console.log(`⚠️ Auto-search had an issue, checking if manually open?`);
    }

    // Wait for the message input box
    console.log(`⏳ Waiting for the message input box...`);
    const messageBoxSelectors = 'footer [contenteditable="true"], [data-testid="conversation-text-input"]';
    try {
        await page.waitForSelector(messageBoxSelectors, { timeout: 10000 });
        console.log('✅ Chat is ready!');
    } catch (e) {
        console.log('❌ Timed out waiting for message box. Please click manually.');
        await page.waitForSelector(messageBoxSelectors, { timeout: 0 });
    }

    // 3. SEND MESSAGES
    console.log(`💌 Automatically sending "${MESSAGE_TEXT}" ${MESSAGE_COUNT} times...`);
    
    for (let i = 1; i <= MESSAGE_COUNT; i++) {
        try {
            const messageBox = page.locator(messageBoxSelectors).first();
            await messageBox.click({ force: true });
            
            // Fast clear and type
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            await page.keyboard.type(MESSAGE_TEXT, { delay: 5 });
            await page.keyboard.press('Enter');

            console.log(`📈 Progress: ${i}/${MESSAGE_COUNT}`);

            // Reduced delay
            await page.waitForTimeout(400 + Math.random() * 300);
        } catch (e) {
            console.log(`⚠️ Retry message ${i}...`);
            i--; 
        }
    }

    console.log('--------------------------------------------------');
    console.log('🏁 MISSION COMPLETE');
    console.log('--------------------------------------------------');

    await page.waitForTimeout(2000);
    await context.close();
    console.log('👋 Bot closed.');
})();
