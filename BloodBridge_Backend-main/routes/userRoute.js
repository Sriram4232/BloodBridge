const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Donation = require('../models/Donation');
const BloodRequest = require('../models/BloodRequest');
const { protect } = require('../middlewares/auth');
const { checkMedicalEligibility } = require('../utils/geminiAI');

// GET /api/users/leaderboard - Get top donors
router.get('/leaderboard', async (req, res) => {
  try {
    const topDonors = await User.find({ role: 'donor', isSuspended: false })
      .sort({ rewardPoints: -1 })
      .limit(10)
      .select('name email rewardPoints badge donationsCount trustScore isEmergencyHero cityName');
    res.json(topDonors);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// GET /api/users/stats - Get aggregate stats
router.get('/stats', async (req, res) => {
  try {
    const totalDonations = await Donation.countDocuments({ status: 'Completed' });
    const totalDonors = await User.countDocuments({ role: 'donor', isSuspended: false });
    const activeRequests = await BloodRequest.countDocuments({ status: 'Pending' });
    const criticalResolved = await BloodRequest.countDocuments({ 
      urgency: 'Critical', 
      status: { $in: ['Fulfilled', 'Closed'] } 
    });

    res.json({
      totalDonations: totalDonations || 14, // seed some defaults if new db
      totalDonors: totalDonors || 42,
      activeRequests: activeRequests || 5,
      criticalResolved: criticalResolved || 8
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// POST /api/users/redeem - Redeem points for medical voucher
router.post('/redeem', protect, async (req, res) => {
  try {
    const { privilegeType } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const costs = {
      consultation: 15,
      test: 30,
      booking: 50
    };

    const cost = costs[privilegeType];
    if (!cost) {
      return res.status(400).json({ message: 'Invalid privilege type selected.' });
    }

    if (user.rewardPoints < cost) {
      return res.status(400).json({ message: `Insufficient points balance. Need ${cost} points.` });
    }

    user.rewardPoints -= cost;
    await user.save();

    // Generate mock unique voucher code
    const randCode = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const voucherCode = `BB-${privilegeType.toUpperCase()}-${randCode}`;

    res.json({
      message: 'Points successfully redeemed!',
      voucherCode,
      newPointsBalance: user.rewardPoints
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// GET /api/users/profile - Get current user profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// PUT /api/users/profile - Update user profile (health, document)
router.put('/profile', protect, async (req, res) => {
  try {
    const { hasHealthIssues, healthIssuesDetails, verificationDocument } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (hasHealthIssues !== undefined) user.hasHealthIssues = !!hasHealthIssues;
    if (healthIssuesDetails !== undefined) {
      user.healthIssuesDetails = healthIssuesDetails;
      if (healthIssuesDetails.trim()) {
        const medicalCheck = await checkMedicalEligibility(healthIssuesDetails);
        if (medicalCheck.hasIssues) {
          user.hasHealthIssues = true;
        }
      }
    }
    if (verificationDocument !== undefined) {
      user.verificationDocument = verificationDocument;
      // Automatically unfreeze user if they uploaded a document
      if (user.isFrozen) {
        user.isFrozen = false;
      }
    }

    await user.save();
    const updatedUser = await User.findById(user._id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

module.exports = router;
