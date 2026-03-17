const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * CONFIGURATION
 */
const SESSION_PATH = path.join(__dirname, 'whatsapp_session');

(async () => {
    console.log('--------------------------------------------------');
    console.log('🚀 Fast Status Viewer starting...');
    console.log('--------------------------------------------------');

    if (!fs.existsSync(SESSION_PATH)) {
        console.log('❌ Session path not found. Please log in first using another bot script.');
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

    console.log('🌐 Opening WhatsApp Web (Ultra-Fast)...');
    // 'commit' is the fastest event - it starts as soon as the first byte is received
    await page.goto('https://web.whatsapp.com', { waitUntil: 'commit' });

    // 1. INSTANT INTERACTION POINT
    // We don't wait for 'load' or 'networkidle'. We wait for ANY core element.
    const statusIconSelector = '[data-testid="status-v3-unread"], [data-testid="newsletter-outline-status-unread"], [title="Status"], [aria-label="Status"]';
    const mainListSelector = '#pane-side, [data-testid="chat-list"]';
    
    console.log('⚡ Racing for interaction point...');
    try {
        // Wait for EITHER the list or the status icon to appear
        await Promise.race([
            page.waitForSelector(mainListSelector, { timeout: 15000 }),
            page.waitForSelector(statusIconSelector, { timeout: 15000 })
        ]);
        console.log('✅ Entry point detected!');
    } catch (e) {
        console.log('👉 ACTION REQUIRED: Manual login/scan.');
        await page.waitForSelector(mainListSelector, { timeout: 0 });
    }

    // 2. IMMEDIATE NAV TO STATUS
    try {
        const statusIcon = page.locator(statusIconSelector).first();
        // If it's already there, click it. If not, wait micro-seconds.
        await statusIcon.click({ force: true, timeout: 2000 }).catch(() => {
            // Fallback sidebar click
            return page.click('header [data-testid="status-v2"], header [title="Status"]', { timeout: 1000 }).catch(() => {});
        });
        console.log('✅ Switched to Status tray.');
    } catch (e) {
        console.log('⚠️ Status icon nav issue.');
    }

    // 3. ZERO-DELAY STATUS OPENING
    const unviewedSelector = '[data-testid="status-v3-item-cell"] [data-testid="icon-status-v3-unread"], .status-unread';
    const generalItemSelector = '[data-testid="status-v3-item-cell"], [aria-label="Recent"] > div, #pane-side div[role="row"]';

    try {
        // Race between unviewed and first general item
        const opener = async () => {
            const unviewed = page.locator(unviewedSelector).first();
            if (await unviewed.isVisible({ timeout: 500 }).catch(() => false)) {
                console.log('🌟 Unviewed status found!');
                await unviewed.locator('xpath=ancestor::div[@role="row" or @data-testid="status-v3-item-cell"]').first().click({ force: true });
            } else {
                console.log('📊 Opening most recent...');
                await page.locator(generalItemSelector).first().click({ force: true });
            }
        };

        await opener();
        console.log('🚀 Status opened INSTANTLY!');
    } catch (e) {
        console.log(`❌ Speed-run error: ${e.message}`);
    }

    console.log('--------------------------------------------------');
    console.log('🏁 MISSION COMPLETE.');
    console.log('--------------------------------------------------');

    await page.waitForTimeout(10000); // 10s for the user to see
    await context.close();
    process.exit(0);
})();
