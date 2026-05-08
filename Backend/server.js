const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');
const { protect } = require('./middleware/auth');

// Load env vars
dotenv.config();

// Connect to MongoDB & Redis
connectDB();
connectRedis();

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'http://localhost:5174',
      'https://ai-proctoring-login.vercel.app',
      'https://ai-proctoring-admin.vercel.app',
      'https://ai-proctoring-student.vercel.app'
    ];

const app = express();

// ⚡ Gzip compress all responses — reduces payload sizes ~60-70%
app.use(compression());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (origin.includes('vercel.app') || origin.includes('localhost')) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST", "PUT"],
    credentials: true
  }
});

// Attach io to app
app.set('socketio', io);

// Enable CORS with a resilient dynamic origin check
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check exact match from allowedOrigins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Fallback: If it's a Vercel app or localhost, allow it automatically
    // This prevents CORS breaking just because of a typo in Render ENV vars
    if (origin.includes('vercel.app') || origin.includes('localhost')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parser — increased limit for biometric image data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// --- Socket.IO Logic ---
let onlineStudents = new Map(); // socketId -> { userId, name, institution }

// Helper function to get count for an institution
const getOnlineCountForInstitution = (institution) => {
  let count = 0;
  for (const student of onlineStudents.values()) {
    if (student.institution === institution) count++;
  }
  return count;
};

io.on('connection', (socket) => {

  // 👔 Admin registers to listen to their institution's events
  socket.on('admin-join', ({ institution }) => {
    if (institution) {
      socket.join(institution);
    }
  });

  // 👤 Student registers themselves when joining
  socket.on('student-join', ({ userId, name, institution }) => {
    if (userId && name && institution) {
      onlineStudents.set(socket.id, { userId, name, institution });
      socket.join(institution);
      io.to(institution).emit('online-students-count', getOnlineCountForInstitution(institution));
    }
  });

  socket.on('disconnect', () => {
    if (onlineStudents.has(socket.id)) {
      const student = onlineStudents.get(socket.id);
      onlineStudents.delete(socket.id);
      if (student.institution) {
        io.to(student.institution).emit('online-students-count', getOnlineCountForInstitution(student.institution));
      }
    }
  });

  // 🎥 OFFER (student → admin)
  socket.on('webrtc-offer', ({ offer, sessionId }) => {
    socket.broadcast.emit('webrtc-offer', {
      offer,
      sessionId,
      from: socket.id
    });
  });

  // 🎥 ANSWER (admin → student)
  socket.on('webrtc-answer', ({ answer, to, sessionId }) => {
    if (to) {
      socket.to(to).emit('webrtc-answer', { answer, sessionId });
    } else {
      socket.broadcast.emit('webrtc-answer', { answer, sessionId });
    }
  });

  socket.on('webrtc-ice-candidate', ({ candidate, to, sessionId }) => {
    if (to) {
      socket.to(to).emit('webrtc-ice-candidate', { candidate, sessionId });
    } else {
      socket.broadcast.emit('webrtc-ice-candidate', { candidate, sessionId, from: socket.id });
    }
  });

  // 🎥 RE-REQUEST OFFER (admin late join)
  socket.on('request-webrtc-offer', () => {
    socket.broadcast.emit('request-webrtc-offer', { adminId: socket.id });
  });

});

app.get('/api/stats/online', protect, (req, res) => {
  const count = getOnlineCountForInstitution(req.user.institution);
  res.json({ success: true, count });
});

// --- Routes ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/violations', require('./routes/violationRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'AI Exam Proctoring API (w/ WebSockets) is running...' });
});

// ⚡ Health check endpoint (used by Render + keep-alive ping)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.use(errorHandler);

const SERVER_PORT = process.env.PORT || 5001;

server.listen(SERVER_PORT, () => {
  console.log(`Server running on port ${SERVER_PORT}`);

  // ⚡ Keep-alive: ping self every 14 min so Render free tier never cold-starts
  if (process.env.NODE_ENV === 'production') {
    const BACKEND_URL = process.env.BACKEND_URL || `https://ai-proctoring-drrf.onrender.com`;
    setInterval(() => {
      fetch(`${BACKEND_URL}/api/health`)
        .then(() => console.log('⚡ Keep-alive ping sent'))
        .catch(err => console.warn('Keep-alive ping failed:', err.message));
    }, 14 * 60 * 1000); // every 14 minutes
  }
});
