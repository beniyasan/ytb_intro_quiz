import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  QuizSession,
  Participant,
  QuizAnswer,
  QuizResult,
  Question,
  RankingEntry,
  SessionStatistics,
  ParticipantStatistics,
} from '@ytb-quiz/shared';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);
  private sessions: Map<string, QuizSession> = new Map();
  private participantSessions: Map<string, string> = new Map(); // socketId -> sessionId
  private answers: Map<string, QuizAnswer[]> = new Map(); // sessionId -> answers
  private currentQuestions: Map<string, Question> = new Map(); // sessionId -> current question
  private questionStartTimes: Map<string, number> = new Map(); // sessionId -> question start timestamp
  private participantResponseTimes: Map<string, number[]> = new Map(); // participantId -> response times array
  private participantCorrectAnswers: Map<string, number> = new Map(); // participantId -> correct answer count
  private participantTotalQuestions: Map<string, number> = new Map(); // participantId -> total questions answered

  // Sample questions for testing
  private readonly sampleQuestions: Question[] = [
    {
      id: 'q1',
      text: 'YouTubeで最も視聴されている動画のジャンルは？',
      options: ['音楽', 'ゲーム', 'エンタメ', '教育'],
      correctAnswer: 0,
      timestamp: 10,
    },
    {
      id: 'q2',
      text: 'YouTubeが設立された年は？',
      options: ['2003年', '2005年', '2007年', '2009年'],
      correctAnswer: 1,
      timestamp: 30,
    },
    {
      id: 'q3',
      text: 'YouTube Premiumの主な特徴は？',
      options: ['広告なし', '高画質再生', 'ダウンロード可能', 'すべて'],
      correctAnswer: 3,
      timestamp: 50,
    },
  ];

  createSession(title: string): QuizSession {
    const sessionId = uuidv4();
    const session: QuizSession = {
      id: sessionId,
      title,
      isActive: false,
      currentQuestion: 0,
      participants: [],
      youtubeQuizzes: [],
      useYoutubeQuiz: false,
      createdAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    this.answers.set(sessionId, []);
    this.logger.log(`Created new session: ${sessionId}`);

    return session;
  }

  getSession(sessionId: string): QuizSession | null {
    return this.sessions.get(sessionId) || null;
  }

  joinSession(sessionId: string, username: string, socketId: string): Participant | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if user already exists in session
    const existingParticipant = session.participants.find(p => p.username === username);
    if (existingParticipant) {
      // Update socket ID for reconnection
      existingParticipant.socketId = socketId;
      this.participantSessions.set(socketId, sessionId);
      return existingParticipant;
    }

    const participant: Participant = {
      id: uuidv4(),
      username,
      socketId,
      score: 0,
      streak: 0,
      joinedAt: new Date(),
    };

    session.participants.push(participant);
    this.participantSessions.set(socketId, sessionId);
    this.logger.log(`Participant ${username} joined session ${sessionId}`);

    return participant;
  }

  leaveSession(socketId: string): { sessionId: string; participant: Participant } | null {
    const sessionId = this.participantSessions.get(socketId);
    if (!sessionId) {
      return null;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const participantIndex = session.participants.findIndex(p => p.socketId === socketId);
    if (participantIndex === -1) {
      return null;
    }

    const participant = session.participants[participantIndex];
    session.participants.splice(participantIndex, 1);
    this.participantSessions.delete(socketId);

    // Clean up empty sessions
    if (session.participants.length === 0 && !session.isActive) {
      this.sessions.delete(sessionId);
      this.answers.delete(sessionId);
      this.currentQuestions.delete(sessionId);
      this.questionStartTimes.delete(sessionId);
      
      // Clean up participant tracking data
      session.participants.forEach(p => {
        this.participantResponseTimes.delete(p.id);
        this.participantCorrectAnswers.delete(p.id);
        this.participantTotalQuestions.delete(p.id);
      });
      
      this.logger.log(`Cleaned up empty session: ${sessionId}`);
    }

    this.logger.log(`Participant ${participant.username} left session ${sessionId}`);
    return { sessionId, participant };
  }

  startQuestion(sessionId: string, questionIndex: number): Question | null {
    const session = this.sessions.get(sessionId);
    if (!session || questionIndex >= this.sampleQuestions.length) {
      return null;
    }

    const question = this.sampleQuestions[questionIndex];
    session.currentQuestion = questionIndex;
    session.isActive = true;
    
    // Record question start time for accurate response time calculation
    const startTime = Date.now();
    this.questionStartTimes.set(sessionId, startTime);
    
    this.currentQuestions.set(sessionId, question);
    this.logger.log(`Started question ${questionIndex} in session ${sessionId} at ${startTime}`);

    return question;
  }

  submitAnswer(answer: QuizAnswer): boolean {
    const session = this.sessions.get(answer.sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    const answers = this.answers.get(answer.sessionId) || [];
    
    // Check if participant already answered this question
    const existingAnswer = answers.find(
      a => a.participantId === answer.participantId && a.questionId === answer.questionId
    );
    
    if (existingAnswer) {
      return false; // Already answered
    }

    answers.push(answer);
    this.answers.set(answer.sessionId, answers);
    
    this.logger.log(
      `Answer submitted by ${answer.participantId} for question ${answer.questionId} in session ${answer.sessionId}`
    );

    return true;
  }

  getQuestionResults(sessionId: string, questionId: string): QuizResult[] {
    const session = this.sessions.get(sessionId);
    const answers = this.answers.get(sessionId) || [];
    const question = this.currentQuestions.get(sessionId);

    if (!session || !question || question.id !== questionId) {
      return [];
    }

    const questionAnswers = answers.filter(a => a.questionId === questionId);
    const questionStartTime = this.questionStartTimes.get(sessionId);
    
    // Calculate actual response times and sort by response speed for correct answers
    const sortedAnswers = questionAnswers
      .map(answer => {
        const participant = session.participants.find(p => p.id === answer.participantId);
        const isCorrect = answer.answer === question.correctAnswer;
        
        // Calculate actual response time from question start to answer submission
        let responseTime = 1000; // Default fallback
        if (questionStartTime && answer.timestamp) {
          responseTime = Math.max(answer.timestamp - questionStartTime, 0);
        }
        
        // Update participant statistics
        this.updateParticipantStats(answer.participantId, responseTime, isCorrect);
        
        this.logger.log(`Response time for ${participant?.username}: ${responseTime}ms (start: ${questionStartTime}, answer: ${answer.timestamp})`);
        
        return {
          participantId: answer.participantId,
          username: participant?.username || 'Unknown',
          answer: answer.answer,
          isCorrect,
          responseTime,
          rank: 0, // Will be set below
          score: 0, // Will be calculated below
        };
      })
      .sort((a, b) => {
        // Sort correct answers by response time, incorrect answers last
        if (a.isCorrect && b.isCorrect) {
          return a.responseTime - b.responseTime;
        } else if (a.isCorrect && !b.isCorrect) {
          return -1;
        } else if (!a.isCorrect && b.isCorrect) {
          return 1;
        } else {
          return a.responseTime - b.responseTime;
        }
      });

    // Assign ranks and calculate advanced scores
    let currentRank = 1;
    sortedAnswers.forEach((result) => {
      if (result.isCorrect) {
        result.rank = currentRank++;
        
        // Calculate advanced score with bonuses
        const participant = session.participants.find(p => p.id === result.participantId);
        if (participant) {
          const questionScore = this.calculateAdvancedScore(result, participant);
          result.score = questionScore;
          
          // Update participant total score and streak
          participant.score += questionScore;
          participant.streak += 1;
        }
      } else {
        result.rank = -1; // Incorrect answer
        result.score = 0;
        
        // Reset streak for incorrect answer
        const participant = session.participants.find(p => p.id === result.participantId);
        if (participant) {
          participant.streak = 0;
        }
      }
    });

    return sortedAnswers;
  }

  endQuestion(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.logger.log(`Ended question in session ${sessionId}`);
    }
  }

  getSessionFromSocketId(socketId: string): string | null {
    return this.participantSessions.get(socketId) || null;
  }

  getAllSessions(): QuizSession[] {
    return Array.from(this.sessions.values());
  }

  // Advanced scoring calculation
  private calculateAdvancedScore(result: QuizResult, participant: Participant): number {
    const BASE_POINTS = 100;
    const SPEED_BONUS_MAX = 50;
    const RANK_BONUS_MAX = 30;
    const STREAK_BONUS = 10;
    
    // Base points for correct answer
    let score = BASE_POINTS;
    
    // Speed bonus: faster responses get more points (max 50 points)
    // Assuming 10 seconds max response time for full speed bonus
    const maxResponseTime = 10000; // 10 seconds in milliseconds
    const speedBonus = Math.max(0, SPEED_BONUS_MAX * (1 - Math.min(result.responseTime, maxResponseTime) / maxResponseTime));
    score += Math.floor(speedBonus);
    
    // Rank bonus: 1st place gets 30, 2nd gets 20, 3rd gets 10, others get 0
    const rankBonus = Math.max(0, RANK_BONUS_MAX - (result.rank - 1) * 10);
    score += rankBonus;
    
    // Streak bonus: additional points for consecutive correct answers
    const streakBonus = Math.min(participant.streak, 5) * STREAK_BONUS; // Max 5 streak bonus
    score += streakBonus;
    
    this.logger.log(`Score calculation for ${result.username}: base=${BASE_POINTS}, speed=${Math.floor(speedBonus)}, rank=${rankBonus}, streak=${streakBonus}, total=${score}`);
    
    return score;
  }
  
  // Update participant statistics
  private updateParticipantStats(participantId: string, responseTime: number, isCorrect: boolean): void {
    // Update response times
    const responseTimes = this.participantResponseTimes.get(participantId) || [];
    responseTimes.push(responseTime);
    this.participantResponseTimes.set(participantId, responseTimes);
    
    // Update correct answers count
    if (isCorrect) {
      const correctCount = this.participantCorrectAnswers.get(participantId) || 0;
      this.participantCorrectAnswers.set(participantId, correctCount + 1);
    }
    
    // Update total questions answered
    const totalQuestions = this.participantTotalQuestions.get(participantId) || 0;
    this.participantTotalQuestions.set(participantId, totalQuestions + 1);
  }
  
  // Generate real-time rankings
  generateSessionRankings(sessionId: string): SessionStatistics {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        sessionId,
        totalQuestions: 0,
        currentQuestion: 0,
        participantCount: 0,
        rankings: [],
        averageScore: 0,
        topScore: 0,
      };
    }
    
    const rankings: RankingEntry[] = session.participants
      .map(participant => {
        const responseTimes = this.participantResponseTimes.get(participant.id) || [];
        const correctAnswers = this.participantCorrectAnswers.get(participant.id) || 0;
        const totalQuestions = this.participantTotalQuestions.get(participant.id) || 0;
        const averageResponseTime = responseTimes.length > 0 
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
          : 0;
        
        return {
          participantId: participant.id,
          username: participant.username,
          totalScore: participant.score,
          correctAnswers,
          totalQuestions,
          averageResponseTime,
          currentStreak: participant.streak,
          bestStreak: participant.streak, // For now, same as current
          rank: 0, // Will be assigned below
        };
      })
      .sort((a, b) => {
        // Primary sort: total score
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        // Secondary sort: accuracy
        const aAccuracy = a.totalQuestions > 0 ? a.correctAnswers / a.totalQuestions : 0;
        const bAccuracy = b.totalQuestions > 0 ? b.correctAnswers / b.totalQuestions : 0;
        if (bAccuracy !== aAccuracy) {
          return bAccuracy - aAccuracy;
        }
        // Tertiary sort: average response time (faster is better)
        return a.averageResponseTime - b.averageResponseTime;
      });
    
    // Assign ranks
    rankings.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    // Calculate session statistics
    const totalScores = rankings.map(r => r.totalScore);
    const averageScore = totalScores.length > 0 ? totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length : 0;
    const topScore = totalScores.length > 0 ? Math.max(...totalScores) : 0;
    
    return {
      sessionId,
      totalQuestions: this.sampleQuestions.length,
      currentQuestion: session.currentQuestion,
      participantCount: session.participants.length,
      rankings,
      averageScore,
      topScore,
    };
  }
  
  // Get participant statistics
  getParticipantStatistics(participantId: string): ParticipantStatistics | null {
    // Find participant in any session
    let participant: Participant | null = null;
    let sessionRankings: RankingEntry[] = [];
    
    for (const session of this.sessions.values()) {
      const found = session.participants.find(p => p.id === participantId);
      if (found) {
        participant = found;
        sessionRankings = this.generateSessionRankings(session.id).rankings;
        break;
      }
    }
    
    if (!participant) {
      return null;
    }
    
    const responseTimes = this.participantResponseTimes.get(participantId) || [];
    const correctAnswers = this.participantCorrectAnswers.get(participantId) || 0;
    const totalQuestions = this.participantTotalQuestions.get(participantId) || 0;
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const currentRank = sessionRankings.find(r => r.participantId === participantId)?.rank || 0;
    
    return {
      participantId,
      username: participant.username,
      totalScore: participant.score,
      questionsAnswered: totalQuestions,
      correctAnswers,
      accuracy,
      averageResponseTime,
      currentStreak: participant.streak,
      bestStreak: participant.streak, // For now, same as current
      currentRank,
    };
  }
  
  // For development/testing
  getSampleQuestions(): Question[] {
    return this.sampleQuestions;
  }
}