// const BloodRequest = require('../models/BloodRequest');

// // Create a new blood request
// const createRequest = async (req, res) => {
//   try {
//     const { patientName, bloodTypeRequired, unitsRequired, urgency, hospitalName, hospitalLocation, contactNumber } = req.body;

//     const request = new BloodRequest({
//       requester: req.user.id,
//       patientName,
//       bloodTypeRequired,
//       unitsRequired,
//       urgency,
//       hospitalName,
//       hospitalLocation,
//       contactNumber
//     });

//     const createdRequest = await request.save();
//     res.status(201).json(createdRequest);
//   } catch (error) {
//     res.status(500).json({ message: 'Server Error', error: error.message });
//   }
// };

// // Get all blood requests
// const getRequests = async (req, res) => {
//   try {
//     const requests = await BloodRequest.find().populate('requester', 'name email');
//     res.json(requests);
//   } catch (error) {
//     res.status(500).json({ message: 'Server Error', error: error.message });
//   }
// };

// // Get a specific blood request by ID
// const getRequestById = async (req, res) => {
//   try {
//     const request = await BloodRequest.findById(req.params.id).populate('requester', 'name email');
//     if (request) {
//       res.json(request);
//     } else {
//       res.status(404).json({ message: 'Request not found' });
//     }
//   } catch (error) {
//     res.status(500).json({ message: 'Server Error', error: error.message });
//   }
// };

// // Update a specific blood request status
// const updateRequestStatus = async (req, res) => {
//   try {
//     const request = await BloodRequest.findById(req.params.id);
//     if (!request) {
//       return res.status(404).json({ message: 'Request not found' });
//     }

//     // Check ownership (must be the requester or admin)
//     if (request.requester.toString() !== req.user.id && req.user.role !== 'admin') {
//       return res.status(401).json({ message: 'Not authorized to modify this request' });
//     }

//     if (req.body.status) {
//       if (!['Pending', 'Fulfilled', 'Closed'].includes(req.body.status)) {
//         return res.status(400).json({ message: 'Invalid status value' });
//       }
//       request.status = req.body.status;
//     }

//     const updatedRequest = await request.save();
//     res.json(updatedRequest);
//   } catch (error) {
//     res.status(500).json({ message: 'Server Error', error: error.message });
//   }
// };

// module.exports = {
//   createRequest,
//   getRequests,
//   getRequestById,
//   updateRequestStatus
// };

const BloodRequest = require('../models/BloodRequest');
const User = require('../models/User');
const Donation = require('../models/Donation');
const sendEmail = require('../utils/sendEmail');
const { checkCollusion } = require('../utils/geminiAI');

// Helper to get compatible blood types
const getCompatibleBloodTypes = (recipientType) => {
  const compatibility = {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
  };
  return compatibility[recipientType] || [recipientType];
};

// Create a new blood request
const createRequest = async (req, res) => {
  try {
    const { 
      patientName, 
      bloodTypeRequired, 
      unitsRequired, 
      urgency, 
      hospitalName, 
      hospitalLocation, 
      coordinates, // [longitude, latitude]
      contactNumber,
      radius // in km
    } = req.body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ message: 'Hospital coordinates [longitude, latitude] are required.' });
    }

    const requestLocation = {
      type: 'Point',
      coordinates: [Number(coordinates[0]), Number(coordinates[1])]
    };

    let chosenRadius = Number(radius) || 2;
    if (chosenRadius > 10) {
      chosenRadius = 10;
    }
    if (chosenRadius <= 0) {
      chosenRadius = 2;
    }

    const request = new BloodRequest({
      requester: req.user.id,
      patientName,
      bloodTypeRequired,
      unitsRequired,
      urgency,
      hospitalName,
      hospitalLocation,
      location: requestLocation,
      radius: chosenRadius,
      contactNumber
    });

    const createdRequest = await request.save();

    // Perform proximity search and send email alerts in the background
    const maxDistanceInMeters = chosenRadius * 1000;
    const compatibleTypes = getCompatibleBloodTypes(bloodTypeRequired);

    let nearbyDonors = [];
    try {
      nearbyDonors = await User.find({
        _id: { $ne: req.user.id },
        role: 'donor',
        hasHealthIssues: { $ne: true },
        bloodType: { $in: compatibleTypes },
        location: {
          $near: {
            $geometry: requestLocation,
            $maxDistance: maxDistanceInMeters
          }
        },
        lastUpdated: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Location updated in last 30 days
        }
      });
    } catch (geoErr) {
      console.error('Proximity search query failed:', geoErr);
      nearbyDonors = await User.find({
        _id: { $ne: req.user.id },
        role: 'donor',
        hasHealthIssues: { $ne: true },
        bloodType: { $in: compatibleTypes }
      });
    }

    if (nearbyDonors.length > 0) {
      const emailPromises = nearbyDonors.map(async (donor) => {
        try {
          const emailOptions = {
            email: donor.email,
            subject: `URGENT: Blood Donation Needed Nearby (${urgency})`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #d32f2f; text-align: center; margin-bottom: 25px;">Urgent Blood Donation Request</h2>
                <p>Hello <strong>${donor.name}</strong>,</p>
                <p>A blood request matching your blood type compatibility has been posted near your location.</p>
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d32f2f;">
                  <h3 style="margin-top: 0; color: #333; margin-bottom: 15px;">Request Details:</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; color: #555; width: 40%;">Required Blood Type:</td>
                      <td style="padding: 8px 0; color: #d32f2f; font-weight: bold; font-size: 16px;">${bloodTypeRequired}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; color: #555;">Units Needed:</td>
                      <td style="padding: 8px 0;">${unitsRequired}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; color: #555;">Urgency:</td>
                      <td style="padding: 8px 0; color: #d32f2f; font-weight: bold;">${urgency}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; color: #555;">Hospital Name:</td>
                      <td style="padding: 8px 0;">${hospitalName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; color: #555;">Hospital Address:</td>
                      <td style="padding: 8px 0;">${hospitalLocation}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; color: #555;">Contact Number:</td>
                      <td style="padding: 8px 0; font-weight: bold; color: #333;">${contactNumber}</td>
                    </tr>
                  </table>
                </div>
                <p>If you are in a position to donate, please get in touch immediately.</p>
                <p style="text-align: center; font-size: 12px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
                  Thank you for being a part of the Blood Bridge life-saving network.
                </p>
              </div>
            `
          };
          await sendEmail(emailOptions);
        } catch (emailErr) {
          console.error(`Failed to send request email to donor ${donor.email}:`, emailErr);
        }
      });

      // Execute email notifications in the background
      Promise.all(emailPromises).catch((err) => {
        console.error('Error in batch donor notification emails:', err);
      });
    }

    res.status(201).json(createdRequest);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Get all blood requests
const getRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find().populate('requester', 'name email trustScore');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Get a specific blood request by ID
const getRequestById = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id).populate('requester', 'name email trustScore');
    if (request) {
      res.json(request);
    } else {
      res.status(404).json({ message: 'Request not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Update a specific blood request status
const updateRequestStatus = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check ownership (must be the requester or admin)
    if (request.requester.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to modify this request' });
    }

    if (req.body.status) {
      if (!['Pending', 'Fulfilled', 'Closed'].includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
      request.status = req.body.status;
    }

    const updatedRequest = await request.save();
    res.json(updatedRequest);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Schedule a new donation for a request
const scheduleDonation = async (req, res) => {
  try {
    const { unitsDonated } = req.body;
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const donor = await User.findById(req.user.id);
    if (!donor) {
      return res.status(404).json({ message: 'Donor not found' });
    }

    // 1. Check if user is suspended
    if (donor.isSuspended) {
      return res.status(403).json({ message: 'Access Denied: Your account is suspended.' });
    }

    // 2. Check if user is frozen (needs verification)
    if (donor.isFrozen) {
      return res.status(403).json({ message: 'Access Denied: Your account is frozen. Please upload verified documents to unlock.' });
    }

    // 2b. Check if user has health issues (e.g. sugar, AIDS, etc.)
    if (donor.hasHealthIssues) {
      return res.status(403).json({ message: 'Access Denied: Blood donation is disabled for your account due to registered health conditions.' });
    }

    // 3. Check cooling period
    if (donor.coolingPeriodEnd && donor.coolingPeriodEnd > new Date()) {
      const remainingDays = Math.ceil((donor.coolingPeriodEnd - new Date()) / (24 * 60 * 60 * 1000));
      return res.status(400).json({ 
        message: `Cooling Period Active: You cannot donate yet. Please wait ${remainingDays} more day(s) before donating again.`
      });
    }

    // 4. Create scheduled donation
    const donation = new Donation({
      donor: donor._id,
      request: request._id,
      requester: request.requester,
      bloodType: donor.bloodType,
      unitsDonated: Number(unitsDonated) || 1,
      status: 'Scheduled'
    });

    const scheduled = await donation.save();
    res.status(201).json(scheduled);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Helper for Haversine distance in km
const getHaversineDistance = (coords1, coords2) => {
  if (!coords1 || !coords2) return null;
  const lon1 = coords1[0];
  const lat1 = coords1[1];
  const lon2 = coords2[0];
  const lat2 = coords2[1];
  
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return Math.round(d * 10) / 10;
};

// Get all scheduled donations for a request
const getDonationsForRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check ownership: only the hospital/requester can see the scheduled donations list
    if (request.requester.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to view donations for this request' });
    }

    const donations = await Donation.find({ request: request._id })
      .populate('donor', 'name email trustScore badge isEmergencyHero location');
    
    const donationsWithDistance = donations.map(d => {
      const distance = d.donor && d.donor.location && request.location
        ? getHaversineDistance(request.location.coordinates, d.donor.location.coordinates)
        : null;
      
      const doc = d.toObject();
      doc.distance = distance;
      return doc;
    });

    donationsWithDistance.sort((a, b) => {
      const distA = a.distance !== null ? a.distance : Infinity;
      const distB = b.distance !== null ? b.distance : Infinity;
      return distA - distB;
    });

    res.json(donationsWithDistance);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Verify/Complete donation (Poster approves it, awards points, cooling period, badges)
const verifyDonation = async (req, res) => {
  try {
    const { donationId, unitsDonated, feedback } = req.body;
    
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    const request = await BloodRequest.findById(donation.request);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check ownership: must be requester
    if (request.requester.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to verify this donation' });
    }

    const donor = await User.findById(donation.donor);
    const requester = await User.findById(request.requester);

    if (!donor) {
      return res.status(404).json({ message: 'Donor not found' });
    }

    // 1. Run Gemini AI collusion & fraud check
    const collusionResult = await checkCollusion(requester, donor, feedback);
    if (collusionResult.isFraudulent) {
      console.warn(`Abuse detected by collusion check! Confidence: ${collusionResult.confidence}%`);
      
      // Slash trust scores
      donor.trustScore = Math.max(0, donor.trustScore - 30);
      requester.trustScore = Math.max(0, requester.trustScore - 30);

      // Check freeze threshold (< 75)
      if (donor.trustScore < 75) donor.isFrozen = true;
      if (requester.trustScore < 75) requester.isFrozen = true;

      // Check suspension threshold (< 40)
      if (donor.trustScore < 40) donor.isSuspended = true;
      if (requester.trustScore < 40) requester.isSuspended = true;

      await donor.save();
      await requester.save();

      donation.status = 'Fake';
      await donation.save();

      return res.status(400).json({
        message: `AI Collusion/Abuse Detected: ${collusionResult.reason} Accounts restricted.`
      });
    }

    // 2. Successful verification: Award Points and cooling period
    donation.status = 'Completed';
    donation.unitsDonated = Number(unitsDonated) || donation.unitsDonated;
    await donation.save();

    // Reward points according to urgency
    let pointsAwarded = 1; // Normal
    if (request.urgency === 'Critical') {
      pointsAwarded = 10;
      donor.isEmergencyHero = true;
    } else if (request.urgency === 'High') {
      pointsAwarded = 5;
    }

    donor.rewardPoints += pointsAwarded;
    donor.donationsCount += 1;
    donor.lastDonationDate = new Date();
    
    // Set cooling period (56 days)
    donor.coolingPeriodEnd = new Date(Date.now() + 56 * 24 * 60 * 60 * 1000);

    // Increase trust score slightly on good behavior
    donor.trustScore = Math.min(100, donor.trustScore + 5);

    // Update badges
    if (donor.rewardPoints >= 75) {
      donor.badge = 'gold';
    } else if (donor.rewardPoints >= 35) {
      donor.badge = 'silver';
    } else if (donor.rewardPoints >= 10) {
      donor.badge = 'bronze';
    }

    await donor.save();

    // Sum all completed donations for this request to check fulfillment
    try {
      const completedDonations = await Donation.find({ request: request._id, status: 'Completed' });
      const totalCompletedUnits = completedDonations.reduce((sum, d) => sum + d.unitsDonated, 0);

      if (totalCompletedUnits >= request.unitsRequired) {
        // Delete the fulfilled request
        await BloodRequest.findByIdAndDelete(request._id);
        // Clean up other remaining scheduled/pending donations for this request
        await Donation.deleteMany({ request: request._id, status: 'Scheduled' });
      }
    } catch (dbErr) {
      console.error('Failed to handle request fulfillment deletion:', dbErr.message);
    }

    res.json({
      message: 'Donation successfully verified and completed!',
      donation,
      pointsEarned: pointsAwarded,
      newPointsBalance: donor.rewardPoints,
      badge: donor.badge,
      coolingPeriodEnd: donor.coolingPeriodEnd
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Report Fake/Suspicious donation (Slashes trust score, freeze account)
const reportFakeDonation = async (req, res) => {
  try {
    const { donationId } = req.body;

    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    const request = await BloodRequest.findById(donation.request);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check ownership
    if (request.requester.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to report this donation' });
    }

    donation.status = 'Fake';
    await donation.save();

    const donor = await User.findById(donation.donor);
    if (donor) {
      // Slashed by 25 points
      donor.trustScore = Math.max(0, donor.trustScore - 25);

      if (donor.trustScore < 75) {
        donor.isFrozen = true;
      }
      if (donor.trustScore < 40) {
        donor.isSuspended = true;
      }

      await donor.save();
    }

    res.json({
      message: 'Donation flagged as fake. Donor trust score has been lowered.',
      donation
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
  scheduleDonation,
  getDonationsForRequest,
  verifyDonation,
  reportFakeDonation
};