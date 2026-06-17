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
const sendEmail = require('../utils/sendEmail');

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

    const nearbyDonors = await User.find({
      _id: { $ne: req.user.id },
      role: 'donor',
      bloodType: { $in: compatibleTypes },
      location: {
        $near: {
          $geometry: requestLocation,
          $maxDistance: maxDistanceInMeters
        }
      },
      lastUpdated: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Location updated in last 24 hours
      }
    });

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
    const requests = await BloodRequest.find().populate('requester', 'name email');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Get a specific blood request by ID
const getRequestById = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id).populate('requester', 'name email');
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

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus
};