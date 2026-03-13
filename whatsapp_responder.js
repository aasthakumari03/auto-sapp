const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * CONFIGURATION
 */
const CONTACT_NAME = 'Jais';
const BURST_MESSAGE = 'I Love you Bubuu';
const BURST_COUNT = 5;
const TRIGGER_MESSAGE = 'Kkrh';
const RESPONSE_MESSAGE = 'Vibing on my own baby';
const SESSION_PATH = path.join(__dirname, 'whatsapp_session');

(async () => {
    console.log('--------------------------------------------------');
    console.log('🚀 WhatsApp Bot starting (v3 Robust Search)...');
    console.log(`📡 Targeting: "${CONTACT_NAME}"`);
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
        console.log('👉 ACTION REQUIRED: Please log in / scan QR code.');
        await page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 0 });
        console.log('✅ Login confirmed!');
    }

    await page.waitForTimeout(5000);

    // 2. CHECK IF CHAT IS ALREADY VISIBLE (SAVES SEARCH TIME)
    console.log(`🔎 Checking if "${CONTACT_NAME}" is already visible in the list...`);
    const contactSelector = `span[title="${CONTACT_NAME}"]`;
    const visibleContact = page.locator(`[data-testid="chat-list"] ${contactSelector}, #pane-side ${contactSelector}`).first();
    
    let chatOpened = false;
    if (await visibleContact.isVisible()) {
        console.log(`   Found "${CONTACT_NAME}" in the list! Clicking...`);
        await visibleContact.click();
        try {
            await page.waitForSelector(`header span[title="${CONTACT_NAME}"]`, { timeout: 10000 });
            chatOpened = true;
            console.log('✅ Chat opened directly from list.');
        } catch (err) {
            console.log('   Click didn\'t seem to open the chat header. Proceeding to search.');
        }
    }

    // 3. ROBUST SEARCH IF NOT OPENED
    if (!chatOpened) {
        console.log(`🔎 Proceeding to search for "${CONTACT_NAME}"...`);
        let retries = 3;
        while (retries > 0 && !chatOpened) {
            try {
                // Try to find the search box input first
                const searchBoxSelector = 'div[contenteditable="true"][data-tab="3"], [data-testid="search-input-element-role"], [aria-label="Search text input field"]';
                let searchBox = page.locator(searchBoxSelector).first();

                if (!(await searchBox.isVisible())) {
                    console.log('   Search input not found. Trying to click search icon first...');
                    const searchIcon = page.locator('[data-testid="search"], [aria-label="Search"], button:has(span[data-testid="search"])').first();
                    if (await searchIcon.isVisible()) {
                        await searchIcon.click();
                        await page.waitForTimeout(1000);
                    }
                }

                await searchBox.waitFor({ state: 'visible', timeout: 15000 });
                await searchBox.click();
                await page.waitForTimeout(500);

                // Force clear
                await page.keyboard.down('Control');
                await page.keyboard.press('A');
                await page.keyboard.up('Control');
                await page.keyboard.press('Backspace');
                await page.waitForTimeout(500);

                // Type
                await page.keyboard.type(CONTACT_NAME, { delay: 150 });
                console.log(`   Typed "${CONTACT_NAME}", waiting for results...`);
                await page.waitForTimeout(5000);

                // Click result
                const result = page.locator(`[data-testid="chat-list"] ${contactSelector}, #pane-side ${contactSelector}`).first();
                await result.waitFor({ state: 'visible', timeout: 10000 });
                await result.click();

                await page.waitForSelector(`header span[title="${CONTACT_NAME}"]`, { timeout: 15000 });
                console.log(`✅ Success: Chat with "${CONTACT_NAME}" is open.`);
                chatOpened = true;
            } catch (e) {
                console.log(`⚠️ Search attempt failed: ${e.message.split('\n')[0]}. Retrying...`);
                retries--;
                await page.waitForTimeout(3000);
            }
        }
    }

    if (!chatOpened) {
        console.log('❌ Auto-search failed. Please click "Jais" manually.');
        await page.waitForSelector(`header span[title="${CONTACT_NAME}"]`, { timeout: 0 });
        console.log('✅ Manual entry detected!');
    }

    // 4. MESSAGE BURST
    console.log(`🚀 Sending BURST: "${BURST_MESSAGE}" x ${BURST_COUNT}...`);
    const messageBoxSelector = 'footer [contenteditable="true"], [data-testid="conversation-text-input"]';
    
    for (let i = 1; i <= BURST_COUNT; i++) {
        try {
            await page.waitForSelector(messageBoxSelector, { timeout: 10000 });
            const messageBox = page.locator(messageBoxSelector).first();
            await messageBox.click();
            await page.keyboard.type(BURST_MESSAGE);
            await page.keyboard.press('Enter');
            console.log(`   [Burst] ${i}/${BURST_COUNT} sent.`);
            await page.waitForTimeout(1000 + Math.random() * 500);
        } catch (e) {
            console.log(`   [Burst] Message ${i} failed, retrying...`);
            i--;
        }
    }
    console.log('✅ Burst complete.');

    // 5. RESPONDER
    console.log(`📡 Entering Responder Mode. Monitoring for "${TRIGGER_MESSAGE}"...`);
    let lastRepliedMessageId = null;

    while (true) {
        try {
            const messages = await page.locator('[data-testid="msg-container"]').all();
            
            if (messages.length > 0) {
                const latestMessage = messages[messages.length - 1];
                const messageTextContent = (await latestMessage.innerText()).trim();
                const messageId = await latestMessage.getAttribute('data-id');

                const isOutgoing = await latestMessage.evaluate(node => {
                    return node.closest('.message-out') !== null || 
                           node.innerHTML.includes('data-testid="msg-check"') ||
                           node.innerHTML.includes('data-testid="msg-dblcheck"');
                });

                if (!isOutgoing && messageId !== lastRepliedMessageId) {
                    if (messageTextContent.toLowerCase().includes(TRIGGER_MESSAGE.toLowerCase())) {
                        console.log(`🔔 Trigger detected: "${messageTextContent}"`);
                        
                        await page.waitForSelector(messageBoxSelector);
                        await page.locator(messageBoxSelector).first().click();
                        await page.keyboard.type(RESPONSE_MESSAGE);
                        await page.keyboard.press('Enter');
                        
                        console.log(`📤 Replied: "${RESPONSE_MESSAGE}"`);
                        lastRepliedMessageId = messageId;
                    }
                }
            }
        } catch (error) {
            // Domestic issues
        }
        await page.waitForTimeout(2000);
    }
})();
