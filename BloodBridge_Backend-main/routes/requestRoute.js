const express = require('express');
const router = express.Router();
const { 
  createRequest, 
  getRequests, 
  getRequestById, 
  updateRequestStatus,
  scheduleDonation,
  getDonationsForRequest,
  verifyDonation,
  reportFakeDonation
} = require('../controllers/requestController');
const { protect } = require('../middlewares/auth');

router.route('/')
  .post(protect, createRequest)
  .get(getRequests); // Publicly viewable requests

router.post('/verify-donation', protect, verifyDonation);
router.post('/report-fake', protect, reportFakeDonation);

router.route('/:id')
  .get(getRequestById)
  .patch(protect, updateRequestStatus);

router.post('/:id/donate', protect, scheduleDonation);
router.get('/:id/donations', protect, getDonationsForRequest);

module.exports = router;
