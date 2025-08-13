const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Mock user database
const users = new Map();
const tokens = new Map();

// Helper functions
function generateToken() {
  return 'mock_token_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function generateRefreshToken() {
  return 'mock_refresh_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Mock API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    if (users.has(email)) {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }
    
    const user = {
      id: 'user_' + Date.now(),
      email,
      username,
      password: 'hashed_' + password, // Mock password hashing
      createdAt: new Date().toISOString()
    };
    
    users.set(email, user);
    
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials'
      });
    }
    
    const user = users.get(email);
    if (!user || user.password !== 'hashed_' + password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    const accessToken = generateToken();
    const refreshToken = generateRefreshToken();
    
    tokens.set(accessToken, {
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + 3600000 // 1 hour
    });
    
    tokens.set(refreshToken, {
      userId: user.id,
      email: user.email,
      type: 'refresh',
      expiresAt: Date.now() + 604800000 // 7 days
    });
    
    res.json({
      success: true,
      data: {
        tokens: {
          accessToken,
          refreshToken
        },
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/api/auth/validate', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Missing token'
      });
    }
    
    const tokenData = tokens.get(token);
    if (!tokenData || tokenData.expiresAt < Date.now()) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    res.json({
      success: true,
      data: {
        valid: true,
        userId: tokenData.userId,
        email: tokenData.email
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Missing token'
      });
    }
    
    const tokenData = tokens.get(token);
    if (!tokenData || tokenData.expiresAt < Date.now()) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    const user = Array.from(users.values()).find(u => u.id === tokenData.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.put('/api/auth/profile', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { username } = req.body;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Missing token'
      });
    }
    
    const tokenData = tokens.get(token);
    if (!tokenData || tokenData.expiresAt < Date.now()) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    const userEntry = Array.from(users.entries()).find(([email, user]) => user.id === tokenData.userId);
    if (!userEntry) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const [userEmail, user] = userEntry;
    if (username) {
      user.username = username;
    }
    users.set(userEmail, user);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.put('/api/auth/password', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { currentPassword, newPassword } = req.body;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Missing token'
      });
    }
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing password fields'
      });
    }
    
    const tokenData = tokens.get(token);
    if (!tokenData || tokenData.expiresAt < Date.now()) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    const userEntry = Array.from(users.entries()).find(([email, user]) => user.id === tokenData.userId);
    if (!userEntry) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const [userEmail, user] = userEntry;
    if (user.password !== 'hashed_' + currentPassword) {
      return res.status(400).json({
        success: false,
        error: 'Invalid current password'
      });
    }
    
    user.password = 'hashed_' + newPassword;
    users.set(userEmail, user);
    
    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/auth/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing refresh token'
      });
    }
    
    const tokenData = tokens.get(refreshToken);
    if (!tokenData || tokenData.type !== 'refresh' || tokenData.expiresAt < Date.now()) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }
    
    const newAccessToken = generateToken();
    tokens.set(newAccessToken, {
      userId: tokenData.userId,
      email: tokenData.email,
      expiresAt: Date.now() + 3600000 // 1 hour
    });
    
    res.json({
      success: true,
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken // Keep the same refresh token
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { refreshToken } = req.body;
    
    if (token) {
      tokens.delete(token);
    }
    
    if (refreshToken) {
      tokens.delete(refreshToken);
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Mock Auth Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('- GET /api/health');
  console.log('- GET /api/ping');
  console.log('- POST /api/auth/register');
  console.log('- POST /api/auth/login');
  console.log('- GET /api/auth/validate');
  console.log('- GET /api/auth/me');
  console.log('- PUT /api/auth/profile');
  console.log('- PUT /api/auth/password');
  console.log('- POST /api/auth/refresh');
  console.log('- POST /api/auth/logout');
});