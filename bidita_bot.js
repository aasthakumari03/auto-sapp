const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * CONFIGURATION
 */
const CONTACT_NAME = 'Bidita lpu';
const MESSAGE_TEXT = 'Tum sundar ho';
const MESSAGE_COUNT = 10;
const SESSION_PATH = path.join(__dirname, 'whatsapp_session');

(async () => {
    console.log('--------------------------------------------------');
    console.log('🚀 Bidita Bot starting (Ultra Speed)...');
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
    console.log('🔍 Waiting for WhatsApp list...');
    try {
        await page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 60000 });
        console.log('✅ WhatsApp Loaded!');
    } catch (e) {
        console.log('👉 ACTION REQUIRED: Please login/scan if needed.');
        await page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 0 });
    }

    // 2. OPEN CHAT
    const clickContact = async (locator) => {
        await locator.dispatchEvent('mousedown');
        await locator.click();
    };

    console.log(`🔎 Locating "${CONTACT_NAME}"...`);
    const contactSelector = `span[title="${CONTACT_NAME}"]`;
    const visibleContact = page.locator(`[data-testid="chat-list"] ${contactSelector}, #pane-side ${contactSelector}`).first();
    
    if (await visibleContact.isVisible()) {
        console.log('   Contact visible! Clicking...');
        await clickContact(visibleContact);
    } else {
        console.log('   Searching...');
        const searchBoxSelector = 'div[contenteditable="true"][data-tab="3"], [data-testid="search-input-element-role"], [aria-label="Search text input field"]';
        
        let searchBox = page.locator(searchBoxSelector).first();
        if (!(await searchBox.isVisible())) {
            const searchIcon = page.locator('[data-testid="search"], [aria-label="Search"]').first();
            await searchIcon.click();
            await page.waitForTimeout(500);
        }

        await searchBox.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(CONTACT_NAME);
        
        const result = page.locator(`[data-testid="chat-list"] ${contactSelector}, #pane-side ${contactSelector}`).first();
        await result.waitFor({ state: 'visible', timeout: 15000 });
        await clickContact(result);
    }

    const messageBoxSelector = 'footer [contenteditable="true"], [data-testid="conversation-text-input"]';
    console.log('⏳ Waiting for message box...');
    await page.waitForSelector(messageBoxSelector, { timeout: 15000 });
    console.log('✅ Ready to send!');

    // 3. BURST
    console.log(`🚀 Bursting "${MESSAGE_TEXT}" x ${MESSAGE_COUNT}...`);
    for (let i = 1; i <= MESSAGE_COUNT; i++) {
        const messageBox = page.locator(messageBoxSelector).first();
        await messageBox.click({ force: true });
        await page.keyboard.type(MESSAGE_TEXT);
        await page.keyboard.press('Enter');
        console.log(`   ➜ Sent ${i}/${MESSAGE_COUNT}`);
        await page.waitForTimeout(200 + Math.random() * 200);
    }

    console.log('--------------------------------------------------');
    console.log('🏁 MISSION COMPLETE: All messages sent!');
    console.log('--------------------------------------------------');

    await page.waitForTimeout(3000);
    await context.close();
    console.log('👋 Browser closed.');
})();
