const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const BloodRequest = require('./models/BloodRequest');

dotenv.config();

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

const runTest = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Error: MONGODB_URI is not defined.');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for alert test.');

    // 1. Let's create or update a test donor at Uppalaguptam coordinates
    const testDonorEmail = 'test_donor_uppalaguptam@example.com';
    let donor = await User.findOne({ email: testDonorEmail });
    if (!donor) {
      donor = new User({
        name: 'Test Donor Uppalaguptam',
        email: testDonorEmail,
        password: 'hashedpassword123',
        bloodType: 'O-',
        role: 'donor',
        location: {
          type: 'Point',
          coordinates: [82.2198, 16.7324]
        },
        cityName: 'Uppalaguptam',
        lastUpdated: new Date()
      });
      await donor.save();
      console.log('Created new test donor user for simulation.');
    } else {
      donor.location = {
        type: 'Point',
        coordinates: [82.2198, 16.7324]
      };
      donor.lastUpdated = new Date();
      donor.bloodType = 'O-';
      await donor.save();
      console.log('Updated existing test donor for simulation.');
    }

    // 2. Perform proximity search logic using similar parameters
    // Let's search from a coordinate that is very close (e.g. 1km away: [82.21, 16.73])
    const requestLocation = {
      type: 'Point',
      coordinates: [82.21, 16.73] // Approx 1.1km away from [82.2198, 16.7324]
    };
    const maxDistanceInMeters = 5000; // 5km search radius
    const bloodTypeRequired = 'A+'; // O- is a compatible donor for A+
    const compatibleTypes = getCompatibleBloodTypes(bloodTypeRequired);

    console.log(`Searching for donors near: ${JSON.stringify(requestLocation.coordinates)}`);
    console.log(`Compatible blood types for ${bloodTypeRequired}: ${compatibleTypes.join(', ')}`);

    const nearbyDonors = await User.find({
      role: 'donor',
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

    console.log(`Found ${nearbyDonors.length} nearby compatible donor(s):`);
    nearbyDonors.forEach((d) => {
      console.log(`- ${d.name} (${d.email}) - Blood: ${d.bloodType} - Coords: ${d.location.coordinates}`);
    });

    if (nearbyDonors.length > 0) {
      console.log('Test successful: Nearby search correctly found the donor.');
    } else {
      console.warn('Test warning: No nearby compatible donors found. Check index or coordinates.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
};

runTest();
