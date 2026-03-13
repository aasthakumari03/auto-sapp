const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * CONFIGURATION
 */
const CONTACT_NAME = 'Jais';
const BURST_MESSAGE = 'I Love you Bubuu'; // Revised spelling per user
const BURST_COUNT = 5; // Revised count per user
const TRIGGER_MESSAGE = 'Kkrh';
const RESPONSE_MESSAGE = 'Vibing on my own baby';
const SESSION_PATH = path.join(__dirname, 'whatsapp_session');

(async () => {
    console.log('--------------------------------------------------');
    console.log('🚀 WhatsApp Bot starting...');
    console.log(`📡 Targeting: "${CONTACT_NAME}"`);
    console.log(`💖 Initial Burst: "${BURST_MESSAGE}" (${BURST_COUNT} times)`);
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

    // 1. WAIT FOR LOAD/LOGIN
    console.log('🔍 Waiting for WhatsApp to load...');
    try {
        await page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 60000 });
        console.log('✅ WhatsApp Loaded!');
    } catch (e) {
        console.log('👉 ACTION REQUIRED: Please log in / scan QR code.');
        await page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 0 });
        console.log('✅ Login confirmed!');
    }

    // Small delay to ensure side pane UI is fully interactive
    await page.waitForTimeout(5000);

    // 2. SEARCH AND OPEN CHAT
    console.log(`🔎 Searching for "${CONTACT_NAME}"...`);
    let chatOpened = false;
    let retries = 5;
    
    while (retries > 0 && !chatOpened) {
        try {
            // Very broad search box selectors
            const searchBoxSelector = [
                'div[contenteditable="true"][data-tab="3"]',
                '[data-testid="search-input-element-role"]',
                '[aria-label="Search text input field"]',
                'div[title="Search input textbox"]',
                'div.selectable-text[contenteditable="true"]'
            ].join(', ');

            await page.waitForSelector(searchBoxSelector, { timeout: 20000 });
            const searchBoxes = page.locator(searchBoxSelector);
            const searchBox = searchBoxes.first();
            
            await searchBox.click();
            await page.waitForTimeout(1000);
            
            // Explicitly clear
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            
            await page.keyboard.type(CONTACT_NAME, { delay: 100 });
            console.log(`   Typed "${CONTACT_NAME}", waiting for results...`);
            await page.waitForTimeout(4000); 
            
            // Find the contact in results
            const contactSelector = `span[title="${CONTACT_NAME}"]`;
            const contactLocator = page.locator(`[data-testid="chat-list"] ${contactSelector}, #pane-side ${contactSelector}`).first();
            
            await contactLocator.waitFor({ state: 'visible', timeout: 10000 });
            await contactLocator.click();
            
            // Confirm with header
            await page.waitForSelector(`header span[title="${CONTACT_NAME}"]`, { timeout: 15000 });
            console.log(`✅ Success: Chat with "${CONTACT_NAME}" is open.`);
            chatOpened = true;
        } catch (e) {
            console.log(`⚠️ Attempt failed: ${e.message.split('\n')[0]}. Retrying...`);
            retries--;
            await page.waitForTimeout(3000);
            // If it keeps failing, try to refresh or click search button if exists
            if (retries === 2) {
                console.log('🔄 Refreshing page to reset state...');
                await page.reload();
                await page.waitForSelector('#pane-side', { timeout: 60000 });
            }
        }
    }

    if (!chatOpened) {
        console.log('❌ Auto-search failed. Please click "Jais" manually.');
        await page.waitForSelector('header span[title="Jais"]', { timeout: 0 });
        console.log('✅ Manual click detected!');
    }

    // 3. SEND MESSAGE BURST (5 TIMES)
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

    // 4. ENTER RESPONDER MODE
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
            // Quietly handle dom detach
        }
        await page.waitForTimeout(2000);
    }
})();
