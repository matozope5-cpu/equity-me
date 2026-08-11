// server.js - FULLY CONSOLIDATED (No /api folder needed anymore)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// --- 🔴 HARDCODED CREDENTIALS (Safe on the server) ---
const MEGAPAY_CONFIG = {
  apiKey: 'MGPY8h6lIlxh',
  email: 'hubslinks@gmail.com',
  baseUrl: 'https://megapay.co.ke'
};

// Middleware
app.use(express.json());
app.use(express.static('.')); // Serves your HTML, CSS, JS files

// ----------------------------------------------
// 1. NORMALIZE PHONE (Merged from normalize-phone.js)
// ----------------------------------------------
app.post('/api/normalize-phone', (req, res) => {
  try {
    let phone = req.body.phone;
    if (!phone) return res.status(400).json({ error: 'Phone is required' });

    phone = phone.replace(/[\s\-\(\)]/g, '');
    if (phone.startsWith('+')) phone = phone.substring(1);

    if (phone.startsWith('07')) phone = '254' + phone.substring(1);
    else if (phone.startsWith('01')) phone = '254' + phone.substring(1);
    else if (phone.startsWith('7') && phone.length === 9) phone = '254' + phone;
    else if (phone.startsWith('1') && phone.length === 9) phone = '254' + phone;
    else if (!phone.startsWith('254')) return res.status(400).json({ error: 'Invalid format' });

    if (phone.length !== 12 || !phone.startsWith('254')) {
      return res.status(400).json({ error: 'Invalid Kenyan number' });
    }
    res.status(200).json({ success: true, normalized_phone: phone });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ----------------------------------------------
// 2. INITIATE PAYMENT (Merged from initiate-payment.js)
// ----------------------------------------------
app.post('/api/initiate-payment', async (req, res) => {
  try {
    const { phone_number, amount } = req.body;
    if (!phone_number || !amount) {
      return res.status(400).json({ error: 'Missing phone or amount' });
    }

    // Convert 2547... to 07... for MegaPay
    let msisdn = phone_number;
    if (msisdn.startsWith('254')) {
      msisdn = '0' + msisdn.substring(3);
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `TYN-${timestamp}-${randomStr}`;

    const payload = {
      api_key: MEGAPAY_CONFIG.apiKey,
      email: MEGAPAY_CONFIG.email,
      amount: parseInt(amount),
      msisdn: msisdn,
      reference: reference,
      // Optional: Add your callback URL if MegaPay requires it
      // callback_url: 'https://your-app.onrender.com/api/callback'
    };

    console.log('Sending to MegaPay:', JSON.stringify(payload));

    const response = await fetch(`${MEGAPAY_CONFIG.baseUrl}/backend/v1/initiatestk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('MegaPay Init Response:', JSON.stringify(result));

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Initiation failed');
    }

    // Check for error response from MegaPay (even if HTTP 200)
    if (!result.transaction_request_id) {
      throw new Error(result.ResponseDescription || result.massage || 'No transaction ID returned');
    }

    res.status(200).json({
      success: true,
      reference: result.transaction_request_id,
      external_reference: reference,
      raw: result
    });

  } catch (error) {
    console.error('Init error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------
// 3. VERIFY PAYMENT (Merged from verify-payment.js)
// ----------------------------------------------
app.get('/api/verify-payment', async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) {
      return res.status(400).json({ error: 'Reference required' });
    }

    const payload = {
      api_key: MEGAPAY_CONFIG.apiKey,
      email: MEGAPAY_CONFIG.email,
      transaction_request_id: reference
    };

    const response = await fetch(`${MEGAPAY_CONFIG.baseUrl}/backend/v1/transactionstatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('MegaPay Verify Response:', JSON.stringify(result));

    if (!response.ok) {
      throw new Error(result.message || 'Verification failed');
    }

    // Determine status
    let status = result.TransactionStatus || result.status || '';
    if (!status && result.ResponseCode !== undefined) {
      status = Number(result.ResponseCode) === 0 ? 'COMPLETED' : 'FAILED';
    }
    if (!status && result.TransactionCode !== undefined) {
      status = String(result.TransactionCode) === '0' ? 'COMPLETED' : 'PENDING';
    }

    const statusUpper = typeof status === 'string' ? status.toUpperCase() : '';
    const statusMap = {
      'COMPLETED': 'COMPLETED', 'SUCCESS': 'COMPLETED', 'PAID': 'COMPLETED',
      'PENDING': 'PENDING', 'FAILED': 'FAILED', 'CANCELLED': 'CANCELLED',
      'CANCELED': 'CANCELLED', '0': 'COMPLETED', '1': 'PENDING', '2': 'FAILED'
    };
    const mappedStatus = statusMap[statusUpper] || statusUpper || 'UNKNOWN';

    res.status(200).json({ success: true, status: mappedStatus, data: result });

  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------
// 4. CALLBACK (Merged from callback.js)
// ----------------------------------------------
app.post('/api/callback', async (req, res) => {
  try {
    console.log('MegaPay Callback received:', req.body);
    // TODO: Update your database here
    res.status(200).json({ success: true, message: 'Callback received' });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(200).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------
// START THE SERVER
// ----------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Consolidated server running on port ${PORT}`);
  console.log(`📁 Serving static files from current directory`);
});