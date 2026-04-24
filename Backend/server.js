const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');

// Load env vars
dotenv.config();

// Connect to MongoDB & Redis
connectDB();
connectRedis();

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'http://localhost:5174',
    ];

const app = express();

// ⚡ Gzip compress all responses — reduces payload sizes ~60-70%
app.use(compression());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT"],
    credentials: true
  }
});

// Attach io to app
app.set('socketio', io);

// Enable CORS
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Body parser — increased limit for biometric image data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// --- Socket.IO Logic ---
let onlineStudents = new Map(); // socketId -> { userId, name }

io.on('connection', (socket) => {

  // 👤 Student registers themselves when joining
  socket.on('student-join', ({ userId, name }) => {
    if (userId && name) {
      onlineStudents.set(socket.id, { userId, name });
      io.emit('online-students-count', onlineStudents.size);
    }
  });

  socket.on('disconnect', () => {
    if (onlineStudents.has(socket.id)) {
      onlineStudents.delete(socket.id);
      io.emit('online-students-count', onlineStudents.size);
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

app.get('/api/stats/online', (req, res) => {
  res.json({ success: true, count: onlineStudents.size });
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
