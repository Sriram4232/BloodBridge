const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  role: {
    type: String,
    enum: ['donor', 'recipient', 'admin'],
    default: 'donor'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastDonationDate: {
    type: Date
  }
}, { timestamps: true });

// Create 2dsphere index for geo-spatial queries
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);