const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * CONFIGURATION
 */
const CONTACT_NAME = 'Jais';
const BURST_MESSAGE = 'I Love you Bubbuu';
const BURST_COUNT = 10;
const TRIGGER_MESSAGE = 'Kkrh';
const RESPONSE_MESSAGE = 'Vibing on my own baby';
const SESSION_PATH = path.join(__dirname, 'whatsapp_session');

(async () => {
    console.log('--------------------------------------------------');
    console.log('🚀 WhatsApp Bot starting...');
    console.log(`📡 Targeting: "${CONTACT_NAME}"`);
    console.log(`💖 Initial Burst: "${BURST_MESSAGE}" (${BURST_COUNT} times)`);
    console.log(`📡 Monitoring for: "${TRIGGER_MESSAGE}"`);
    console.log('--------------------------------------------------');

    // Ensure session directory exists
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
    page.setDefaultTimeout(120000); // 2 minutes

    console.log('🌐 Opening WhatsApp Web...');
    await page.goto('https://web.whatsapp.com');

    // 1. WAIT FOR LOGIN
    console.log('🔍 Waiting for WhatsApp to load...');
    try {
        await page.waitForSelector('#pane-side, [data-testid="search"], [aria-label="Search"]', { timeout: 45000 });
        console.log('✅ WhatsApp Loaded!');
    } catch (e) {
        console.log('👉 ACTION REQUIRED: Please scan the QR code if visible.');
        try {
            await page.waitForSelector('#pane-side, [data-testid="search"], [aria-label="Search"]', { timeout: 0 });
            console.log('✅ Login confirmed!');
        } catch (err) {
            console.error('❌ Login failed.');
            await context.close();
            process.exit(1);
        }
    }

    // 2. OPEN CHAT
    console.log(`🔎 Searching for "${CONTACT_NAME}"...`);
    let chatOpened = false;
    let retries = 5;
    
    while (retries > 0 && !chatOpened) {
        try {
            // Wait for search box using multiple common selectors
            const searchBoxSelector = 'div[contenteditable="true"][data-tab="3"], [data-testid="search-input-element-role"], [aria-label="Search text input field"]';
            await page.waitForSelector(searchBoxSelector, { timeout: 20000 });
            const searchBox = page.locator(searchBoxSelector).first();
            
            await searchBox.click();
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            
            await page.keyboard.type(CONTACT_NAME, { delay: 100 });
            await page.waitForTimeout(3000); // Wait for results
            
            // Look for the contact in the side pane results
            // We use a broader approach: look for the title in the chat list area
            const contactSelector = `span[title="${CONTACT_NAME}"], [data-testid="cell-frame-container"] span[title="${CONTACT_NAME}"]`;
            await page.waitForSelector(contactSelector, { timeout: 10000 });
            
            // Click the one specifically in the side pane / search results
            const results = page.locator(contactSelector);
            const count = await results.count();
            
            let clicked = false;
            for (let i = 0; i < count; i++) {
                const res = results.nth(i);
                if (await res.isVisible()) {
                    await res.click();
                    clicked = true;
                    break;
                }
            }
            
            if (!clicked) throw new Error('Result found but not clickable');

            // Confirm it's open by checking the header
            await page.waitForSelector(`header span[title="${CONTACT_NAME}"]`, { timeout: 10000 });
            console.log(`✅ Success: Chat with "${CONTACT_NAME}" is open.`);
            chatOpened = true;
        } catch (e) {
            console.log(`⚠️ Search/Open failed: ${e.message.split('\n')[0]}. Retrying...`);
            retries--;
            await page.waitForTimeout(3000);
        }
    }

    if (!chatOpened) {
        console.log('❌ Auto-search failed multiple times. Please click the chat manually.');
        await page.waitForSelector('footer [contenteditable="true"]', { timeout: 0 });
    }

    // 3. INITIAL BURST
    console.log(`🚀 Sending initial burst: "${BURST_MESSAGE}" x ${BURST_COUNT}...`);
    const messageBoxSelector = 'footer [contenteditable="true"], [data-testid="conversation-text-input"]';
    
    for (let i = 1; i <= BURST_COUNT; i++) {
        try {
            await page.waitForSelector(messageBoxSelector);
            const messageBox = page.locator(messageBoxSelector).first();
            await messageBox.click();
            await page.fill(messageBoxSelector, BURST_MESSAGE);
            await page.keyboard.press('Enter');
            console.log(`📈 Burst Progress: ${i}/${BURST_COUNT}`);
            await page.waitForTimeout(500 + Math.random() * 500);
        } catch (e) {
            console.log(`⚠️ Burst retry ${i}...`);
            i--;
        }
    }
    console.log('✅ Burst complete.');

    // 4. MONITORING LOOP
    console.log(`📡 Now monitoring for "${TRIGGER_MESSAGE}"...`);
    let lastRepliedMessageId = null;

    while (true) {
        try {
            const messages = await page.locator('[data-testid="msg-container"]').all();
            
            if (messages.length > 0) {
                const latestMessage = messages[messages.length - 1];
                const messageTextContent = await latestMessage.innerText();
                const messageId = await latestMessage.getAttribute('data-id');

                // Check if it's an incoming message
                const isOutgoing = await latestMessage.evaluate(node => {
                    return node.closest('.message-out') !== null || 
                           node.innerHTML.includes('data-testid="msg-check"') ||
                           node.innerHTML.includes('data-testid="msg-dblcheck"');
                });

                if (!isOutgoing && messageId !== lastRepliedMessageId) {
                    if (messageTextContent.toLowerCase().includes(TRIGGER_MESSAGE.toLowerCase())) {
                        console.log(`🔔 Trigger detected: "${messageTextContent}"`);
                        
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
            // Temporary error handling for DOM changes
        }
        await page.waitForTimeout(2000);
    }
})();
