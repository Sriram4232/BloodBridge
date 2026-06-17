const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');
const Donation = require('../models/Donation');
const BloodRequest = require('../models/BloodRequest');
const { checkCollusion } = require('../utils/geminiAI');

dotenv.config();

async function runTests() {
  console.log('--- CONNECTING TO MONGODB ---');
  await connectDB();

  console.log('--- RUNNING FEATURES SANITY CHECK ---');

  // Test Case 1: Identical User IDs (Self-Donation)
  console.log('\nTest 1: Self-Donation Collusion Detection');
  const userA = { _id: new mongoose.Types.ObjectId(), name: 'Alice Smith', email: 'alice@example.com', role: 'donor', trustScore: 100 };
  const userB = { _id: userA._id, name: 'Alice Smith', email: 'alice@example.com', role: 'donor', trustScore: 100 };
  
  const result1 = await checkCollusion(userA, userB);
  console.log('Result:', result1);
  if (result1.isFraudulent && result1.reason.includes('cannot donate to their own request')) {
    console.log('✅ TEST 1 PASSED');
  } else {
    console.error('❌ TEST 1 FAILED');
  }

  // Test Case 2: Similar Names/Emails Detection
  console.log('\nTest 2: Similar Names/Emails Detection');
  const requester2 = { _id: new mongoose.Types.ObjectId(), name: 'Bob Johnson', email: 'bob@example.com', role: 'recipient', trustScore: 100 };
  const donor2 = { _id: new mongoose.Types.ObjectId(), name: 'Bob Johnson', email: 'bob+alias@example.com', role: 'donor', trustScore: 100 };
  
  const result2 = await checkCollusion(requester2, donor2);
  console.log('Result:', result2);
  if (result2.isFraudulent && result2.reason.includes('identical or linked accounts')) {
    console.log('✅ TEST 2 PASSED');
  } else {
    console.error('❌ TEST 2 FAILED');
  }

  // Test Case 3: Normal Transaction (No collusion)
  console.log('\nTest 3: Normal Transaction');
  const requester3 = { _id: new mongoose.Types.ObjectId(), name: 'Charlie Green', email: 'charlie@example.com', role: 'recipient', trustScore: 100 };
  const donor3 = { _id: new mongoose.Types.ObjectId(), name: 'Diana Prince', email: 'diana@example.com', role: 'donor', trustScore: 100 };
  
  const result3 = await checkCollusion(requester3, donor3);
  console.log('Result:', result3);
  if (!result3.isFraudulent) {
    console.log('✅ TEST 3 PASSED');
  } else {
    console.error('❌ TEST 3 FAILED');
  }

  // Test Case 4: Medical Eligibility Check
  console.log('\nTest 4: Medical Eligibility Check');
  const { checkMedicalEligibility } = require('../utils/geminiAI');
  const cleanResult = await checkMedicalEligibility('I have some general mild allergy, otherwise completely fit.');
  const chronicResult = await checkMedicalEligibility('I have Type 1 Diabetes and take insulin daily.');
  console.log('Clean Result:', cleanResult);
  console.log('Chronic Result:', chronicResult);
  if (!cleanResult.hasIssues && chronicResult.hasIssues) {
    console.log('✅ TEST 4 PASSED');
  } else {
    console.error('❌ TEST 4 FAILED');
  }

  console.log('\n--- ALL SANITY CHECKS COMPLETED ---');
  // Close the database connection
  await mongoose.connection.close();
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
