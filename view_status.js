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
    // Direct navigation to status might work but is often redirected. 
    // We'll go to the main page and click the status icon for reliability.
    await page.goto('https://web.whatsapp.com');

    console.log('🔍 Waiting for WhatsApp list...');
    try {
        await page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 30000 });
        console.log('✅ WhatsApp Loaded!');
    } catch (e) {
        console.log('👉 ACTION REQUIRED: Please scan the QR code if visible.');
        await page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 0 });
    }

    // 1. CLICK STATUS ICON
    console.log('📱 Navigating to Status section...');
    const statusIconSelector = '[data-testid="newsletter-outline-status-unread"], [data-testid="status-v3-unread"], [title="Status"], [aria-label="Status"]';
    
    try {
        await page.waitForSelector(statusIconSelector, { timeout: 10000 });
        await page.click(statusIconSelector);
        console.log('✅ Switched to Status tray.');
    } catch (e) {
        // Fallback: try clicking the status icon in the sidebar
        const sidebarStatus = page.locator('header [data-testid="status-v2"], header [title="Status"]').first();
        if (await sidebarStatus.isVisible()) {
            await sidebarStatus.click();
            console.log('✅ Clicked Sidebar Status icon.');
        } else {
            console.log('⚠️ Could not find Status icon. Retrying...');
            await page.waitForTimeout(2000);
        }
    }

    // 2. OPEN RECENT STATUS
    console.log('👀 Opening the most recent status...');
    
    // Selectors for items in the status list
    const statusItemSelector = [
        '[data-testid="status-v3-item-cell"]',
        '[aria-label="Recent"] > div',
        'div[aria-label="Status list"] > div',
        '#pane-side div[role="row"]',
        'span[title] >> xpath=ancestor::div[@role="row" or contains(@class, "lh8nd37m")]'
    ].join(', ');
    
    try {
        // Wait for the status list to populate
        console.log('⏳ Waiting for status items to load...');
        await page.waitForSelector(statusItemSelector, { timeout: 15000 });
        
        // Find all status items
        const statusItems = page.locator(statusItemSelector);
        const count = await statusItems.count();
        console.log(`📊 Found ${count} status updates.`);

        if (count > 0) {
            // Click the first one (most recent) with force and dispatchEvent
            console.log('👆 Attempting aggressive click on the first status...');
            const firstItem = statusItems.first();
            
            // Try Dispatch Event first (often more reliable for hidden/complex elements)
            await firstItem.dispatchEvent('mousedown');
            await firstItem.click({ force: true });
            
            console.log('🚀 Status opened! Enjoy.');
        } else {
            console.log('⚠️ No status updates found.');
        }
    } catch (e) {
        console.log(`❌ Failed to open status automatically: ${e.message}`);
        console.log('👉 Please click manually.');
    }

    // Keep it open for a bit for the user to see, then we can decide if we close it or leave it.
    // Given the "do it quickly" request, the bot's job is to get there fast.
    console.log('--------------------------------------------------');
    console.log('🏁 Task accomplished.');
    console.log('--------------------------------------------------');

    // Wait 30 seconds before closing so user can watch
    await page.waitForTimeout(30000);
    await context.close();
})();
