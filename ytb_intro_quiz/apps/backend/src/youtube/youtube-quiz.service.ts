import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { YoutubeQuiz } from '@ytb-quiz/shared';

@Injectable()
export class YoutubeQuizService {
  private readonly logger = new Logger(YoutubeQuizService.name);
  private youtubeQuizzes: Map<string, YoutubeQuiz> = new Map();
  private sessionQuizzes: Map<string, string[]> = new Map(); // sessionId -> quizIds[]

  createQuiz(quizData: Omit<YoutubeQuiz, 'id' | 'createdAt' | 'updatedAt'>): YoutubeQuiz {
    const quiz: YoutubeQuiz = {
      id: uuidv4(),
      ...quizData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.youtubeQuizzes.set(quiz.id, quiz);
    this.logger.log(`Created YouTube quiz: ${quiz.id} - "${quiz.title}"`);

    return quiz;
  }

  updateQuiz(quizId: string, updates: Partial<Omit<YoutubeQuiz, 'id' | 'createdAt'>>): YoutubeQuiz | null {
    const existingQuiz = this.youtubeQuizzes.get(quizId);
    if (!existingQuiz) {
      return null;
    }

    const updatedQuiz: YoutubeQuiz = {
      ...existingQuiz,
      ...updates,
      updatedAt: new Date(),
    };

    this.youtubeQuizzes.set(quizId, updatedQuiz);
    this.logger.log(`Updated YouTube quiz: ${quizId}`);

    return updatedQuiz;
  }

  deleteQuiz(quizId: string): boolean {
    const deleted = this.youtubeQuizzes.delete(quizId);
    if (deleted) {
      // Remove from all sessions
      for (const [sessionId, quizIds] of this.sessionQuizzes.entries()) {
        const index = quizIds.indexOf(quizId);
        if (index > -1) {
          quizIds.splice(index, 1);
          if (quizIds.length === 0) {
            this.sessionQuizzes.delete(sessionId);
          }
        }
      }
      this.logger.log(`Deleted YouTube quiz: ${quizId}`);
    }
    return deleted;
  }

  getQuiz(quizId: string): YoutubeQuiz | null {
    return this.youtubeQuizzes.get(quizId) || null;
  }

  getAllQuizzes(): YoutubeQuiz[] {
    return Array.from(this.youtubeQuizzes.values());
  }

  getQuizzesBySession(sessionId: string): YoutubeQuiz[] {
    const quizIds = this.sessionQuizzes.get(sessionId) || [];
    return quizIds
      .map(quizId => this.youtubeQuizzes.get(quizId))
      .filter(quiz => quiz !== undefined) as YoutubeQuiz[];
  }

  addQuizToSession(sessionId: string, quizId: string): boolean {
    const quiz = this.youtubeQuizzes.get(quizId);
    if (!quiz) {
      return false;
    }

    const sessionQuizIds = this.sessionQuizzes.get(sessionId) || [];
    if (!sessionQuizIds.includes(quizId)) {
      sessionQuizIds.push(quizId);
      this.sessionQuizzes.set(sessionId, sessionQuizIds);
    }

    this.logger.log(`Added quiz ${quizId} to session ${sessionId}`);
    return true;
  }

  removeQuizFromSession(sessionId: string, quizId: string): boolean {
    const sessionQuizIds = this.sessionQuizzes.get(sessionId);
    if (!sessionQuizIds) {
      return false;
    }

    const index = sessionQuizIds.indexOf(quizId);
    if (index > -1) {
      sessionQuizIds.splice(index, 1);
      if (sessionQuizIds.length === 0) {
        this.sessionQuizzes.delete(sessionId);
      }
      this.logger.log(`Removed quiz ${quizId} from session ${sessionId}`);
      return true;
    }

    return false;
  }

  clearSessionQuizzes(sessionId: string): void {
    this.sessionQuizzes.delete(sessionId);
    this.logger.log(`Cleared all quizzes for session ${sessionId}`);
  }

  // Generate random options for a quiz question
  generateRandomOptions(correctAnswer: string, allTitles: string[], count: number = 3): string[] {
    const options = [correctAnswer];
    const availableTitles = allTitles.filter(title => 
      title !== correctAnswer && 
      title.toLowerCase() !== correctAnswer.toLowerCase()
    );

    // Shuffle and pick random options
    const shuffled = availableTitles.sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      options.push(shuffled[i]);
    }

    // Shuffle the final options
    return options.sort(() => 0.5 - Math.random());
  }

  // Validate quiz data
  validateQuizData(quizData: Omit<YoutubeQuiz, 'id' | 'createdAt' | 'updatedAt'>): string[] {
    const errors: string[] = [];

    if (!quizData.videoId) {
      errors.push('Video ID is required');
    }

    if (!quizData.title || quizData.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!quizData.correctAnswer || quizData.correctAnswer.trim().length === 0) {
      errors.push('Correct answer is required');
    }

    if (!quizData.options || quizData.options.length < 2) {
      errors.push('At least 2 options are required');
    }

    if (quizData.options && !quizData.options.includes(quizData.correctAnswer)) {
      errors.push('Correct answer must be included in options');
    }

    if (quizData.startTime < 0) {
      errors.push('Start time cannot be negative');
    }

    if (quizData.duration <= 0) {
      errors.push('Duration must be positive');
    }

    if (quizData.duration > 60) {
      errors.push('Duration cannot exceed 60 seconds');
    }

    return errors;
  }

  // Get statistics
  getStatistics() {
    return {
      totalQuizzes: this.youtubeQuizzes.size,
      activeSessions: this.sessionQuizzes.size,
      averageQuizzesPerSession: this.sessionQuizzes.size > 0 
        ? Array.from(this.sessionQuizzes.values()).reduce((sum, quizzes) => sum + quizzes.length, 0) / this.sessionQuizzes.size 
        : 0,
    };
  }
}