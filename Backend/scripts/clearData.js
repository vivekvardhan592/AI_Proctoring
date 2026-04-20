const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const Exam = require('../models/Exam');
const ExamSession = require('../models/ExamSession');
const Violation = require('../models/Violation');

const clearDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai_exam_proctoring');
        console.log('Connected to MongoDB');

        // Delete all Exams
        await Exam.deleteMany({});
        console.log('Exams cleared');

        // Delete all Exam Sessions
        await ExamSession.deleteMany({});
        console.log('Exam Sessions and History cleared');
        
        // Delete all Violation reports
        await Violation.deleteMany({});
        console.log('Violation reports cleared');

        // Delete all Users
        const User = require('../models/User');
        await User.deleteMany({});
        console.log('User accounts cleared');

        console.log('All exam history removed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing data:', error);
        process.exit(1);
    }
};

clearDatabase();
