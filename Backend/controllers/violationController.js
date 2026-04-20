const Violation = require('../models/Violation');
const ExamSession = require('../models/ExamSession');

// @desc    ML module reports a proctoring violation
// @route   POST /api/violations
// @access  Private (protected — ML module uses a student or admin JWT)
const reportViolation = async (req, res, next) => {
    try {
        const { studentId, examId, violationType, description, timestamp } = req.body;

        if (!studentId || !examId || !violationType) {
            return res.status(400).json({
                success: false,
                message: 'studentId, examId, and violationType are required',
            });
        }

        // Verify an active session exists before logging violation
        const session = await ExamSession.findOne({
            studentId,
            examId,
            status: 'ongoing',
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'No active session found for this student and exam',
            });
        }

        const violation = await Violation.create({
            studentId,
            examId,
            violationType,
            description: description || '',
            timestamp: timestamp ? new Date(timestamp) : new Date(),
        });

        res.status(201).json({ success: true, message: 'Violation recorded', data: violation });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all violations (Admin only)
// @route   GET /api/violations
// @access  Private (Admin only)
const getAllViolations = async (req, res, next) => {
    try {
        const { examId, studentId } = req.query;

        const filter = {};
        if (examId) filter.examId = examId;
        if (studentId) filter.studentId = studentId;

        const violations = await Violation.find(filter)
            .populate('studentId', 'name email')
            .populate('examId', 'title')
            .sort({ timestamp: -1 });

        res.status(200).json({ success: true, count: violations.length, data: violations });
    } catch (error) {
        next(error);
    }
};

// @desc    Get violations for a specific exam session
// @route   GET /api/violations/session/:examId/:studentId
// @access  Private (Admin only)
const getViolationsBySession = async (req, res, next) => {
    try {
        const { examId, studentId } = req.params;

        const violations = await Violation.find({ examId, studentId })
            .populate('studentId', 'name email')
            .populate('examId', 'title')
            .sort({ timestamp: 1 });

        res.status(200).json({ success: true, count: violations.length, data: violations });
    } catch (error) {
        next(error);
    }
};

module.exports = { reportViolation, getAllViolations, getViolationsBySession };
