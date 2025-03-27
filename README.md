# WhatsApp Messaging Server for Discord Bot Hosting

A web-based WhatsApp messaging automation tool designed to streamline communication workflows with advanced features. This application allows you to send WhatsApp messages without QR code scanning, using pairing code authentication instead.

## Features

- **Pairing Code Authentication**: Connect to WhatsApp without scanning QR codes
- **Multiple Recipients**: Send messages to individual contacts or groups
- **Flexible Message Input**: Enter messages directly or upload from a file
- **Customizable Delay**: Set delay between messages to prevent rate limiting
- **Retry Mechanism**: Automatically retry failed messages
- **Persistent Sessions**: Continue messaging even when browser is closed
- **Responsive UI**: Works on mobile and desktop devices

## Deployment Instructions

### Prerequisites

- Discord Bot Hosting account
- Node.js 16 or higher

### Setup

1. Clone or download this repository
2. Create a new application in your Discord Bot Hosting dashboard
3. Upload these files to your application
4. Set the required environment variables in the Discord Bot Hosting dashboard:
   - `PORT`: The port your app will run on (default: 3000)
   - `NODE_ENV`: Set to "production" for optimal performance
   - `SESSION_SECRET`: A random string for securing sessions
   - Optional: `DATABASE_URL` if you want to use a PostgreSQL database

### Starting the Application

1. In the Discord Bot Hosting dashboard, set the start command to: `npm start`
2. Start the application
3. Your WhatsApp Messaging Server will be available at the URL provided by Discord Bot Hosting

## Usage

1. Open the application in your browser
2. Enter your phone number with country code (without + symbol)
3. Click "Generate Pairing Code"
4. Open WhatsApp on your phone > Settings > Linked Devices > Link a Device
5. Enter the pairing code displayed on the website
6. Once connected, configure your message settings:
   - Enter target phone numbers or group IDs
   - Type your message or upload a message file
   - Set delay between messages
   - Configure retry settings
7. Click "Start Messaging" to begin sending messages

## Technical Details

- Built with Node.js and Express for the backend
- React for the frontend
- Uses the Baileys library for WhatsApp integration
- Optional PostgreSQL database for session storage

## Troubleshooting

If you encounter issues with pairing code authentication:
1. Make sure your phone number is entered correctly
2. Ensure your WhatsApp app is up to date
3. Try restarting the application
4. Check the logs in the Discord Bot Hosting dashboard

For persistent issues, consider using the "Upload Credentials File" option if you have previously authenticated credentials from another device.