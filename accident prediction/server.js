const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

// Twilio setup
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Emergency request storage (in-memory, replace with database in production)
let emergencyRequests = [];

// Emergency API Endpoint
app.post('/api/emergency', async (req, res) => {
  try {
    const { serviceType, latitude, longitude, userId, additionalInfo, phoneNumber } = req.body;
    
    // Validate required fields
    if (!serviceType || !latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: serviceType, latitude, longitude' 
      });
    }

    // Create emergency record
    const emergencyRequest = {
      id: Date.now(),
      serviceType,
      location: { lat: latitude, lng: longitude },
      timestamp: new Date().toISOString(),
      userId,
      additionalInfo,
      phoneNumber,
      status: 'pending'
    };

    // Store the request (in production, save to database)
    emergencyRequests.push(emergencyRequest);

    console.log(`🚨 EMERGENCY REQUEST (${serviceType}) at ${latitude},${longitude}`);

    // Send SMS alert (if phoneNumber is provided)
    if (phoneNumber) {
      try {
        await client.messages.create({
          body: `🚨 Emergency Alert: ${serviceType} needed at ${latitude},${longitude}. Please respond immediately.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
        console.log('📲 SMS alert sent successfully.');
      } catch (smsError) {
        console.error('❌ Failed to send SMS alert:', smsError);
      }
    }

    res.status(201).json({ 
      success: true,
      requestId: emergencyRequest.id,
      message: 'Emergency services have been alerted'
    });

  } catch (error) {
    console.error('❌ Emergency request failed:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process emergency request'
    });
  }
});

// Get emergency request status (optional)
app.get('/api/emergency/:id', (req, res) => {
  const request = emergencyRequests.find(r => r.id === parseInt(req.params.id));
  if (!request) {
    return res.status(404).json({ success: false, message: 'Request not found' });
  }
  res.json({ success: true, request });
});

// Admin endpoint to view all emergencies (protected in production)
app.get('/api/emergencies', (req, res) => {
  res.json({ 
    success: true, 
    count: emergencyRequests.length,
    requests: emergencyRequests 
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Emergency server running on http://localhost:${PORT}`);
  console.log(`📞 Emergency endpoint: POST http://localhost:${PORT}/api/emergency`);
});
