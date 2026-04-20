const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Exam title is required'],
            trim: true,
        },
        subject: {
            type: String,
            required: [true, 'Subject is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
        duration: {
            type: Number, // Duration in minutes
            required: [true, 'Exam duration is required'],
            min: [1, 'Duration must be at least 1 minute'],
        },
        totalMarks: {
            type: Number,
            required: [true, 'Total marks is required'],
        },
        passingMarks: {
            type: Number,
            required: [true, 'Passing marks is required'],
        },
        startTime: {
            type: Date,
            required: [true, 'Start time is required'],
        },
        endTime: {
            type: Date,
            required: [true, 'End time is required'],
        },
        questions: [
            {
                type: {
                    type: String,
                    enum: ['mcq', 'truefalse', 'short'],
                    default: 'mcq',
                },
                question: {
                    type: String,
                    required: [true, 'Question text is required'],
                },
                options: [String],
                correctAnswer: {
                    type: Number, // Stores the index of the correct option for mcq/truefalse
                    default: 0,
                },
                shortAnswer: {
                    type: String, // For short answer type
                },
                marks: {
                    type: Number,
                    default: 5,
                },
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        institution: {
            type: String,
            required: [true, 'Institution/Company name is required'],
            trim: true,
            lowercase: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Exam', examSchema);
