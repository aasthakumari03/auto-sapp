const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * CONFIGURATION
 */
const CONTACT_NAME = 'Jais';
const TRIGGER_MESSAGE = 'Kkrh';
const RESPONSE_MESSAGE = 'Vibing in my own';
const SESSION_PATH = path.join(__dirname, 'whatsapp_session');

(async () => {
    console.log('--------------------------------------------------');
    console.log('🚀 Jais Auto-Responder starting...');
    console.log(`📡 Monitoring: "${CONTACT_NAME}"`);
    console.log(`⭐ Trigger: "${TRIGGER_MESSAGE}"`);
    console.log(`📤 Response: "${RESPONSE_MESSAGE}"`);
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

    // 2. OPEN CHAT
    console.log(`🔎 Opening chat with "${CONTACT_NAME}"...`);
    
    // Quick focus search
    await page.keyboard.press('/');
    await page.waitForTimeout(300);

    const searchBoxSelector = 'div[contenteditable="true"][data-tab="3"], [data-testid="search-input-element-role"]';
    const searchBox = page.locator(searchBoxSelector).first();
    
    if (await searchBox.isVisible()) {
        await searchBox.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(CONTACT_NAME, { delay: 30 });
        
        await page.waitForTimeout(1000);

        const contactSelector = `span[title="${CONTACT_NAME}"]`;
        const result = page.locator(`[data-testid="chat-list"] ${contactSelector}, #pane-side ${contactSelector}`).first();
        
        if (await result.isVisible()) {
            await result.click();
            console.log('✅ Chat opened!');
        } else {
            console.log('❌ Could not find Jais. Please open the chat manually.');
        }
    }

    const messageBoxSelector = 'footer [contenteditable="true"], [data-testid="conversation-text-input"]';
    await page.waitForSelector(messageBoxSelector, { timeout: 30000 }).catch(() => console.log('⚠️ Message box not found immediately.'));

    // 3. MONITOR AND RESPOND
    console.log('📡 Listener Active. Waiting for messages...');
    let lastRepliedMessageId = null;

    while (true) {
        try {
            // Check for message containers - using a more specific selector for the latest incoming message
            const messages = await page.locator('[data-testid="msg-container"]').all();
            if (messages.length > 0) {
                const latestMessage = messages[messages.length - 1];
                const id = await latestMessage.getAttribute('data-id');

                if (id !== lastRepliedMessageId) {
                    const text = (await latestMessage.innerText()).trim();

                    // Determine if it's an incoming message (not from us)
                    const isOutgoing = await latestMessage.evaluate(node => {
                        return node.closest('.message-out') !== null || 
                               node.querySelector('[data-testid="msg-check"]') !== null ||
                               node.querySelector('[data-testid="msg-dblcheck"]') !== null;
                    });

                    if (!isOutgoing && text.toLowerCase().includes(TRIGGER_MESSAGE.toLowerCase())) {
                        console.log(`⭐ Trigger detected ("as soon as possible"): "${text}"`);
                        
                        const messageBox = page.locator(messageBoxSelector).first();
                        await messageBox.click({ force: true });
                        await page.keyboard.type(RESPONSE_MESSAGE, { delay: 10 }); // Ultra-fast typing
                        await page.keyboard.press('Enter');
                        
                        lastRepliedMessageId = id;
                        console.log(`📤 Replied: "${RESPONSE_MESSAGE}"`);
                    }
                }
            }
        } catch (err) {
            // Silence DOM detached errors
        }
        await page.waitForTimeout(500); // Poll every 500ms for high responsiveness
    }
})();
