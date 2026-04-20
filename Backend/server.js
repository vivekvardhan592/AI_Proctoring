const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

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
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT"]
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

// 📡 Store socket mapping
let clients = {};

io.on('connection', (socket) => {

  // Store socket
  clients[socket.id] = socket.id;

  socket.on('disconnect', () => {
    delete clients[socket.id];
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

app.use(errorHandler);

const SERVER_PORT = process.env.PORT || 5001;

server.listen(SERVER_PORT, () => {
  console.log(`Server running on port ${SERVER_PORT}`);
});
