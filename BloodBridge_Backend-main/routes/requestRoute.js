const express = require('express');
const router = express.Router();
const { createRequest, getRequests, getRequestById, updateRequestStatus } = require('../controllers/requestController');
const { protect } = require('../middlewares/auth');

router.route('/')
  .post(protect, createRequest)
  .get(getRequests); // Publicly viewable requests

router.route('/:id')
  .get(getRequestById)
  .patch(protect, updateRequestStatus);

module.exports = router;
