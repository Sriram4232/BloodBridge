const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const sync = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Error: MONGODB_URI is not defined.');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected. Syncing indexes...');
    
    // Explicitly create 2dsphere index on User model
    await User.createIndexes();
    console.log('Indexes synced successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to sync indexes:', err);
    process.exit(1);
  }
};
sync();
