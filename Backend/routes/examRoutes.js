const express = require('express');
const router = express.Router();
const {
    createExam,
    getAllExams,
    getExamById,
    updateExam,
    deleteExam,
} = require('../controllers/examController');
const { protect, authorize } = require('../middleware/auth');

// All routes below require authentication
router.use(protect);

// GET  /api/exams         — any authenticated user
// POST /api/exams         — admin only
router
    .route('/')
    .get(getAllExams)
    .post(authorize('admin'), createExam);

// GET    /api/exams/:id   — any authenticated user
// PUT    /api/exams/:id   — admin only
// DELETE /api/exams/:id   — admin only
router
    .route('/:id')
    .get(getExamById)
    .put(authorize('admin'), updateExam)
    .delete(authorize('admin'), deleteExam);

module.exports = router;
