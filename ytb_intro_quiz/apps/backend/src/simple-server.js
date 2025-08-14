const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS設定
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Socket.IO設定
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    credentials: true
  }
});

// /quiz namespace setup
const quizNamespace = io.of('/quiz');

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// WebSocket handlers for /quiz namespace
quizNamespace.on('connection', (socket) => {
  console.log('✅ Client connected to /quiz namespace:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected from /quiz namespace:', socket.id);
  });
  
  socket.on('join-session', (data) => {
    console.log('🚪 Join session request:', data);
    
    // Mock session data for testing
    const mockSession = {
      id: data.sessionId || 'test-session',
      title: 'Test Quiz Session',
      participants: [
        {
          id: 'test-participant',
          username: data.username || 'TestUser',
          socketId: socket.id,
          score: 0,
          streak: 0,
          joinedAt: new Date()
        }
      ],
      isActive: false,
      currentQuestion: 0,
      youtubeQuizzes: [],
      useYoutubeQuiz: false,
      createdAt: new Date()
    };
    
    socket.emit('session-joined', { 
      session: mockSession,
      participantId: 'test-participant'
    });
    
    // Send mock rankings
    const mockStats = {
      sessionId: mockSession.id,
      totalQuestions: 3,
      currentQuestion: 0,
      participantCount: 1,
      rankings: [
        {
          participantId: 'test-participant',
          username: data.username || 'TestUser',
          totalScore: 100,
          correctAnswers: 2,
          totalQuestions: 3,
          averageResponseTime: 2500,
          currentStreak: 2,
          bestStreak: 2,
          rank: 1
        }
      ],
      averageScore: 100,
      topScore: 100
    };
    
    socket.emit('rankings-updated', mockStats);
  });
  
  socket.on('get-rankings', (data) => {
    console.log('📊 Get rankings request:', data);
    
    const mockStats = {
      sessionId: data.sessionId,
      totalQuestions: 3,
      currentQuestion: 1,
      participantCount: 1,
      rankings: [
        {
          participantId: 'test-participant',
          username: 'TestUser',
          totalScore: 150,
          correctAnswers: 2,
          totalQuestions: 2,
          averageResponseTime: 2200,
          currentStreak: 2,
          bestStreak: 2,
          rank: 1
        }
      ],
      averageScore: 150,
      topScore: 150
    };
    
    socket.emit('rankings-updated', mockStats);
  });
  
  socket.on('get-participant-stats', (data) => {
    console.log('📈 Get participant stats request:', data);
    
    const mockParticipantStats = {
      participantId: data.participantId,
      username: 'TestUser',
      totalScore: 180,
      questionsAnswered: 3,
      correctAnswers: 2,
      accuracy: 66.7,
      averageResponseTime: 2300,
      currentStreak: 1,
      bestStreak: 2,
      currentRank: 1
    };
    
    socket.emit('participant-stats', mockParticipantStats);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Simple backend server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
});