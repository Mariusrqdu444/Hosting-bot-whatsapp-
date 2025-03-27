const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore, jidNormalizedUser } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const path = require('path');
const qrcode = require('qrcode-terminal');

// Global variables
let sock = null;
let connectionStatus = 'disconnected';
let qrCodeData = null;
let authFolder = path.join(__dirname, '../auth');
let messageQueue = [];
let isProcessingQueue = false;

// Initialize WhatsApp connection
const initializeWhatsApp = async (credsJson = null) => {
  try {
    // Ensure auth directory exists
    fs.ensureDirSync(authFolder);
    
    // If credentials JSON is provided, write it to auth/creds.json
    if (credsJson) {
      fs.writeFileSync(path.join(authFolder, 'creds.json'), credsJson);
    }
    
    // Load auth state
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();
    
    console.log(`Using WA version: ${version.join('.')}`);
    
    // Create WhatsApp socket
    sock = makeWASocket({
      version,
      printQRInTerminal: true,
      auth: state,
      markOnlineOnConnect: false,
      msgRetryCounterMap: {},
      defaultQueryTimeoutMs: 60000,
      logger: {
        info: (msg) => console.log(`[WhatsApp INFO] ${msg}`),
        error: (msg) => console.error(`[WhatsApp ERROR] ${msg}`),
        warn: (msg) => console.warn(`[WhatsApp WARN] ${msg}`),
        debug: (msg) => {},
      },
    });
    
    // Save credentials when auth state is updated
    sock.ev.on('creds.update', saveCreds);
    
    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      // Update QR code if available
      if (qr) {
        console.log('QR Code received:', qr);
        qrCodeData = qr;
        qrcode.generate(qr, { small: true });
      }
      
      // Update connection status
      if (connection) {
        connectionStatus = connection;
        console.log('Connection status:', connection);
        
        if (connection === 'open') {
          console.log('Connected to WhatsApp');
          qrCodeData = null;
          
          // Start processing message queue if there are pending messages
          if (messageQueue.length > 0 && !isProcessingQueue) {
            processMessageQueue();
          }
        }
      }
      
      // Handle disconnection
      if (connection === 'close') {
        const shouldReconnect = 
          lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        
        console.log('Connection closed due to:', lastDisconnect.error, 'Reconnecting:', shouldReconnect);
        
        if (shouldReconnect) {
          console.log('Attempting to reconnect...');
          initializeWhatsApp();
        } else {
          console.log('Logged out, not reconnecting');
          connectionStatus = 'disconnected';
          qrCodeData = null;
        }
      }
    });
    
    // Handle messages
    sock.ev.on('messages.upsert', async (m) => {
      console.log('New message:', JSON.stringify(m, undefined, 2));
      
      // Here you can add logic to handle incoming messages if needed
    });
    
    return true;
  } catch (error) {
    console.error('Error initializing WhatsApp:', error);
    connectionStatus = 'error';
    return false;
  }
};

// Generate pairing code for authentication
const generatePairingCode = async (phoneNumber) => {
  try {
    // If WhatsApp is not initialized, initialize it first
    if (!sock) {
      await initializeWhatsApp();
    }
    
    // Remove any non-numeric characters and ensure it starts with country code
    const formattedNumber = phoneNumber.replace(/\\D/g, '');
    
    // Phone number should be in format: countrycode+number without +
    if (!formattedNumber.match(/^[0-9]{10,15}$/)) {
      throw new Error('Invalid phone number format. Should be 10-15 digits.');
    }
    
    if (connectionStatus !== 'connecting') {
      throw new Error('WhatsApp connection not in connecting state');
    }
    
    console.log(`Requesting pairing code for: ${formattedNumber}`);
    
    // Request pairing code from WhatsApp
    const code = await sock.requestPairingCode(formattedNumber);
    console.log(`Got pairing code: ${code}`);
    
    return code;
  } catch (error) {
    console.error('Failed to generate pairing code:', error);
    throw error;
  }
};

// Send WhatsApp message function
const sendWhatsAppMessage = async ({
  target,
  targetType = 'individual',
  message,
  delay = 1,
  retry = true,
  maxRetries = 3
}) => {
  // Add message to queue
  messageQueue.push({
    target,
    targetType,
    message,
    delay,
    retry,
    maxRetries,
    attempts: 0
  });
  
  // Start processing queue if not already processing
  if (!isProcessingQueue && connectionStatus === 'open') {
    processMessageQueue();
  }
  
  return { success: true, message: 'Message added to queue' };
};

// Process message queue
const processMessageQueue = async () => {
  if (messageQueue.length === 0 || isProcessingQueue) {
    return;
  }
  
  isProcessingQueue = true;
  
  while (messageQueue.length > 0) {
    const messageData = messageQueue[0];
    
    try {
      // Skip if socket is not connected
      if (connectionStatus !== 'open' || !sock) {
        console.log('WhatsApp not connected, waiting before processing queue...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        continue;
      }
      
      const { target, targetType, message, delay, retry, maxRetries, attempts } = messageData;
      
      if (attempts >= maxRetries) {
        console.log(`Max retries reached for message to ${target}, skipping`);
        messageQueue.shift();
        continue;
      }
      
      // Format the target JID
      let jid = '';
      if (targetType === 'group') {
        jid = `${target}@g.us`;
      } else {
        jid = `${target}@s.whatsapp.net`;
      }
      
      console.log(`Sending message to ${jid}, attempt ${attempts + 1}/${maxRetries}`);
      
      // Send the message
      await sock.sendMessage(jid, { text: message });
      console.log(`Message sent successfully to ${jid}`);
      
      // Remove the message from the queue
      messageQueue.shift();
      
      // Apply delay before next message
      if (messageQueue.length > 0 && delay > 0) {
        console.log(`Waiting ${delay} seconds before next message`);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }
    } catch (error) {
      console.error(`Error sending message:`, error);
      
      // Increment retry count
      messageQueue[0].attempts += 1;
      
      // If no more retries, remove from queue
      if (!messageQueue[0].retry || messageQueue[0].attempts >= messageQueue[0].maxRetries) {
        console.log(`Dropping message to ${messageQueue[0].target} after ${messageQueue[0].attempts} failed attempts`);
        messageQueue.shift();
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  isProcessingQueue = false;
};

// Disconnect WhatsApp function
const disconnectWhatsApp = async () => {
  if (sock) {
    sock.end();
    sock = null;
  }
  
  connectionStatus = 'disconnected';
  qrCodeData = null;
  messageQueue = [];
  isProcessingQueue = false;
  
  console.log('WhatsApp disconnected');
  return true;
};

// Get WhatsApp status function
const getWhatsAppStatus = () => {
  return { 
    status: connectionStatus,
    qrCode: qrCodeData
  };
};

module.exports = {
  initializeWhatsApp,
  sendWhatsAppMessage,
  disconnectWhatsApp,
  getWhatsAppStatus,
  generatePairingCode
};