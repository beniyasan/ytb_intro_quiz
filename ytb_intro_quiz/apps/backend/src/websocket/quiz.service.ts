import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  QuizSession,
  Participant,
  QuizAnswer,
  QuizResult,
  Question,
} from '@ytb-quiz/shared';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);
  private sessions: Map<string, QuizSession> = new Map();
  private participantSessions: Map<string, string> = new Map(); // socketId -> sessionId
  private answers: Map<string, QuizAnswer[]> = new Map(); // sessionId -> answers
  private currentQuestions: Map<string, Question> = new Map(); // sessionId -> current question

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
    
    this.currentQuestions.set(sessionId, question);
    this.logger.log(`Started question ${questionIndex} in session ${sessionId}`);

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
    
    // Calculate response times and sort by timestamp
    const sortedAnswers = questionAnswers
      .map(answer => {
        const participant = session.participants.find(p => p.id === answer.participantId);
        const isCorrect = answer.answer === question.correctAnswer;
        
        // Simple response time calculation (could be improved with question start time)
        const responseTime = 1000; // Placeholder - in real implementation, calculate from question start time
        
        return {
          participantId: answer.participantId,
          username: participant?.username || 'Unknown',
          answer: answer.answer,
          isCorrect,
          responseTime,
          rank: 0, // Will be set below
        };
      })
      .sort((a, b) => a.responseTime - b.responseTime);

    // Assign ranks
    let currentRank = 1;
    sortedAnswers.forEach((result, index) => {
      if (result.isCorrect) {
        result.rank = currentRank++;
        
        // Update participant score
        const participant = session.participants.find(p => p.id === result.participantId);
        if (participant) {
          participant.score += Math.max(0, 100 - (result.rank - 1) * 10);
        }
      } else {
        result.rank = -1; // Incorrect answer
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

  // For development/testing
  getSampleQuestions(): Question[] {
    return this.sampleQuestions;
  }
}