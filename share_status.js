const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * CONFIGURATION
 */
const SESSION_PATH = path.join(__dirname, 'whatsapp_session');
const RECIPIENT_NAME = 'Srishti Thakur';
const CAPTURE_FILE = path.join(__dirname, 'status_capture.png');

(async () => {
    console.log('--------------------------------------------------');
    console.log('🚀 Status Sharer starting...');
    console.log(`📡 Recipient: "${RECIPIENT_NAME}"`);
    console.log('--------------------------------------------------');

    if (!fs.existsSync(SESSION_PATH)) {
        console.log('❌ Session path not found. Please log in first.');
        process.exit(1);
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
    page.setDefaultTimeout(60000);

    console.log('🌐 Opening WhatsApp Web...');
    await page.goto('https://web.whatsapp.com');

    // 1. WAIT FOR LOAD
    const mainListSelector = '#pane-side, [data-testid="chat-list"]';
    try {
        await page.waitForSelector(mainListSelector, { timeout: 20000 });
        console.log('✅ WhatsApp Loaded!');
    } catch (e) {
        console.log('👉 ACTION REQUIRED: Please login.');
        await page.waitForSelector(mainListSelector, { timeout: 0 });
    }

    // 2. NAV TO STATUS AND CAPTURE
    console.log('📱 Opening Status section...');
    // Comprehensive status icon selectors
    const statusIconSelectors = [
        '[data-testid="newsletter-outline-status-unread"]',
        '[data-testid="status-v3-unread"]',
        '[title="Status"]',
        '[aria-label="Status"]',
        'span[data-icon="status-v3"]',
        'span[data-icon="newsletter-outline-status-unread"]'
    ];
    
    try {
        let statusClicked = false;
        for (const selector of statusIconSelectors) {
            const icon = page.locator(selector).first();
            if (await icon.isVisible()) {
                await icon.click({ force: true });
                statusClicked = true;
                console.log(`✅ Switched to Status tray using: ${selector}`);
                break;
            }
        }

        if (!statusClicked) {
            console.log('⚠️ Standard status icons not found. Attempting sidebar fallback...');
            await page.click('header [data-testid="status-v2"], header [title="Status"], [aria-label="Status"]').catch(() => {});
        }
        
        console.log('👀 Opening recent status...');
        const unviewedSelector = '[data-testid="status-v3-item-cell"] [data-testid="icon-status-v3-unread"], .status-unread';
        const generalItemSelector = '[data-testid="status-v3-item-cell"], [aria-label="Recent"] > div, #pane-side div[role="row"]';

        await page.waitForTimeout(2000); // Wait for list to load

        // Choose unviewed or first recent
        const unviewed = page.locator(unviewedSelector).first();
        if (await unviewed.isVisible()) {
            console.log('🌟 Found unviewed status! Opening...');
            await unviewed.locator('xpath=ancestor::div[@role="row" or @data-testid="status-v3-item-cell"]').first().click({ force: true });
        } else {
            console.log('📊 No unviewed found. Opening most recent...');
            await page.locator(generalItemSelector).first().click({ force: true });
        }

        // Wait for status viewer and capture
        console.log('📸 Capturing status screenshot...');
        const viewerSelector = '[data-testid="status-v3-viewer-container"], div[role="dialog"], .velocity-animating';
        try {
            await page.waitForSelector(viewerSelector, { timeout: 30000 });
            
            // Wait for media to load fully
            await page.waitForTimeout(4000); 
            if (!page.isClosed()) {
                await page.screenshot({ path: CAPTURE_FILE });
                console.log(`✅ Status captured to ${CAPTURE_FILE}`);
            }
        } catch (e) {
            console.log(`⚠️ Status viewer did not appear or was closed: ${e.message}`);
        }

        // Close viewer
        if (!page.isClosed()) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
            // Navigate back to chats
            await page.click('[data-testid="back"], [title="Back"], [aria-label="Back"]').catch(() => {});
        }
    } catch (e) {
        console.log(`❌ Failed during status phase: ${e.message}`);
    }

    // 3. SEND TO RECIPIENT
    if (page.isClosed()) {
        console.log('❌ Browser was closed. Aborting share phase.');
        process.exit(1);
    }

    console.log(`🔎 Searching for "${RECIPIENT_NAME}"...`);
    try {
        await page.waitForTimeout(2000);
        
        // Try multiple ways to focus search
        await page.keyboard.press('Escape'); 
        await page.waitForTimeout(1000);
        await page.keyboard.press('/'); 
        await page.waitForTimeout(1000);

        const searchBoxSelectors = [
            'div[contenteditable="true"][data-tab="3"]',
            '[data-testid="search-input-element-role"]',
            'input[title="Search input textbox"]',
            '[aria-label="Search text input field"]',
            '.lexical-rich-text-input [contenteditable="true"]'
        ];

        let searchBox = null;
        for (const selector of searchBoxSelectors) {
            const loc = page.locator(selector).first();
            if (await loc.isVisible()) {
                searchBox = loc;
                break;
            }
        }

        if (!searchBox) {
            console.log('⚠️ Search box not visible. Trying to click search icon...');
            const searchIcon = page.locator('[data-testid="icon-search"], [data-icon="search"], [aria-label="Search"]').first();
            if (await searchIcon.isVisible()) {
                await searchIcon.click();
                await page.waitForTimeout(2000);
                for (const selector of searchBoxSelectors) {
                    const loc = page.locator(selector).first();
                    if (await loc.isVisible()) {
                        searchBox = loc;
                        break;
                    }
                }
            }
        }

        if (searchBox) {
            await searchBox.click();
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            await page.keyboard.type(RECIPIENT_NAME, { delay: 100 });
            await page.waitForTimeout(4000);

            const contactSelector = `span[title="${RECIPIENT_NAME}"]`;
            await page.waitForSelector(contactSelector, { timeout: 20000 });
            await page.click(contactSelector);
            console.log(`✅ Chat with "${RECIPIENT_NAME}" open.`);

            // 4. UPLOAD IMAGE
            console.log('📤 Uploading screenshot...');
            const fileInputSelector = 'input[type="file"]';
            await page.waitForSelector(fileInputSelector, { timeout: 20000 });
            const fileInputs = page.locator(fileInputSelector);
            const count = await fileInputs.count();

            if (count > 0) {
                await fileInputs.last().setInputFiles(CAPTURE_FILE);
                
                console.log('⏳ Waiting for preview and send button...');
                const sendButtonSelector = '[data-testid="send"], [aria-label="Send"], span[data-icon="send"]';
                await page.waitForSelector(sendButtonSelector, { timeout: 30000 });
                await page.click(sendButtonSelector);
                
                console.log('🚀 Status shared successfully!');
            } else {
                console.log('❌ No file inputs found.');
            }
        } else {
            console.log('❌ Could not find search box.');
        }
    } catch (e) {
        console.log(`❌ Failed to share: ${e.message}`);
    }

    console.log('--------------------------------------------------');
    console.log('🏁 Task accomplished.');
    console.log('--------------------------------------------------');

    await page.waitForTimeout(5000);
    await context.close();
})();
