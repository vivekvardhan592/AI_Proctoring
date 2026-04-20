const mongoose = require('mongoose');

const examSessionSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        examId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Exam',
            required: true,
        },
        startTime: {
            type: Date,
            default: Date.now,
        },
        endTime: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: ['ongoing', 'completed', 'terminated'],
            default: 'ongoing',
        },
        answers: [
            {
                questionId: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                },
                selectedOption: Number, // index for MCQs
                textAnswer: String,    // for short answers
            },
        ],
        score: {
            type: Number,
            default: 0,
        },
        violationsCount: {
            type: Number,
            default: 0,
        },
        lastViolationType: {
            type: String,
            default: '',
        },
        violationLogs: [
    {
        type: { type: String },
        category: { type: String }, // 🔥 ADD THIS
        timestamp: { type: Date, default: Date.now },
        evidence: { type: String }
    }
],
    },
    { timestamps: true }
);

// Prevent a student from having multiple ongoing sessions for the same exam
examSessionSchema.index({ studentId: 1, examId: 1 }, { unique: true });

module.exports = mongoose.model('ExamSession', examSessionSchema);
