// server/routes/emergency.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');


router.post('/send-alert', async (req, res) => {
  const { phoneNumber, message } = req.body;

  try {
    // Option 1: TextBelt (1 free SMS/day)
    const textBeltResponse = await fetch('http://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phoneNumber,
        message: message,
        key: 'textbelt-free-key' // Get from textbelt.com
      })
    });

    const result = await textBeltResponse.json();

    if (!result.success) {
      // Fallback to email-to-SMS
      await sendEmailSMSCarrierGateway(phoneNumber, message);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send alert' });
  }
});

// Email-to-SMS fallback
async function sendEmailSMSCarrierGateway(phoneNumber, message) {
  // Implement carrier-specific email gateways
  // Example: 1234567890@txt.att.net for AT&T
}

module.exports = router;