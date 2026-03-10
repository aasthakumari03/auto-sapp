const { chromium } = require('playwright');
const fs = require('fs');

const CONTACT_NAME = 'Jais';
const MESSAGE = 'I love you shona pari';
const COUNT = 50;

(async () => {
    if (!fs.existsSync('auth.json')) {
        console.error('Error: auth.json not found. You MUST run "node auth.js" first and scan the QR code.');
        process.exit(1);
    }

    console.log('Launching browser with saved session...');
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: 'auth.json' });
    const page = await context.newPage();

    console.log('Navigating to WhatsApp Web...');
    await page.goto('https://web.whatsapp.com');

    // Wait for the app to load
    console.log('Waiting for chat list...');
    await page.waitForSelector('[data-testid="chat-list"]', { timeout: 60000 });

    // Search for the contact
    console.log(`Searching for contact: ${CONTACT_NAME}`);
    
    // Click Search box
    const searchBoxSelector = 'div[contenteditable="true"][data-tab="3"]';
    await page.waitForSelector(searchBoxSelector);
    await page.click(searchBoxSelector);
    await page.fill(searchBoxSelector, CONTACT_NAME);
    await page.keyboard.press('Enter');

    // Wait for the chat to open
    console.log(`Waiting for chat with ${CONTACT_NAME} to open...`);
    const chatTitleSelector = `span[title="${CONTACT_NAME}"]`;
    await page.waitForSelector(chatTitleSelector);
    
    // Clicking it explicitly just in case Enter didn't work as expected
    await page.click(chatTitleSelector);

    console.log(`Sending message "${MESSAGE}" ${COUNT} times...`);

    const messageBoxSelector = 'footer div[contenteditable="true"]';
    await page.waitForSelector(messageBoxSelector);

    for (let i = 1; i <= COUNT; i++) {
        await page.fill(messageBoxSelector, MESSAGE);
        await page.keyboard.press('Enter');
        console.log(`Progress: ${i}/${COUNT} sent.`);
        
        // Delay to avoid spam detection
        await page.waitForTimeout(400 + Math.random() * 400); 
    }

    console.log('Successfully sent all messages!');
    
    // Give time for the last message to be sent
    await page.waitForTimeout(3000);
    await browser.close();
    console.log('Browser closed.');
})();
