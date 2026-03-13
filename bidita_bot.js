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
    console.log('🚀 Bidita Bot starting (Ultimate Reliability)...');
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

    await page.waitForTimeout(5000);

    // 2. SEARCH AND OPEN CHAT
    const clickAggressive = async (locator) => {
        try {
            await locator.dispatchEvent('mousedown');
            await locator.click();
            return true;
        } catch (e) {
            return false;
        }
    };

    console.log(`🔎 Initiating search for "${CONTACT_NAME}"...`);
    let chatOpened = false;
    let retries = 5;

    while (retries > 0 && !chatOpened) {
        try {
            // A. Focus search box using keyboard shortcut '/'
            console.log('   Attempting to focus search box using "/" shortcut...');
            await page.keyboard.press('/');
            await page.waitForTimeout(1000);

            const searchBoxSelectors = [
                'div[contenteditable="true"][data-tab="3"]',
                '[data-testid="search-input-element-role"]',
                '[aria-label="Search text input field"]',
                'div[title="Search input textbox"]'
            ];

            let searchBox = null;
            for (const selector of searchBoxSelectors) {
                const locator = page.locator(selector).first();
                if (await locator.isVisible()) {
                    searchBox = locator;
                    break;
                }
            }

            if (!searchBox) {
                console.log('   Searching input via UI click fallback...');
                const searchIcon = page.locator('[data-testid="search"], [aria-label="Search"]').first();
                if (await searchIcon.isVisible()) {
                    await searchIcon.click();
                    await page.waitForTimeout(1000);
                    searchBox = page.locator(searchBoxSelectors.join(', ')).first();
                }
            }

            if (searchBox) {
                await searchBox.click();
                await page.keyboard.down('Control');
                await page.keyboard.press('A');
                await page.keyboard.up('Control');
                await page.keyboard.press('Backspace');
                await page.keyboard.type(CONTACT_NAME, { delay: 100 });
                
                console.log(`   Typed "${CONTACT_NAME}", waiting for results...`);
                await page.waitForTimeout(4000);

                const contactSelector = `span[title="${CONTACT_NAME}"]`;
                const result = page.locator(`[data-testid="chat-list"] ${contactSelector}, #pane-side ${contactSelector}`).first();
                
                if (await result.isVisible()) {
                    await clickAggressive(result);
                    
                    // Verify if chat is actually open by checking for the message input
                    const messageBoxSelector = 'footer [contenteditable="true"], [data-testid="conversation-text-input"]';
                    try {
                        await page.waitForSelector(messageBoxSelector, { timeout: 10000 });
                        chatOpened = true;
                        console.log('✅ Chat opened successfully!');
                    } catch (e) {
                        console.log('   Chat box did not appear. Retrying search...');
                    }
                }
            }
        } catch (e) {
            console.log(`⚠️ Search attempt failed: ${e.message.split('\n')[0]}. Retrying...`);
        }
        
        if (!chatOpened) {
            retries--;
            await page.waitForTimeout(3000);
            if (retries === 2) {
                console.log('🔄 Refreshing page to fix potential UI stall...');
                await page.reload();
                await page.waitForSelector('#pane-side', { timeout: 60000 });
            }
        }
    }

    if (!chatOpened) {
        console.log('❌ Auto-open failed. Please click "Bidita lpu" manually.');
        await page.waitForSelector('footer [contenteditable="true"]', { timeout: 0 });
        console.log('✅ Chat is now ready!');
    }

    // 3. BURST (5 TIMES)
    const messageBoxSelector = 'footer [contenteditable="true"], [data-testid="conversation-text-input"]';
    console.log(`🚀 Bursting "${MESSAGE_TEXT}" x ${MESSAGE_COUNT}...`);
    for (let i = 1; i <= MESSAGE_COUNT; i++) {
        try {
            const messageBox = page.locator(messageBoxSelector).first();
            await messageBox.click({ force: true });
            await page.keyboard.type(MESSAGE_TEXT);
            await page.keyboard.press('Enter');
            console.log(`   ➜ Sent ${i}/${MESSAGE_COUNT}`);
            await page.waitForTimeout(400 + Math.random() * 400);
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
