# WhatsApp Automation Tool

This tool automates sending a message multiple times to a specific contact on WhatsApp Web.

## Prerequisites

-   Node.js installed.
-   Internet connection for WhatsApp Web.

## Setup

1.  **Install dependencies**:
    ```bash
    npm install
    npx playwright install chromium
    ```

2.  **Authenticate**:
    Run the following command and scan the QR code with your phone. Once the chat list appears, the script will save your session and close automatically.
    ```bash
    node auth.js
    ```
    This creates an `auth.json` file which keeps you logged in for future runs.

## Usage

To send the message "I love you shona pari" 50 times to "Jais", run:
```bash
node index.js
```

## Customization

You can edit `index.js` to change the:
-   `CONTACT_NAME`: The name of the person/group.
-   `MESSAGE`: The text you want to send.
-   `COUNT`: How many times to send it.

## Troubleshooting

-   If the search fails, ensure the `CONTACT_NAME` matches exactly what is in your WhatsApp.
-   If the script stops working, delete `auth.json` and run `node auth.js` again to re-authenticate.
