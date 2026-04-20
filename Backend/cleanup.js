const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Exam = require('./models/Exam');
const ExamSession = require('./models/ExamSession');
const Violation = require('./models/Violation');
const User = require('./models/User');

dotenv.config();

const cleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🛠️ Database Connected for Cleanup...");

        // 1. Clear Old Exams
        const examRes = await Exam.deleteMany({});
        console.log(`✅ Cleared ${examRes.deletedCount} Old Exams.`);

        // 2. Clear All Exam Sessions
        const sessionRes = await ExamSession.deleteMany({});
        console.log(`✅ Cleared ${sessionRes.deletedCount} Active/Old Sessions.`);

        // 3. Clear All AI Proctoring Violations
        const violationRes = await Violation.deleteMany({});
        console.log(`✅ Cleared ${violationRes.deletedCount} AI Violation Logs.`);

        // 4. CLEAR ALL USERS (New Addition)
        const userRes = await User.deleteMany({});
        console.log(`❌ Cleared ${userRes.deletedCount} User Accounts (Admin & Students).`);

        console.log("\n🚀 COMPLETE SYSTEM WIPE SUCCESSFUL.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Cleanup Failed:", err);
        process.exit(1);
    }
};

cleanup();
