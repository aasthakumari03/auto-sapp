const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CONTACT_NAME = 'Jais';
const TRIGGER_MESSAGE = 'Kkrh';
const RESPONSE_MESSAGE = 'Vibing on my own baby';
const SESSION_PATH = path.join(__dirname, 'whatsapp_session');

(async () => {
    console.log('--------------------------------------------------');
    console.log('🚀 WhatsApp Responder Bot starting...');
    console.log(`📡 Monitoring "${CONTACT_NAME}" for "${TRIGGER_MESSAGE}"...`);
    console.log('--------------------------------------------------');

    // Ensure session directory exists
    if (!fs.existsSync(SESSION_PATH)) {
        fs.mkdirSync(SESSION_PATH, { recursive: true });
    }

    const context = await chromium.launchPersistentContext(SESSION_PATH, {
        headless: false,
        viewport: { width: 1280, height: 800 },
        args: ['--disable-blink-features=AutomationControlled'],
        ignoreHTTPSErrors: true
    });

    const page = await context.newPage();
    
    // Increase default timeout to 2 minutes for slow loads/auth
    page.setDefaultTimeout(120000);

    console.log('🌐 Opening WhatsApp Web...');
    await page.goto('https://web.whatsapp.com');

    // 1. CHECK LOGIN / WAIT FOR LOGIN
    console.log('🔍 Waiting for WhatsApp to load and Login to be confirmed...');
    try {
        // Wait for search box or chat list to appear, if it fails within 1 min, check for QR code
        await page.waitForSelector('#pane-side, [data-testid="search"], [aria-label="Search"]', { timeout: 45000 });
        console.log('✅ WhatsApp Loaded!');
    } catch (e) {
        console.log('👉 ACTION REQUIRED: Please scan the QR code if visible on the screen.');
        try {
            // Wait indefinitely if QR code is visible
            await page.waitForSelector('#pane-side, [data-testid="search"], [aria-label="Search"]', { timeout: 0 });
            console.log('✅ Login confirmed!');
        } catch (err) {
            console.error('❌ Failed to detect login. Please try again.');
            await context.close();
            process.exit(1);
        }
    }

    // 2. SEARCH AND OPEN CHAT
    console.log(`🔎 Automatically opening chat: "${CONTACT_NAME}"...`);
    
    let chatOpened = false;
    let retries = 3;
    while (retries > 0 && !chatOpened) {
        try {
            const searchBoxSelector = '[contenteditable="true"][data-tab="3"], [aria-label="Search"], [data-testid="search"]';
            await page.waitForSelector(searchBoxSelector, { timeout: 20000 });
            const searchBox = page.locator(searchBoxSelector).first();
            
            await searchBox.click();
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            
            await page.keyboard.type(CONTACT_NAME, { delay: 150 });
            await page.waitForTimeout(2000); 
            
            const itemSelector = `[title="${CONTACT_NAME}"]`;
            await page.waitForSelector(itemSelector, { timeout: 10000 });
            await page.click(itemSelector);
            
            // Verify chat header
            await page.waitForSelector(`header span[title="${CONTACT_NAME}"]`, { timeout: 10000 });
            console.log(`✅ Success: Chat with "${CONTACT_NAME}" is now open.`);
            chatOpened = true;
        } catch (e) {
            console.log(`⚠️ Retry opening chat... (${retries} attempts left)`);
            retries--;
            await page.waitForTimeout(3000);
        }
    }

    if (!chatOpened) {
        console.error('❌ Could not open chat automatically. Please click it manually.');
        // Wait for message box as fallback
        await page.waitForSelector('footer [contenteditable="true"]', { timeout: 0 });
    }

    console.log(`✅ Monitoring for "${TRIGGER_MESSAGE}"...`);

    let lastRepliedMessageId = null;

    while (true) {
        try {
            const messages = await page.locator('[data-testid="msg-container"]').all();
            
            if (messages.length > 0) {
                const latestMessage = messages[messages.length - 1];
                const messageTextContent = await latestMessage.innerText();
                const messageId = await latestMessage.getAttribute('data-id');

                const isOutgoing = await latestMessage.evaluate(node => {
                    return node.closest('.message-out') !== null || node.innerHTML.includes('data-testid="msg-check"');
                });

                if (!isOutgoing && messageId !== lastRepliedMessageId) {
                    if (messageTextContent.toLowerCase().includes(TRIGGER_MESSAGE.toLowerCase())) {
                        console.log(`🔔 Trigger detected: "${messageTextContent}"`);
                        
                        const messageBoxSelector = 'footer [contenteditable="true"], [data-testid="conversation-text-input"]';
                        await page.waitForSelector(messageBoxSelector);
                        const messageBox = page.locator(messageBoxSelector).first();

                        await messageBox.click();
                        await page.fill(messageBoxSelector, RESPONSE_MESSAGE);
                        await page.keyboard.press('Enter');
                        
                        console.log(`📤 Replied: "${RESPONSE_MESSAGE}"`);
                        lastRepliedMessageId = messageId;
                    }
                }
            }
        } catch (error) {
            // Quietly ignore temporary DOM errors during scroll/refresh
        }

        await page.waitForTimeout(2000);
    }
})();
