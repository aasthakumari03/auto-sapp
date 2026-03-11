const { chromium } = require('playwright');
const fs = require('fs');

const CONTACT_NAME = 'Jais';
const TRIGGER_MESSAGE = 'Kkrh';
const RESPONSE_MESSAGE = 'Vibing on my own baby';

(async () => {
    if (!fs.existsSync('auth.json')) {
        console.error('Error: auth.json not found. You MUST run "node auth.js" first and scan the QR code.');
        process.exit(1);
    }

    console.log('--------------------------------------------------');
    console.log('🚀 WhatsApp Responder Bot starting...');
    console.log(`📡 Monitoring "${CONTACT_NAME}" for "${TRIGGER_MESSAGE}"...`);
    console.log('--------------------------------------------------');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: 'auth.json' });
    const page = await context.newPage();

    console.log('🌐 Navigating to WhatsApp Web...');
    await page.goto('https://web.whatsapp.com');

    // Wait for the app to load
    console.log('🔍 Waiting for chat list...');
    await page.waitForSelector('[data-testid="chat-list"]', { timeout: 60000 });

    // Search for the contact
    console.log(`🔎 Searching for contact: ${CONTACT_NAME}`);
    const searchBoxSelector = 'div[contenteditable="true"][data-tab="3"]';
    await page.waitForSelector(searchBoxSelector);
    await page.click(searchBoxSelector);
    await page.fill(searchBoxSelector, CONTACT_NAME);
    await page.keyboard.press('Enter');

    // Wait for the chat to open
    console.log(`⏳ Waiting for chat with "${CONTACT_NAME}" to open...`);
    const chatTitleSelector = `span[title="${CONTACT_NAME}"]`;
    await page.waitForSelector(chatTitleSelector);
    await page.click(chatTitleSelector);

    console.log(`✅ Chat opened. Now monitoring for "${TRIGGER_MESSAGE}"...`);

    // Keep track of the last processed message ID or timestamp to avoid duplicate replies
    let lastRepliedMessageId = null;

    while (true) {
        try {
            // Find all message containers
            // Each message row usually has [data-testid="msg-container"]
            const messages = await page.locator('[data-testid="msg-container"]').all();
            
            if (messages.length > 0) {
                const latestMessage = messages[messages.length - 1];
                
                // Get the text content of the latest message
                // Messages are usually inside a span or div with selectable text
                const messageTextContent = await latestMessage.innerText();
                
                // Also get some unique attribute if possible (like data-id)
                const messageId = await latestMessage.getAttribute('data-id');

                // Check if it's an incoming message (usually they don't have 'message-out' class or similar)
                // In WhatsApp Web, outgoing messages often have 'message-out' or a specific structure
                const isOutgoing = await latestMessage.evaluate(node => {
                    return node.closest('.message-out') !== null || node.innerHTML.includes('data-testid="msg-check"');
                });

                if (!isOutgoing && messageId !== lastRepliedMessageId) {
                    // Check if the trigger is present (case insensitive or exact as per user)
                    if (messageTextContent.toLowerCase().includes(TRIGGER_MESSAGE.toLowerCase())) {
                        console.log(`🔔 Trigger detected: "${messageTextContent}"`);
                        
                        const messageBoxSelector = 'footer div[contenteditable="true"]';
                        await page.waitForSelector(messageBoxSelector);
                        await page.fill(messageBoxSelector, RESPONSE_MESSAGE);
                        await page.keyboard.press('Enter');
                        
                        console.log(`📤 Replied: "${RESPONSE_MESSAGE}"`);
                        lastRepliedMessageId = messageId;
                    }
                }
            }
        } catch (error) {
            console.error('⚠️ Error in monitoring loop:', error.message);
        }

        // Poll every 2 seconds
        await page.waitForTimeout(2000);
    }
})();
