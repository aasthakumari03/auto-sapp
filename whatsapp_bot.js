const { chromium } = require('playwright');
const path = require('path');

/**
 * CONFIGURATION
 */
const CONTACT_NAME = 'Jais';
const MESSAGE_TEXT = 'I love you Shona Pari';
const MESSAGE_COUNT = 50;
const SESSION_PATH = path.join(__dirname, 'whatsapp_session');

(async () => {
    console.log('--------------------------------------------------');
    console.log('🚀 WhatsApp Automation Bot starting...');
    console.log('--------------------------------------------------');

    const context = await chromium.launchPersistentContext(SESSION_PATH, {
        headless: false,
        viewport: { width: 1280, height: 800 },
        args: ['--disable-blink-features=AutomationControlled'],
        // Ignore certificate errors and other potential blockers
        ignoreHTTPSErrors: true
    });

    const page = await context.newPage();
    
    console.log('🌐 Opening WhatsApp Web...');
    await page.goto('https://web.whatsapp.com');

    // 1. CHECK LOGIN / WAIT FOR LOGIN
    console.log('🔍 Waiting for WhatsApp to load and Login to be confirmed...');
    try {
        // Wait for the main app container or search box to appear
        await page.waitForSelector('#pane-side, [data-testid="search"], [aria-label="Search"]', { timeout: 30000 });
        console.log('✅ WhatsApp Loaded!');
    } catch (e) {
        console.log('👉 ACTION REQUIRED: Please scan the QR code if visible.');
        // Wait indefinitely for the login to happen
        await page.waitForSelector('#pane-side, [data-testid="search"], [aria-label="Search"]', { timeout: 0 });
        console.log('✅ Login confirmed!');
    }

    console.log('⏳ Waiting 5 seconds for stability...');
    await page.waitForTimeout(5000);

    // 2. SEARCH AND OPEN CHAT AUTOMATICALLY
    console.log(`🔎 Automatically opening chat: "${CONTACT_NAME}"...`);
    
    try {
        // Wait for the search box
        const searchBoxSelector = '[contenteditable="true"][data-tab="3"], [aria-label="Search"], [data-testid="search"]';
        await page.waitForSelector(searchBoxSelector, { timeout: 30000 });
        const searchBox = page.locator(searchBoxSelector).first();
        
        // Click and clear
        await searchBox.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        
        // Type the name
        await page.keyboard.type(CONTACT_NAME, { delay: 150 });
        await page.waitForTimeout(2000); // Wait for search results
        
        // Click the specific item in the list that matches the name
        console.log(`   - Looking for "${CONTACT_NAME}" in results...`);
        const itemSelector = `[title="${CONTACT_NAME}"]`;
        await page.waitForSelector(itemSelector, { timeout: 10000 });
        await page.click(itemSelector);
        
        // Final verify by checking the header
        await page.waitForSelector(`header span[title="${CONTACT_NAME}"]`, { timeout: 5000 });
        console.log(`✅ Success: Chat with "${CONTACT_NAME}" is now open.`);
    } catch (e) {
        console.log(`⚠️ Auto-search had an issue: ${e.message.split('\n')[0]}`);
        console.log(`👉 IF THE CHAT IS NOT OPEN: Please click on "${CONTACT_NAME}" yourself.`);
        // Wait for ANY message box to be visible as fallback
        await page.waitForSelector('footer [contenteditable="true"]', { timeout: 0 });
    }

    // 3. SEND MESSAGES
    console.log(`💌 Automatically sending "${MESSAGE_TEXT}" ${MESSAGE_COUNT} times...`);
    
    for (let i = 1; i <= MESSAGE_COUNT; i++) {
        try {
            // Re-find the message box to be safe
            const messageBoxSelector = 'footer [contenteditable="true"], [data-testid="conversation-text-input"]';
            await page.waitForSelector(messageBoxSelector, { timeout: 10000 });
            const messageBox = page.locator(messageBoxSelector).first();
            
            // Focus and click
            await messageBox.click();
            
            // Clear and Type
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            await page.keyboard.type(MESSAGE_TEXT, { delay: 10 });
            
            // Give it a tiny moment and send
            await page.waitForTimeout(300);
            await page.keyboard.press('Enter');
            
            // Fallback Send Button Click
            await page.waitForTimeout(200);
            const sendButton = page.locator('[data-testid="compose-btn-send"], [aria-label="Send"]');
            if (await sendButton.count() > 0 && await sendButton.isVisible()) {
                await sendButton.click();
            }

            console.log(`📈 Progress: ${i}/${MESSAGE_COUNT}`);

            // Natural delay
            await page.waitForTimeout(400 + Math.random() * 400);
        } catch (e) {
            console.log(`⚠️ Retry message ${i}...`);
            await page.waitForTimeout(2000);
            i--; 
        }
    }

    console.log('--------------------------------------------------');
    console.log('🏁 MISSION COMPLETE: All messages sent successfully!');
    console.log('--------------------------------------------------');

    await page.waitForTimeout(5000);
    await context.close();
    console.log('👋 Bot closed.');
})();
