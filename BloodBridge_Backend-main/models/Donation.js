const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodRequest'
  },
  bloodType: {
    type: String,
    required: true
  },
  unitsDonated: {
    type: Number,
    required: true,
    min: 1
  },
  donationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Completed', 'Cancelled'],
    default: 'Completed'
  }
}, { timestamps: true });

module.exports = mongoose.model('Donation', donationSchema);
