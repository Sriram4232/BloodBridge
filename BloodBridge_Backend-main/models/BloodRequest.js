// const mongoose = require('mongoose');

// const bloodRequestSchema = new mongoose.Schema({
//   requester: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   patientName: {
//     type: String,
//     required: true
//   },
//   bloodTypeRequired: {
//     type: String,
//     enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
//     required: true
//   },
//   unitsRequired: {
//     type: Number,
//     required: true,
//     min: 1
//   },
//   urgency: {
//     type: String,
//     enum: ['Normal', 'High', 'Critical'],
//     default: 'Normal'
//   },
//   hospitalName: {
//     type: String,
//     required: true
//   },
//   hospitalLocation: {
//     type: String,
//     required: true
//   },
//   contactNumber: {
//     type: String,
//     required: true
//   },
//   status: {
//     type: String,
//     enum: ['Pending', 'Fulfilled', 'Closed'],
//     default: 'Pending'
//   }
// }, { timestamps: true });

// module.exports = mongoose.model('BloodRequest', bloodRequestSchema);

const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  bloodTypeRequired: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  unitsRequired: {
    type: Number,
    required: true,
    min: 1
  },
  urgency: {
    type: String,
    enum: ['Normal', 'High', 'Critical'],
    default: 'Normal'
  },
  hospitalName: {
    type: String,
    required: true
  },
  hospitalLocation: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  radius: {
    type: Number,
    default: 2,
    max: 10
  },
  contactNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Fulfilled', 'Closed'],
    default: 'Pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);