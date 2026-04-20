const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const ExamSession = require('../models/ExamSession');

const clearImages = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai_exam_proctoring');
        console.log('Connected to MongoDB');

        const sessions = await ExamSession.find({ "violationLogs.evidence": { $ne: "" } });
        console.log(`Found ${sessions.length} sessions with evidence.`);

        for (let session of sessions) {
            if (session.violationLogs && Array.isArray(session.violationLogs)) {
                session.violationLogs = session.violationLogs.map(log => ({
                    ...log.toObject(),
                    evidence: ""
                }));
                await session.save();
            }
        }

        console.log(`Successfully cleared images from ${sessions.length} sessions.`);
        process.exit(0);
    } catch (error) {
        console.error('Error clearing images from sessions:', error);
        process.exit(1);
    }
};

clearImages();
