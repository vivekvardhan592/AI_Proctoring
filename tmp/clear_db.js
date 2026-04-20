const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../Backend/.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');
    
    // Check models
    const Exam = mongoose.model('Exam', new mongoose.Schema({}));
    const ExamSession = mongoose.model('ExamSession', new mongoose.Schema({}));
    const Violation = mongoose.model('Violation', new mongoose.Schema({}));
    
    console.log('Clearing Exam Sessions...');
    await ExamSession.deleteMany({});
    
    console.log('Clearing Violations...');
    await Violation.deleteMany({});
    
    console.log('Clearing Exams...');
    await Exam.deleteMany({});
    
    console.log('Database Cleared Successfully!');
    process.exit();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

connectDB();
