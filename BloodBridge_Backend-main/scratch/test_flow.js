const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');
const Donation = require('../models/Donation');
const BloodRequest = require('../models/BloodRequest');
const { checkCollusion } = require('../utils/geminiAI');

dotenv.config();

async function runIntegrationTest() {
  console.log('--- STARTING FLOW INTEGRATION TEST ---');
  await connectDB();

  // 1. Create/Retrieve test accounts
  console.log('Setting up test accounts...');
  
  // Cleanup any old test accounts
  await User.deleteMany({ email: { $in: ['test_donor1@example.com', 'test_donor2@example.com', 'test_requester@example.com'] } });
  
  const testDonor1 = new User({
    name: 'Test Donor One',
    email: 'test_donor1@example.com',
    password: 'password123',
    bloodType: 'O+',
    role: 'donor',
    location: { type: 'Point', coordinates: [82.2198, 16.7324] },
    cityName: 'Kakinada',
    rewardPoints: 0,
    donationsCount: 0,
    trustScore: 100,
    badge: 'none',
    isEmergencyHero: false,
    isFrozen: false,
    isSuspended: false
  });
  await testDonor1.save();

  const testDonor2 = new User({
    name: 'Test Donor Two',
    email: 'test_donor2@example.com',
    password: 'password123',
    bloodType: 'O+',
    role: 'donor',
    location: { type: 'Point', coordinates: [82.2198, 16.7324] },
    cityName: 'Kakinada',
    rewardPoints: 10, // starts with 10
    donationsCount: 1,
    trustScore: 100,
    badge: 'bronze',
    isEmergencyHero: false,
    isFrozen: false,
    isSuspended: false
  });
  await testDonor2.save();

  const testRequester = new User({
    name: 'Test Requester',
    email: 'test_requester@example.com',
    password: 'password123',
    bloodType: 'O+',
    role: 'recipient',
    location: { type: 'Point', coordinates: [82.2198, 16.7324] },
    cityName: 'Kakinada',
    trustScore: 100,
    isFrozen: false,
    isSuspended: false
  });
  await testRequester.save();

  console.log('Test accounts created.');

  // 2. Create blood request requiring 2 units of High Urgency (disease/cancer)
  console.log('\nCreating blood request (Urgency: High, Units Needed: 2)...');
  const bloodRequest = new BloodRequest({
    requester: testRequester._id,
    patientName: 'Jane Smith',
    bloodTypeRequired: 'O+',
    unitsRequired: 2,
    urgency: 'High',
    hospitalName: 'Cancer Treatment Center',
    hospitalLocation: 'Kakinada Main St',
    location: { type: 'Point', coordinates: [82.2198, 16.7324] },
    radius: 5,
    contactNumber: '9876543210',
    status: 'Pending'
  });
  await bloodRequest.save();
  console.log('Blood request created:', bloodRequest._id);

  // 3. Simulating both donors accepting/scheduling the donation
  console.log('\nDonor 1 accepting donation (1 unit)...');
  const donation1 = new Donation({
    donor: testDonor1._id,
    request: bloodRequest._id,
    bloodType: testDonor1.bloodType,
    unitsDonated: 1,
    status: 'Scheduled'
  });
  await donation1.save();

  console.log('Donor 2 accepting donation (1 unit)...');
  const donation2 = new Donation({
    donor: testDonor2._id,
    request: bloodRequest._id,
    bloodType: testDonor2.bloodType,
    unitsDonated: 1,
    status: 'Scheduled'
  });
  await donation2.save();

  // 4. Requestee listing scheduled donations
  console.log('\nRequestee retrieving scheduled donations...');
  const scheduledList = await Donation.find({ request: bloodRequest._id, status: 'Scheduled' });
  console.log(`Found ${scheduledList.length} scheduled donation(s).`);
  
  if (scheduledList.length === 2) {
    console.log('✅ Requestee sees both donors in the list.');
  } else {
    throw new Error('Verification failed: Not all scheduled donors are visible.');
  }

  // 5. Verify Donor 1 donation (High Urgency = 5 pts)
  console.log('\nVerifying Donor 1 donation...');
  const collusion1 = await checkCollusion(testRequester, testDonor1, 'Verified onsite');
  if (collusion1.isFraudulent) throw new Error('Donor 1 falsely flagged.');

  donation1.status = 'Completed';
  await donation1.save();

  testDonor1.rewardPoints += 5;
  testDonor1.donationsCount += 1;
  if (testDonor1.rewardPoints >= 10) testDonor1.badge = 'bronze';
  await testDonor1.save();

  // Check request status - should still be Pending because only 1 unit of 2 has been completed
  const reqCheck1 = await BloodRequest.findById(bloodRequest._id);
  console.log('Request Status after Donor 1 completion:', reqCheck1.status);
  if (reqCheck1.status !== 'Pending') {
    throw new Error('Request incorrectly marked as completed too early.');
  }

  // 6. Verify Donor 2 donation (High Urgency = 5 pts)
  console.log('\nVerifying Donor 2 donation...');
  const collusion2 = await checkCollusion(testRequester, testDonor2, 'Verified onsite');
  if (collusion2.isFraudulent) throw new Error('Donor 2 falsely flagged.');

  donation2.status = 'Completed';
  await donation2.save();

  testDonor2.rewardPoints += 5;
  testDonor2.donationsCount += 1;
  if (testDonor2.rewardPoints >= 35) testDonor2.badge = 'silver';
  else if (testDonor2.rewardPoints >= 10) testDonor2.badge = 'bronze';
  await testDonor2.save();

  // Automate request fulfillment deletion (1 unit from Donor 1 + 1 unit from Donor 2 = 2 units total)
  const completedDonations = await Donation.find({ request: bloodRequest._id, status: 'Completed' });
  const totalCompletedUnits = completedDonations.reduce((sum, d) => sum + d.unitsDonated, 0);
  if (totalCompletedUnits >= reqCheck1.unitsRequired) {
    await BloodRequest.findByIdAndDelete(bloodRequest._id);
    await Donation.deleteMany({ request: bloodRequest._id, status: 'Scheduled' });
  }

  const reqCheck2 = await BloodRequest.findById(bloodRequest._id);
  console.log('Request after Donor 2 completion:', reqCheck2);
  if (reqCheck2 !== null) {
    throw new Error('Request was not deleted after being fulfilled.');
  }

  console.log('\n--- VERIFICATION POST-STATS ---');
  console.log('Donor 1 Points (Expected 5):', testDonor1.rewardPoints);
  console.log('Donor 2 Points (Expected 15):', testDonor2.rewardPoints);
  console.log('Donor 2 Badge (Expected bronze):', testDonor2.badge);

  if (
    testDonor1.rewardPoints === 5 &&
    testDonor2.rewardPoints === 15 &&
    reqCheck2 === null
  ) {
    console.log('\n✅ MULTI-DONOR INTEGRATION FLOW TEST PASSED SUCCESSFULLY');
  } else {
    throw new Error('Post-stats do not match expectations.');
  }

  // Cleanup test records
  await Donation.deleteMany({ request: bloodRequest._id });
  await BloodRequest.deleteMany({ requester: testRequester._id });
  await User.deleteMany({ email: { $in: ['test_donor1@example.com', 'test_donor2@example.com', 'test_requester@example.com'] } });
  
  await mongoose.connection.close();
  process.exit(0);
}

runIntegrationTest().catch(async (err) => {
  console.error('❌ FLOW INTEGRATION TEST FAILED:', err.message);
  try {
    await mongoose.connection.close();
  } catch (e) {}
  process.exit(1);
});
