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

// YouTube Quiz types
export interface YoutubeQuiz {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  startTime: number; // 開始秒数
  duration: number;  // 再生時間（秒）
  correctAnswer: string;
  options: string[]; // 選択肢（正解含む）
  fadeOut?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
  duration: string;
}

export interface VideoDetails {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  thumbnail: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  description: string;
}

// WebSocket types for real-time quiz functionality
export interface QuizSession {
  id: string;
  title: string;
  isActive: boolean;
  currentQuestion: number;
  participants: Participant[];
  youtubeQuizzes: YoutubeQuiz[];
  useYoutubeQuiz: boolean;
  createdAt: Date;
}

export interface Participant {
  id: string;
  username: string;
  socketId: string;
  score: number;
  joinedAt: Date;
  streak: number; // Current correct answer streak
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
  score: number; // Points earned for this question
}

// Ranking and Statistics types
export interface RankingEntry {
  participantId: string;
  username: string;
  totalScore: number;
  correctAnswers: number;
  totalQuestions: number;
  averageResponseTime: number;
  currentStreak: number;
  bestStreak: number;
  rank: number;
}

export interface SessionStatistics {
  sessionId: string;
  totalQuestions: number;
  currentQuestion: number;
  participantCount: number;
  rankings: RankingEntry[];
  averageScore: number;
  topScore: number;
}

export interface ParticipantStatistics {
  participantId: string;
  username: string;
  totalScore: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  averageResponseTime: number;
  currentStreak: number;
  bestStreak: number;
  currentRank: number;
}

// WebSocket Event types
export type WebSocketEvents = {
  // Client to Server events
  'join-session': { sessionId: string; username: string };
  'submit-answer': QuizAnswer;
  'leave-session': { sessionId: string };
  
  // YouTube Quiz events (Client to Server)
  'search-youtube-videos': { query: string };
  'get-video-details': { videoId: string };
  'create-youtube-quiz': YoutubeQuiz;
  'update-youtube-quiz': YoutubeQuiz;
  'delete-youtube-quiz': { quizId: string };
  'get-youtube-quizzes': {};
  'get-session-youtube-quizzes': { sessionId: string };
  'add-quiz-to-session': { sessionId: string; quizId: string };
  'start-youtube-question': { sessionId: string; quizId: string };
  
  // Server to Client events
  'session-joined': { session: QuizSession; participantId: string };
  'participant-joined': Participant;
  'participant-left': { participantId: string };
  'question-started': { question: Question; questionNumber: number };
  'youtube-question-started': { quiz: YoutubeQuiz; questionNumber: number };
  'answer-received': { participantId: string; username: string };
  'question-results': QuizResult[];
  'rankings-updated': SessionStatistics;
  'session-ended': { finalResults: QuizResult[]; finalRankings: RankingEntry[] };
  
  // YouTube API response events
  'youtube-search-results': VideoSearchResult[];
  'video-details': VideoDetails;
  'youtube-quiz-created': YoutubeQuiz;
  'youtube-quiz-updated': YoutubeQuiz;
  'youtube-quiz-deleted': { quizId: string };
  'youtube-quizzes': YoutubeQuiz[];
  'session-youtube-quizzes': YoutubeQuiz[];
  
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

// YouTube URL utility functions
export const extractVideoIdFromUrl = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/v\/)([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
};

export const validateYoutubeUrl = (url: string): boolean => {
  return extractVideoIdFromUrl(url) !== null;
};

export const formatDuration = (duration: string): string => {
  // YouTube API duration format: PT4M13S -> 4:13
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
};

export const parseDurationToSeconds = (duration: string): number => {
  // YouTube API duration format: PT4M13S -> 253 seconds
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
};

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