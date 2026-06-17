// const User = require('../models/User');
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcrypt');
// const sendEmail = require('../utils/sendEmail');

// const generateToken = (id, role) => {
//   return jwt.sign({ id, role }, process.env.JWT_SECRET, {
//     expiresIn: '30d'
//   });
// };

// const registerUser = async (req, res) => {
//   try {
//     const { name, email, password, bloodType, role, location } = req.body;

//     const userExists = await User.findOne({ email });

//     if (userExists) {
//       return res.status(400).json({ message: 'User already exists' });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     const user = await User.create({
//       name,
//       email,
//       password: hashedPassword,
//       bloodType,
//       role,
//       location
//     });

//     if (user) {
//       try {
//         const emailOptions = {
//           email: user.email,
//           subject: 'Welcome to Blood Bridge!',
//           html: `
//             <h1>Welcome to Blood Bridge, ${user.name}!</h1>
//             <p>Thank you for registering. You have joined a community dedicated to saving lives.</p>
//             <p>Your registered blood type is: <strong>${user.bloodType}</strong></p>
//             <p>Together, we can make a difference!</p>
//             <br/>
//             <p>Best regards,</p>
//             <p>The Blood Bridge Team</p>
//           `
//         };
//         await sendEmail(emailOptions);
//       } catch (emailError) {
//         console.error('Failed to send welcome email:', emailError);
//       }

//       res.status(201).json({
//         _id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         bloodType: user.bloodType,
//         location: user.location,
//         token: generateToken(user.id, user.role)
//       });
//     } else {
//       res.status(400).json({ message: 'Invalid user data' });
//     }
//   } catch (error) {
//     res.status(500).json({ message: 'Server Error', error: error.message });
//   }
// };

// const loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });

//     if (user && (await bcrypt.compare(password, user.password))) {
//       res.json({
//         _id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         bloodType: user.bloodType,
//         location: user.location,
//         token: generateToken(user.id, user.role)
//       });
//     } else {
//       res.status(401).json({ message: 'Invalid email or password' });
//     }
//   } catch (error) {
//     res.status(500).json({ message: 'Server Error', error: error.message });
//   }
// };

// module.exports = {
//   registerUser,
//   loginUser
// };

const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};


const registerUser = async (req, res) => {
  try {
    const { name, email, password, bloodType, role, location, cityName } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let userLocation;
    if (location && typeof location === 'object') {
      if (Array.isArray(location.coordinates) && location.coordinates.length === 2) {
        userLocation = {
          type: 'Point',
          coordinates: [Number(location.coordinates[0]), Number(location.coordinates[1])]
        };
      } else if (Array.isArray(location) && location.length === 2) {
        userLocation = {
          type: 'Point',
          coordinates: [Number(location[0]), Number(location[1])]
        };
      }
    }

    if (!userLocation) {
      return res.status(400).json({ message: 'Valid location coordinates [longitude, latitude] are required.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      bloodType,
      role,
      location: userLocation,
      cityName: cityName || 'Unknown',
      lastUpdated: Date.now()
    });

    if (user) {
      const emailOptions = {
        email: user.email,
        subject: 'Welcome to Blood Bridge!',
        html: `
          <h1>Welcome to Blood Bridge, ${user.name}!</h1>
          <p>Thank you for registering. You have joined a community dedicated to saving lives.</p>
          <p>Your registered blood type is: <strong>${user.bloodType}</strong></p>
          <p>Together, we can make a difference!</p>
          <br/>
          <p>Best regards,</p>
          <p>The Blood Bridge Team</p>
        `
      };
      // Send email in the background to avoid blocking the registration response
      sendEmail(emailOptions).catch((emailError) => {
        console.error('Failed to send welcome email:', emailError);
      });

      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        cityName: user.cityName,
        location: user.location,
        bloodType: user.bloodType,
        rewardPoints: user.rewardPoints,
        donationsCount: user.donationsCount,
        trustScore: user.trustScore,
        badge: user.badge,
        isEmergencyHero: user.isEmergencyHero,
        isFrozen: user.isFrozen,
        coolingPeriodEnd: user.coolingPeriodEnd,
        token: generateToken(user.id, user.role)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password, location } = req.body;

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (user.isSuspended) {
        return res.status(403).json({ message: 'Access Denied: Your account is suspended due to low trust score or suspicious activity.' });
      }

      // Normalize and update location on login if provided
      let userLocation;
      if (location && typeof location === 'object') {
        if (Array.isArray(location.coordinates) && location.coordinates.length === 2) {
          userLocation = {
            type: 'Point',
            coordinates: [Number(location.coordinates[0]), Number(location.coordinates[1])]
          };
        } else if (Array.isArray(location) && location.length === 2) {
          userLocation = {
            type: 'Point',
            coordinates: [Number(location[0]), Number(location[1])]
          };
        }
      }

      if (userLocation) {
        user.location = userLocation;
        user.lastUpdated = Date.now();
        await user.save();
      }

      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        cityName: user.cityName,
        location: user.location,
        bloodType: user.bloodType,
        rewardPoints: user.rewardPoints,
        donationsCount: user.donationsCount,
        trustScore: user.trustScore,
        badge: user.badge,
        isEmergencyHero: user.isEmergencyHero,
        isFrozen: user.isFrozen,
        coolingPeriodEnd: user.coolingPeriodEnd,
        token: generateToken(user.id, user.role)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const updateLocation = async (req, res) => {
  try {
    const { location } = req.body;

    let userLocation;
    if (location && typeof location === 'object') {
      if (Array.isArray(location.coordinates) && location.coordinates.length === 2) {
        userLocation = {
          type: 'Point',
          coordinates: [Number(location.coordinates[0]), Number(location.coordinates[1])]
        };
      } else if (Array.isArray(location) && location.length === 2) {
        userLocation = {
          type: 'Point',
          coordinates: [Number(location[0]), Number(location[1])]
        };
      }
    }

    if (!userLocation) {
      return res.status(400).json({ message: 'Valid location coordinates [longitude, latitude] are required.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.location = userLocation;
    user.lastUpdated = Date.now();
    await user.save();

    res.json({
      message: 'Location updated successfully',
      location: user.location,
      lastUpdated: user.lastUpdated
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  updateLocation
};