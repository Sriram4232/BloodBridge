// const express = require('express');
// const router = express.Router();
// const { registerUser, loginUser } = require('../controllers/authController');
// const { authLimiter } = require('../middlewares/rateLimit');

// router.post('/register', authLimiter, registerUser);
// router.post('/login', authLimiter, loginUser);

// module.exports = router;

const express = require('express');
const router = express.Router();
const { registerUser, loginUser, updateLocation } = require('../controllers/authController');
const { authLimiter } = require('../middlewares/rateLimit');
const { protect } = require('../middlewares/auth');

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.put('/location', protect, updateLocation);

module.exports = router;