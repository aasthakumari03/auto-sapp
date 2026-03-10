const { chromium } = require('playwright');

(async () => {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('Navigating to WhatsApp Web...');
    await page.goto('https://web.whatsapp.com');
    
    console.log('--------------------------------------------------');
    console.log('CRITICAL: Please scan the QR code to login.');
    console.log('Once you are logged in and the chat list appears,');
    console.log('I will automatically save the session and close.');
    console.log('--------------------------------------------------');
    
    // Wait for the app to load (multiple selectors as fallback)
    console.log('Waiting for login to complete...');
    
    try {
        // Wait for search box or chat list
        await Promise.race([
            page.waitForSelector('div[contenteditable="true"][data-tab="3"]', { timeout: 0 }),
            page.waitForSelector('[data-testid="chat-list"]', { timeout: 0 }),
            page.waitForSelector('[aria-label="Chat list"]', { timeout: 0 })
        ]);

        console.log('Login detected! Keeping session open for 5 seconds to ensure everything is synced...');
        await page.waitForTimeout(5000);
        
        // Save storage state to a file
        await context.storageState({ path: 'auth.json' });
        console.log('--------------------------------------------------');
        console.log('SUCCESS: Authentication state saved to auth.json');
        console.log('You can now run: node index.js');
        console.log('--------------------------------------------------');
    } catch (error) {
        console.error('Error during login detection:', error);
    } finally {
        await browser.close();
        console.log('Browser closed.');
    }
})();
