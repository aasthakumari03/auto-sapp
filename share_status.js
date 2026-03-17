const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * CONFIGURATION
 */
const SESSION_PATH = path.join(__dirname, 'whatsapp_session');
const RECIPIENT_NAME = 'Srishti Thakur';
const MEDIA_PATH = path.join(__dirname, 'status_media'); // Extension added dynamically

(async () => {
    console.log('--------------------------------------------------');
    console.log('🚀 Video Status Sharer starting...');
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
        await page.waitForSelector(mainListSelector, { timeout: 30000 });
        console.log('✅ WhatsApp Loaded!');
    } catch (e) {
        console.log('👉 ACTION REQUIRED: Please login/scan.');
        await page.waitForSelector(mainListSelector, { timeout: 0 });
    }

    // 2. NAV TO STATUS AND SHARE
    try {
        console.log('📱 Opening Status section...');
        const statusIconSelectors = [
            '[data-testid="status-v3-unread"]',
            '[data-testid="newsletter-outline-status-unread"]',
            '[title="Status"]',
            '[aria-label="Status"]',
            'span[data-icon="status-v3"]'
        ];
        
        let statusClicked = false;
        for (const selector of statusIconSelectors) {
            const icon = page.locator(selector).first();
            if (await icon.isVisible()) {
                await icon.click({ force: true });
                statusClicked = true;
                break;
            }
        }
        if (!statusClicked) await page.click('header [title="Status"]', { timeout: 2000 }).catch(() => {});
        
        console.log('⏳ Waiting for Status Tray to load...');
        const itemSelector = '[data-testid="status-v3-item-cell"], [aria-label="Recent"] > div, #pane-side div[role="row"]';
        try {
            await page.waitForSelector(itemSelector, { timeout: 15000 });
        } catch (e) {
            console.log('⚠️ Status items not found. Taking debug screenshot...');
            await page.screenshot({ path: path.join(__dirname, 'debug_status_tray.png') });
            throw new Error('Status Tray failed to load items');
        }

        console.log('👀 Searching for a status to open...');
        const items = page.locator(itemSelector);
        const count = await items.count();
        let targetItem = null;

        for (let i = 0; i < count; i++) {
            const item = items.nth(i);
            const text = await item.innerText();
            // Skip "My status" as we want other's status
            if (!text.toLowerCase().includes('my status')) {
                console.log(`🎯 Targeting status item: ${text.split('\n')[0]}`);
                targetItem = item;
                break;
            }
        }

        if (!targetItem) {
            console.log('⚠️ No other status items found, trying the first one anyway.');
            targetItem = items.first();
        }

        // Try multiple click strategies if the first one fails
        console.log('🖱️ Clicking status item...');
        await targetItem.focus();
        await targetItem.click({ force: true });
        // Small delay to see if viewer opens
        await page.waitForTimeout(1000);
        
        if (!(await page.locator('video, img[alt="Status"], [data-testid="status-v3-viewer-container"]').first().isVisible())) {
            console.log('🔄 Click didn\'t seem to work, trying Dispatch Event...');
            await targetItem.dispatchEvent('mousedown');
            await targetItem.click({ force: true });
        }

        // 3. CAPTURE MEDIA
        console.log('📥 Detecting media type...');
        const viewerSelectors = [
            '[data-testid="status-v3-viewer-container"]',
            'div[role="dialog"]',
            'video',
            'img[alt="Status"]'
        ];
        
        let viewerFound = false;
        for (let i = 0; i < 20; i++) { 
            for (const selector of viewerSelectors) {
                if (await page.locator(selector).first().isVisible()) {
                    console.log(`✅ Viewer detected!`);
                    viewerFound = true;
                    break;
                }
            }
            if (viewerFound) break;
            await page.waitForTimeout(1000);
        }

        if (!viewerFound) {
            await page.screenshot({ path: path.join(__dirname, 'debug_viewer_fail.png') });
            throw new Error('Could not detect status viewer after retries. See debug_viewer_fail.png');
        }

        await page.waitForTimeout(5000); // Give time for media to load

        const mediaInfo = await page.evaluate(async () => {
            const video = document.querySelector('video');
            const img = document.querySelector('div[role="dialog"] img, [data-testid="status-v3-viewer-container"] img, img[alt="Status"]');
            
            if (video && video.src && (video.src.startsWith('blob:') || video.src.startsWith('http'))) {
                return { type: 'video', src: video.src };
            } else if (img && img.src) {
                return { type: 'image', src: img.src };
            }
            return null;
        });

        if (!mediaInfo) throw new Error('Could not find video or image in status');

        console.log(`✨ Found ${mediaInfo.type}. Downloading...`);
        const extension = mediaInfo.type === 'video' ? '.mp4' : '.jpg';
        const finalPath = MEDIA_PATH + extension;

        // Download logic for blob/network resource
        const buffer = await page.evaluate(async (src) => {
            const response = await fetch(src);
            const blob = await response.blob();
            const arr = await blob.arrayBuffer();
            return Array.from(new Uint8Array(arr));
        }, mediaInfo.src);

        fs.writeFileSync(finalPath, Buffer.from(buffer));
        console.log(`✅ Media saved to ${finalPath}`);

        // Close viewer
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        await page.click('[data-testid="back"], [title="Back"]').catch(() => {});

        // 4. SEND TO RECIPIENT
        console.log(`🔎 Searching for "${RECIPIENT_NAME}"...`);
        await page.keyboard.press('/');
        await page.waitForTimeout(1000);
        
        const searchBox = page.locator('div[contenteditable="true"][data-tab="3"], [data-testid="search-input-element-role"]').first();
        await searchBox.click();
        await page.keyboard.type(RECIPIENT_NAME, { delay: 50 });
        await page.waitForTimeout(3000);

        await page.click(`span[title="${RECIPIENT_NAME}"]`);
        console.log(`✅ Chat open.`);

        // 5. UPLOAD
        console.log('📤 Uploading file...');
        const fileInput = page.locator('input[type="file"]').last();
        await fileInput.setInputFiles(finalPath);
        
        const sendBtn = '[data-testid="send"], [aria-label="Send"], span[data-icon="send"]';
        await page.waitForSelector(sendBtn, { timeout: 20000 });
        await page.click(sendBtn);
        
        console.log('🚀 Video status shared successfully!');

    } catch (e) {
        console.log(`❌ Process failed: ${e.message}`);
    }

    console.log('--------------------------------------------------');
    await page.waitForTimeout(5000);
    await context.close();
})();
