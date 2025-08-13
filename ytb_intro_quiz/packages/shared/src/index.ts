// User types
export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  username: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Quiz types (for future use)
export interface Quiz {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  questions: Question[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  timestamp: number; // Video timestamp in seconds
}

// WebSocket types for real-time quiz functionality
export interface QuizSession {
  id: string;
  title: string;
  isActive: boolean;
  currentQuestion: number;
  participants: Participant[];
  createdAt: Date;
}

export interface Participant {
  id: string;
  username: string;
  socketId: string;
  score: number;
  joinedAt: Date;
}

export interface QuizAnswer {
  sessionId: string;
  questionId: string;
  participantId: string;
  answer: number;
  timestamp: number; // Unix timestamp when answer was submitted
}

export interface QuizResult {
  participantId: string;
  username: string;
  answer: number;
  isCorrect: boolean;
  responseTime: number; // milliseconds
  rank: number;
}

// WebSocket Event types
export type WebSocketEvents = {
  // Client to Server events
  'join-session': { sessionId: string; username: string };
  'submit-answer': QuizAnswer;
  'leave-session': { sessionId: string };
  
  // Server to Client events
  'session-joined': { session: QuizSession; participantId: string };
  'participant-joined': Participant;
  'participant-left': { participantId: string };
  'question-started': { question: Question; questionNumber: number };
  'answer-received': { participantId: string; username: string };
  'question-results': QuizResult[];
  'session-ended': { finalResults: QuizResult[] };
  'error': { message: string };
}

// Utility functions
export const createApiResponse = <T>(
  success: boolean,
  message: string,
  data?: T,
  error?: string
): ApiResponse<T> => ({
  success,
  message,
  data,
  error,
});

// Constants
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/me',
  },
  QUIZ: {
    LIST: '/quiz',
    CREATE: '/quiz',
    GET: '/quiz/:id',
    UPDATE: '/quiz/:id',
    DELETE: '/quiz/:id',
  },
} as const;