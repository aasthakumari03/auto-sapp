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

    console.log('🌐 Opening WhatsApp Web...');
    // Jump straight to status if possible, or wait for the tray icon
    await page.goto('https://web.whatsapp.com');

    // 1. QUICK DETECTION OF LOADED STATE
    console.log('🔍 Waiting for WhatsApp list (Fast Track)...');
    const mainListSelector = '#pane-side, [data-testid="chat-list"]';
    try {
        await page.waitForSelector(mainListSelector, { timeout: 15000 });
        console.log('✅ WhatsApp Loaded!');
    } catch (e) {
        console.log('👉 ACTION REQUIRED: Please scan/login.');
        await page.waitForSelector(mainListSelector, { timeout: 0 });
    }

    // 2. IMMEDIATE NAV TO STATUS
    console.log('📱 Navigating to Status section...');
    const statusIconSelector = '[data-testid="newsletter-outline-status-unread"], [data-testid="status-v3-unread"], [title="Status"], [aria-label="Status"]';
    
    try {
        // Fast click on status icon
        const statusIcon = page.locator(statusIconSelector).first();
        await statusIcon.waitFor({ state: 'visible', timeout: 5000 });
        await statusIcon.click({ force: true });
        console.log('✅ Switched to Status tray.');
    } catch (e) {
        // Fallback sidebar click
        await page.click('header [data-testid="status-v2"], header [title="Status"]', { timeout: 2000 }).catch(() => {});
    }

    // 3. PRIORITY STATUS OPENING (UNVIEWED > RECENT)
    console.log('👀 Searching for unviewed or recent status...');
    
    // Selectors for unviewed (green/blue ring) vs general status items
    const unviewedSelector = '[data-testid="status-v3-item-cell"] [data-testid="icon-status-v3-unread"], [data-testid="status-v3-item-cell"] .status-unread';
    const generalItemSelector = '[data-testid="status-v3-item-cell"], [aria-label="Recent"] > div, #pane-side div[role="row"]';

    try {
        // Wait briefly for either to appear
        await page.waitForTimeout(1000); 

        // Try unviewed first
        const unviewedItems = page.locator(unviewedSelector);
        if (await unviewedItems.count() > 0) {
            console.log('🌟 Found unviewed status! Opening...');
            // Need to click the parent row of the unviewed icon
            await unviewedItems.first().locator('xpath=ancestor::div[@role="row" or @data-testid="status-v3-item-cell"]').first().click({ force: true });
        } else {
            // Fallback to the very first item in the list (recent viewed)
            console.log('📊 No unviewed found. Opening most recent...');
            const firstRecent = page.locator(generalItemSelector).first();
            await firstRecent.click({ force: true });
        }
        
        console.log('🚀 Status opened IMMEDIATELY!');
    } catch (e) {
        console.log(`❌ Speed-run failed: ${e.message}`);
    }

    console.log('--------------------------------------------------');
    console.log('🏁 MISSION COMPLETE.');
    console.log('--------------------------------------------------');

    // Hold briefly then close
    await page.waitForTimeout(15000);
    await context.close();
    process.exit(0);
})();
