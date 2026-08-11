// server.js
import express from 'express';
import initiatePayment from './api/initiate-payment.js';
import verifyPayment from './api/verify-payment.js';
import normalizePhone from './api/normalize-phone.js';
// Note: callback.js is usually called by MegaPay, so we'll add that too.
import callbackHandler from './api/callback.js';

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve your static HTML files (like apply.html, dash.html, eligibility.html)
app.use(express.static('.')); // Serves files from the current directory

// --- Mount your API routes ---
app.post('/api/initiate-payment', (req, res) => {
  // Wrap the handler to match Express req/res
  initiatePayment(req, res);
});

app.get('/api/verify-payment', (req, res) => {
  verifyPayment(req, res);
});

app.post('/api/normalize-phone', (req, res) => {
  normalizePhone(req, res);
});

app.post('/api/callback', (req, res) => {
  callbackHandler(req, res);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});