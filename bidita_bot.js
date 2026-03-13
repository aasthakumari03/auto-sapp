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
    console.log('🚀 Bidita Bot starting (v3 Ultra Reliable)...');
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
            '--disable-setuid-sandbox'
        ],
        ignoreHTTPSErrors: true
    });

    const page = await context.newPage();
    page.setDefaultTimeout(120000); 

    console.log('🌐 Opening WhatsApp Web...');
    await page.goto('https://web.whatsapp.com');

    // 1. WAIT FOR LOAD
    console.log('🔍 Waiting for WhatsApp to load...');
    try {
        await page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 60000 });
        console.log('✅ WhatsApp Loaded!');
    } catch (e) {
        console.log('👉 ACTION REQUIRED: Please login/scan if needed.');
        await page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 0 });
    }

    // Delay to let UI settle
    await page.waitForTimeout(5000);

    // 2. OPEN CHAT
    const clickAggressive = async (locator) => {
        await locator.dispatchEvent('mousedown');
        await locator.click();
    };

    console.log(`🔎 Locating "${CONTACT_NAME}"...`);
    const contactSelector = `span[title="${CONTACT_NAME}"]`;
    const visibleContact = page.locator(`[data-testid="chat-list"] ${contactSelector}, #pane-side ${contactSelector}`).first();
    
    let chatOpened = false;
    if (await visibleContact.isVisible()) {
        console.log('   Contact visible! Clicking...');
        await clickAggressive(visibleContact);
        chatOpened = true;
    } 
    
    // If not opened or click failed, search
    if (!chatOpened) {
        console.log('   Starting robust search flow...');
        const searchBoxSelectors = [
            'div[contenteditable="true"][data-tab="3"]',
            '[data-testid="search-input-element-role"]',
            '[aria-label="Search text input field"]',
            'div[title="Search input textbox"]'
        ];

        let searchBoxFound = false;
        for (const selector of searchBoxSelectors) {
            const locator = page.locator(selector).first();
            if (await locator.isVisible()) {
                await locator.click();
                searchBoxFound = true;
                break;
            }
        }

        if (!searchBoxFound) {
            console.log('   Search input not visible. Trying to click search button/icon...');
            const searchIcon = page.locator('[data-testid="search"], [aria-label="Search"], button:has(span[data-testid="search"])').first();
            if (await searchIcon.isVisible()) {
                await searchIcon.click();
                await page.waitForTimeout(2000);
            }
        }

        // Try to find the box after potentially clicking search icon
        const finalSearchBox = page.locator(searchBoxSelectors.join(', ')).first();
        try {
            await finalSearchBox.waitFor({ state: 'visible', timeout: 15000 });
            await finalSearchBox.click();
            
            // Clear and fill
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            await page.keyboard.type(CONTACT_NAME, { delay: 100 });
            
            console.log(`   Typed name, waiting for results...`);
            await page.waitForTimeout(5000);
            
            const result = page.locator(`[data-testid="chat-list"] ${contactSelector}, #pane-side ${contactSelector}`).first();
            await result.waitFor({ state: 'visible', timeout: 15000 });
            await clickAggressive(result);
            chatOpened = true;
        } catch (err) {
            console.log('   Search flow failed. Trying manual enter/click fallback.');
        }
    }

    const messageBoxSelector = 'footer [contenteditable="true"], [data-testid="conversation-text-input"]';
    if (!chatOpened) {
        console.log('❌ Auto-open failed. Please click "Bidita lpu" manually.');
    }

    // Wait for message box to be visible as the final signal
    await page.waitForSelector(messageBoxSelector, { timeout: 0 });
    console.log('✅ Chat is ready!');

    // 3. BURST (5 TIMES)
    console.log(`🚀 Bursting "${MESSAGE_TEXT}" x ${MESSAGE_COUNT}...`);
    for (let i = 1; i <= MESSAGE_COUNT; i++) {
        try {
            const messageBox = page.locator(messageBoxSelector).first();
            await messageBox.click({ force: true });
            await page.keyboard.type(MESSAGE_TEXT);
            await page.keyboard.press('Enter');
            console.log(`   ➜ Sent ${i}/${MESSAGE_COUNT}`);
            await page.waitForTimeout(500 + Math.random() * 500);
        } catch (err) {
            console.log(`   ⚠️ Message ${i} failed, retrying...`);
            i--;
        }
    }

    console.log('--------------------------------------------------');
    console.log('🏁 MISSION COMPLETE: All messages sent!');
    console.log('--------------------------------------------------');

    await page.waitForTimeout(5000);
    await context.close();
})();
