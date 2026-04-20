const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Student ID is required'],
        },
        examId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Exam',
            required: [true, 'Exam ID is required'],
        },
        violationType: {
            type: String,
            required: [true, 'Violation type is required'],
            enum: [
                'face_not_detected',
                'multiple_faces',
                'looking_away',
                'phone_detected',
                'tab_switch',
                'suspicious_audio',
                'other',
            ],
        },
        description: {
            type: String,
            default: '',
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Violation', violationSchema);
