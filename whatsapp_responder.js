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
    console.log('🚀 WhatsApp Bot starting (v4 Ultra Speed)...');
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
    console.log('🔍 Waiting for WhatsApp list...');
    try {
        await page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 60000 });
        console.log('✅ WhatsApp Loaded!');
    } catch (e) {
        console.log('👉 ACTION REQUIRED: Please login/scan.');
        await page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 0 });
    }

    // 2. OPEN CHAT (Optimized for speed)
    let chatOpened = false;

    // Helper to click contact aggressively
    const clickContact = async (locator) => {
        await locator.dispatchEvent('mousedown');
        await locator.click();
    };

    console.log(`🔎 Locating "${CONTACT_NAME}"...`);
    
    // Quick check if already visible
    const contactSelector = `span[title="${CONTACT_NAME}"]`;
    const visibleContact = page.locator(`[data-testid="chat-list"] ${contactSelector}, #pane-side ${contactSelector}`).first();
    
    if (await visibleContact.isVisible()) {
        console.log('   Contact visible! Clicking immediately...');
        await clickContact(visibleContact);
    } else {
        // Must search
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
        
        // Wait for result in side pane
        const result = page.locator(`[data-testid="chat-list"] ${contactSelector}, #pane-side ${contactSelector}`).first();
        await result.waitFor({ state: 'visible', timeout: 15000 });
        await clickContact(result);
    }

    // Wait for the message box to appear as the ultimate "Chat is open" signal
    const messageBoxSelector = 'footer [contenteditable="true"], [data-testid="conversation-text-input"]';
    console.log('⏳ Waiting for message box focus...');
    await page.waitForSelector(messageBoxSelector, { timeout: 15000 });
    console.log('✅ Chat is ready!');

    // 3. IMMEDIATE BURST
    console.log(`🚀 Bursting "${BURST_MESSAGE}" x ${BURST_COUNT}...`);
    for (let i = 1; i <= BURST_COUNT; i++) {
        const messageBox = page.locator(messageBoxSelector).first();
        await messageBox.click({ force: true });
        await page.keyboard.type(BURST_MESSAGE);
        await page.keyboard.press('Enter');
        console.log(`   ➜ Sent ${i}/${BURST_COUNT}`);
        // Tiny variability but very fast
        await page.waitForTimeout(200 + Math.random() * 200);
    }
    console.log('🏁 Burst complete.');

    // 4. RESPONDER
    console.log('📡 Monitoring for "Kkrh"...');
    let lastRepliedMessageId = null;

    while (true) {
        try {
            const messages = await page.locator('[data-testid="msg-container"]').all();
            if (messages.length > 0) {
                const latestMessage = messages[messages.length - 1];
                const text = (await latestMessage.innerText()).trim();
                const id = await latestMessage.getAttribute('data-id');

                const isOutgoing = await latestMessage.evaluate(node => {
                    return node.closest('.message-out') !== null || 
                           node.querySelector('[data-testid="msg-check"]') !== null ||
                           node.querySelector('[data-testid="msg-dblcheck"]') !== null;
                });

                if (!isOutgoing && id !== lastRepliedMessageId) {
                    if (text.toLowerCase().includes(TRIGGER_MESSAGE.toLowerCase())) {
                        console.log(`⭐ Reply Trigger: "${text}"`);
                        await page.locator(messageBoxSelector).first().click();
                        await page.keyboard.type(RESPONSE_MESSAGE);
                        await page.keyboard.press('Enter');
                        lastRepliedMessageId = id;
                        console.log('📤 Replied successfully.');
                    }
                }
            }
        } catch (err) { /* ignore dom changes */ }
        await page.waitForTimeout(1500);
    }
})();
