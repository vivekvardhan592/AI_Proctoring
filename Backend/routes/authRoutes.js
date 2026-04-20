const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, forgotPassword, resetPassword, updateFace, verifyFace, deleteUser, getStudents, verifyStudent } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', registerUser);

// POST /api/auth/login
router.post('/login', loginUser);

// GET /api/auth/me — protected
router.get('/me', protect, getMe);

// PUT /api/auth/update-face — protected
router.put('/update-face', protect, updateFace);

// POST /api/auth/verify-face — protected
router.post('/verify-face', protect, verifyFace);

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', resetPassword);

// GET /api/auth/students — admin only
router.get('/students', protect, authorize('admin'), getStudents);

// DELETE /api/auth/student/:id — admin only
router.delete('/student/:id', protect, authorize('admin'), deleteUser);

// PUT /api/auth/student/:id/verify — admin only
router.put('/student/:id/verify', protect, authorize('admin'), verifyStudent);

module.exports = router;
