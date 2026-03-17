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

    // 2. NAV TO STATUS
    console.log('📱 Opening Status section...');
    const statusIconSelectors = [
        '[data-testid="newsletter-outline-status-unread"]',
        '[data-testid="status-v3-unread"]',
        '[title="Status"]',
        '[aria-label="Status"]',
        'span[data-icon="status-v3"]'
    ];
    
    try {
        let statusClicked = false;
        for (const selector of statusIconSelectors) {
            const icon = page.locator(selector).first();
            if (await icon.isVisible()) {
                await icon.click({ force: true });
                statusClicked = true;
                break;
            }
        }
        if (!statusClicked) await page.click('header [title="Status"]', { timeout: 1000 }).catch(() => {});
        
        console.log('👀 Opening most recent status...');
        await page.waitForTimeout(2000);
        
        const itemSelectors = [
            '[data-testid="status-v3-item-cell"]',
            '[aria-label="Recent"] > div',
            '#pane-side div[role="row"]',
            'div[role="listitem"]'
        ];

        let itemFound = false;
        for (const sel of itemSelectors) {
            const el = page.locator(sel).first();
            if (await el.isVisible()) {
                console.log(`🖱️ Clicking status item using: ${sel}`);
                await el.click({ force: true });
                itemFound = true;
                break;
            }
        }

        if (!itemFound) throw new Error('Could not find any status items to click');

        // 3. CAPTURE MEDIA
        console.log('📥 Detecting media type...');
        const viewerSelectors = [
            '[data-testid="status-v3-viewer-container"]',
            'div[role="dialog"]',
            'video',
            'img[alt="Status"]',
            '.velocity-animating'
        ];
        
        let viewerFound = false;
        for (let i = 0; i < 10; i++) { // Retry loop for viewer
            for (const selector of viewerSelectors) {
                const viewer = page.locator(selector).first();
                if (await viewer.isVisible()) {
                    console.log(`✅ Viewer detected using: ${selector}`);
                    viewerFound = true;
                    break;
                }
            }
            if (viewerFound) break;
            await page.waitForTimeout(1000);
        }

        if (!viewerFound) throw new Error('Could not detect status viewer after retries');

        await page.waitForTimeout(5000); // Give plenty of time for video to load

        const mediaInfo = await page.evaluate(async () => {
            const video = document.querySelector('video');
            const img = document.querySelector('div[role="dialog"] img, [data-testid="status-v3-viewer-container"] img');
            
            if (video && video.src) {
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
