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

    await page.waitForTimeout(2000);

    // 2. SEARCH AND OPEN CHAT
    console.log(`🔎 Searching for "${CONTACT_NAME}"...`);
    
    // Quick focus search box
    await page.keyboard.press('/');
    // No need for long timeout if already loaded
    await page.waitForTimeout(300);

    const searchBoxSelector = 'div[contenteditable="true"][data-tab="3"], [data-testid="search-input-element-role"]';
    const searchBox = page.locator(searchBoxSelector).first();
    
    if (await searchBox.isVisible()) {
        await searchBox.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        // Faster typing
        await page.keyboard.type(CONTACT_NAME, { delay: 30 });
        
        console.log(`   Typed "${CONTACT_NAME}", waiting for results...`);
        // Reduced wait time for results
        await page.waitForTimeout(1000);

        // Look for the contact in the results
        const contactSelector = `span[title="${CONTACT_NAME}"], span[title="${CONTACT_NAME} (You)"]`;
        const result = page.locator(`[data-testid="chat-list"] ${contactSelector}, #pane-side ${contactSelector}`).first();
        
        if (await result.isVisible()) {
            await result.click();
            console.log('✅ Chat opened successfully!');
        } else {
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
        // Wait specifically for the message box to be clickable
        await page.waitForSelector(messageBoxSelector, { timeout: 5000 });
        const messageBox = page.locator(messageBoxSelector).first();
        await messageBox.click({ force: true });
        await page.keyboard.type(MESSAGE_TEXT, { delay: 20 });
        await page.keyboard.press('Enter');
        console.log(`✅ Sent: "${MESSAGE_TEXT}"`);
    } catch (err) {
        console.log(`❌ Failed to send message: ${err.message}`);
    }

    console.log('--------------------------------------------------');
    console.log('🏁 MISSION COMPLETE');
    console.log('--------------------------------------------------');

    await page.waitForTimeout(5000);
    await context.close();
})();
