const ExamSession = require("../models/ExamSession");
const Exam = require("../models/Exam");
const cloudinary = require("../config/cloudinary");

// @desc    Student starts an exam session
// @route   POST /api/sessions/start
// @access  Private (Student only)
const startExam = async (req, res, next) => {
  try {
    const { examId } = req.body;
    const exam = await Exam.findById(examId);
    if (!exam || !exam.isActive) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found or is not active" });
    }

    const existingSession = await ExamSession.findOne({
      studentId: req.user._id,
      examId,
    });

    if (existingSession) {
      if (existingSession.status === "ongoing") {
        return res.status(400).json({
          success: false,
          message: "You already have an ongoing session for this exam",
          data: existingSession,
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `You have already ${existingSession.status} this exam`,
        });
      }
    }

    const session = await ExamSession.create({
      studentId: req.user._id,
      examId,
      startTime: new Date(),
    });

    await session.populate([
      { path: "studentId", select: "name email" },
      { path: "examId", select: "title duration" },
    ]);

    const io = req.app.get("socketio");
    io.emit("session-live-update", session);

    res
      .status(201)
      .json({ success: true, message: "Exam session started", data: session });
  } catch (error) {
    next(error);
  }
};

const endExam = async (req, res, next) => {
  try {
    const { answers, violationsCount } = req.body;
    const session = await ExamSession.findById(req.params.sessionId);

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    if (session.studentId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Not authorized to end this session",
        });
    }

    if (session.status !== "ongoing") {
      return res
        .status(400)
        .json({
          success: false,
          message: `Session is already ${session.status}`,
        });
    }

    const exam = await Exam.findById(session.examId);
    let score = 0;

    if (answers && Array.isArray(answers)) {
      answers.forEach((studentAns) => {
        const question = exam.questions.find(
          (q) => q._id.toString() === studentAns.questionId.toString(),
        );
        if (question) {
          if (question.type === "mcq" || question.type === "truefalse") {
            if (studentAns.selectedOption === question.correctAnswer) {
              score += question.marks;
            }
          }
        }
      });
    }

    session.answers = answers || [];
    session.score = score;
    session.violationsCount = violationsCount || 0;
    session.endTime = new Date();
    session.status = "completed";

    await session.save();
    await session.populate([
      { path: "studentId", select: "name" },
      { path: "examId", select: "title" },
    ]);

    const io = req.app.get("socketio");
    io.emit("session-live-update", session);

    res.status(200).json({
      success: true,
      message: "Exam session ended successfully",
      data: {
        sessionId: session._id,
        score,
        totalMarks: exam.totalMarks,
        status: session.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

const terminateSession = async (req, res, next) => {
  try {
    const session = await ExamSession.findByIdAndUpdate(
      req.params.sessionId,
      { status: "terminated", endTime: new Date() },
      { new: true },
    )
      .populate("studentId", "name")
      .populate("examId", "title");

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    const io = req.app.get("socketio");
    io.emit("session-live-update", session);
    io.emit(`terminate-session-${session._id}`, {
      message: "Exam terminated by proctor.",
    });

    res
      .status(200)
      .json({ success: true, message: "Session terminated", data: session });
  } catch (error) {
    next(error);
  }
};

const updateSessionProctoring = async (req, res, next) => {
  try {
    const { violationsCount, violationType, answers } = req.body;
    const session = await ExamSession.findById(req.params.sessionId);
    if (!session)
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });

    const oldV = session.violationsCount;

    if (violationsCount !== undefined)
      session.violationsCount = violationsCount;

    if (violationType) {
      // ✅ CLOUDINARY UPLOAD (REPLACES BASE64 STORAGE)
      let imageUrl = "";

      if (req.file) {
        const streamifier = require("streamifier");

        imageUrl = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "violations" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url);
            },
          );

          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      }

      session.lastViolationType = violationType;

      session.violationLogs.push({
        type: violationType,
        timestamp: new Date(),
        evidence: imageUrl, // ✅ ONLY URL STORED
        category: violationType === "Audio Detected" ? "audio" : "visual",
      });
    }

    if (answers) session.answers = answers;

    await session.save();

    if (session.violationsCount > oldV) {
      const io = req.app.get("socketio");
      const populated = await ExamSession.findById(session._id)
        .populate("studentId", "name")
        .populate("examId", "title");

      io.emit("violation-alert", populated);
      io.emit("session-live-update", populated);

      if (session.violationsCount >= 10) {
        session.status = "terminated";
        session.endTime = new Date();
        await session.save();

        io.emit(`terminate-session-${session._id}`, {
          message: "Auto terminated due to excessive violations",
        });

        io.emit("session-live-update", session);

        return res.json({
          success: true,
          message: "Session auto-terminated due to violations",
          data: session,
        });
      }
    }

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

const getSessions = async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role === "student") {
      filter = { studentId: req.user._id };
    } else if (req.user.role === "admin") {
      // ⚡ Run in parallel instead of serial (was 2 sequential DB calls)
      const exams = await Exam.find({ institution: req.user.institution }).select('_id').lean();
      filter = { examId: { $in: exams.map(e => e._id) } };
    }

    // ⚡ Exclude heavy arrays (answers[], violationLogs[]) from list view
    // They are only needed in getSessionById which has its own endpoint
    let sessions = await ExamSession.find(filter)
      .select('-answers -violationLogs') // 🔥 excludes heavy nested arrays
      .populate("studentId", "name email")
      .populate("examId", "title duration totalMarks passingMarks")
      .sort({ startTime: -1 })
      .lean();

    // Fix: mark sessions with endTime + ongoing status as completed
    sessions = sessions.map((s) => {
      if (s.endTime && s.status === "ongoing") {
        s.status = "completed";
      }
      return s;
    });

    res.status(200).json({ success: true, count: sessions.length, data: sessions });
  } catch (error) {
    next(error);
  }
};

const getSessionById = async (req, res, next) => {
  try {
    const session = await ExamSession.findById(req.params.sessionId)
      .populate("studentId", "name email")
      .populate("examId", "title duration totalMarks questions passingMarks");

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    if (
      req.user.role === "student" &&
      session.studentId._id.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    res.status(200).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

const clearAllViolationImages = async (req, res, next) => {
  try {
    const exams = await Exam.find({ institution: req.user.institution }).select('_id');
    const examIds = exams.map(e => e._id);

    const result = await ExamSession.updateMany(
      { examId: { $in: examIds } },
      { $set: { violationLogs: [] } },
    );

    res.status(200).json({
      success: true,
      message: `All violation images and logs cleared from ${result.modifiedCount} sessions.`,
    });
  } catch (error) {
    next(error);
  }
};

const deleteViolationImage = async (req, res, next) => {
  try {
    const { sessionId, logIndex } = req.params;
    const idx = parseInt(logIndex);

    const session = await ExamSession.findById(sessionId).populate('examId');
    if (!session)
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });

    if (session.examId.institution !== req.user.institution) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    session.violationLogs.splice(idx, 1);
    await session.save();

    res
      .status(200)
      .json({ success: true, message: "Violation image deleted." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startExam,
  endExam,
  terminateSession,
  updateSessionProctoring,
  getSessions,
  getSessionById,
  clearAllViolationImages,
  deleteViolationImage,
};
