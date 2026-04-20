const express = require('express');
const router = express.Router();
const {
    reportViolation,
    getAllViolations,
    getViolationsBySession,
} = require('../controllers/violationController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// POST /api/violations                              — ML module endpoint (any authenticated role)
router.post('/', reportViolation);

// GET  /api/violations                              — admin only (supports ?examId= &studentId= filters)
router.get('/', authorize('admin'), getAllViolations);

// GET  /api/violations/session/:examId/:studentId  — admin only
router.get('/session/:examId/:studentId', authorize('admin'), getViolationsBySession);

module.exports = router;
