const express = require('express');
const router = express.Router();
const {
    startExam,
    endExam,
    updateSessionProctoring,
    terminateSession,
    getSessions,
    getSessionById,
    clearAllViolationImages,
    deleteViolationImage,
    logPreCheckViolation,
} = require('../controllers/sessionController');
const { protect, authorize } = require('../middleware/auth');
const { routeCache } = require('../middleware/redisCache');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(protect);

// POST /api/sessions/start          — student only
router.post('/start', authorize('student'), startExam);

// PUT  /api/sessions/end/:sessionId — student only
router.put('/end/:sessionId', authorize('student'), endExam);

// PUT  /api/sessions/update-proctoring/pre-check — student only
router.put(
  '/update-proctoring/pre-check',
  authorize('student'),
  upload.single("image"),
  require('../controllers/sessionController').logPreCheckViolation
);

// PUT  /api/sessions/update-proctoring/:sessionId — student only
router.put(
  '/update-proctoring/:sessionId',
  authorize('student'),
  upload.single("image"), // 🔥 THIS LINE IS THE KEY CHANGE
  updateSessionProctoring
);

// PUT  /api/sessions/terminate/:sessionId — admin only
router.put('/terminate/:sessionId', authorize('admin'), terminateSession);

// DELETE /api/sessions/clear-images — admin only
router.delete('/clear-images', authorize('admin'), clearAllViolationImages);

// DELETE /api/sessions/:sessionId/violation/:logIndex — admin only
router.delete('/:sessionId/violation/:logIndex', authorize('admin'), deleteViolationImage);

// GET  /api/sessions                — admin gets all; student gets own (cached 20s)
router.get('/', routeCache('sessions', 20), getSessions);

// GET  /api/sessions/:sessionId     — admin or owner (cached 30s)
router.get('/:sessionId', routeCache('sessions', 30), getSessionById);

module.exports = router;
