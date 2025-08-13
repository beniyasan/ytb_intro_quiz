import request from 'supertest';
import App from '../app';
import { prisma } from '../config/database';

describe('Authentication API', () => {
  let app: App;
  let server: any;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
    
    app = new App();
    server = app.express;

    // Clean up test database
    await prisma.auditLog.deleteMany({});
    await prisma.passwordHistory.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test database
    await prisma.auditLog.deleteMany({});
    await prisma.passwordHistory.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});
    
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123!'
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should reject registration with duplicate email', async () => {
      const userData = {
        email: 'test@example.com', // Same email as above
        username: 'testuser2',
        password: 'TestPassword123!'
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EmailAlreadyExistsException');
    });

    it('should reject registration with duplicate username', async () => {
      const userData = {
        email: 'test2@example.com',
        username: 'testuser', // Same username as first test
        password: 'TestPassword123!'
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UsernameAlreadyExistsException');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test3@example.com',
        username: 'testuser3',
        password: '123' // Too weak
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ValidationException');
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        username: 'testuser4',
        password: 'TestPassword123!'
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ValidationException');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('InvalidCredentialsException');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('InvalidCredentialsException');
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Get access token
      const loginResponse = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        });
      
      accessToken = loginResponse.body.data.accessToken;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('username');
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.username).toBe('testuser');
    });

    it('should reject request without token', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UnauthorizedException');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      // Get refresh token
      const loginResponse = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        });
      
      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UnauthorizedException');
    });
  });

  describe('GET /api/auth/validate', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Get access token
      const loginResponse = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        });
      
      accessToken = loginResponse.body.data.accessToken;
    });

    it('should validate token successfully', async () => {
      const response = await request(server)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token is valid');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('sessionId');
    });
  });
});

describe('Health Check API', () => {
  let app: App;
  let server: any;

  beforeAll(() => {
    app = new App();
    server = app.express;
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api/ping', () => {
    it('should return pong', async () => {
      const response = await request(server)
        .get('/api/ping')
        .expect(200);

      expect(response.body.message).toBe('pong');
    });
  });
});