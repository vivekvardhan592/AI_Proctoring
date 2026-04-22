const Exam = require('../models/Exam');

// @desc    Create a new exam
// @route   POST /api/exams
// @access  Private (Admin only)
const createExam = async (req, res, next) => {
    try {
        const { title, subject, description, duration, totalMarks, passingMarks, startTime, endTime, questions } = req.body;

        const exam = await Exam.create({
            title,
            subject,
            description,
            duration,
            totalMarks,
            passingMarks,
            startTime,
            endTime,
            questions,
            createdBy: req.user._id,
            institution: req.user.institution,
        });

        res.status(201).json({ success: true, message: 'Exam created successfully', data: exam });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all active exams
// @route   GET /api/exams
// @access  Private (Admin & Student)
const getAllExams = async (req, res, next) => {
    try {
        const query = { isActive: true };
        if (req.user.institution) {
            query.institution = req.user.institution;
        }

        // ⚡ Exclude questions[] — it's a huge array only needed in getExamById
        const exams = await Exam.find(query)
            .select('-questions')     // 🔥 skip heavy question data in list views
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .lean();                  // ⚡ plain JS objects, faster serialization

        res.status(200).json({ success: true, count: exams.length, data: exams });
    } catch (error) {
        next(error);
    }
};

// @desc    Get a single exam by ID
// @route   GET /api/exams/:id
// @access  Private (Admin & Student)
const getExamById = async (req, res, next) => {
    try {
        const exam = await Exam.findById(req.params.id).populate('createdBy', 'name email');

        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        if (req.user.institution && exam.institution !== req.user.institution) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.status(200).json({ success: true, data: exam });
    } catch (error) {
        next(error);
    }
};

// @desc    Update an exam
// @route   PUT /api/exams/:id
// @access  Private (Admin only)
const updateExam = async (req, res, next) => {
    try {
        let exam = await Exam.findById(req.params.id);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }
        if (req.user.institution && exam.institution !== req.user.institution) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        exam = await Exam.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({ success: true, message: 'Exam updated successfully', data: exam });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete (deactivate) an exam
// @route   DELETE /api/exams/:id
// @access  Private (Admin only)
const deleteExam = async (req, res, next) => {
    try {
        let exam = await Exam.findById(req.params.id);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }
        if (req.user.institution && exam.institution !== req.user.institution) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        exam = await Exam.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        res.status(200).json({ success: true, message: 'Exam deactivated successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = { createExam, getAllExams, getExamById, updateExam, deleteExam };
