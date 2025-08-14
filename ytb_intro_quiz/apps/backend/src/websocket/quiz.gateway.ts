import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { QuizService } from './quiz.service';
import { YoutubeService } from '../youtube/youtube.service';
import { YoutubeQuizService } from '../youtube/youtube-quiz.service';
import {
  QuizSession,
  Participant,
  QuizAnswer,
  Question,
  WebSocketEvents,
  YoutubeQuiz,
  VideoSearchResult,
  VideoDetails,
} from '@ytb-quiz/shared';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/quiz',
  allowEIO3: true, // Enable Engine.IO v3 compatibility
})
export class QuizGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(QuizGateway.name);

  constructor(
    private readonly quizService: QuizService,
    private readonly youtubeService: YoutubeService,
    private readonly youtubeQuizService: YoutubeQuizService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized for /quiz namespace');
    this.logger.log(`CORS origin set to: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  }

  handleConnection(client: Socket) {
    this.logger.log(`🔗 Client connected to /quiz namespace: ${client.id}`);
    this.logger.log(`📍 Client info: ${client.handshake.address} via ${client.conn.transport.name}`);
    this.logger.log(`🌐 Headers: ${JSON.stringify(client.handshake.headers['user-agent']?.substring(0, 50))}...`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Client disconnected from /quiz namespace: ${client.id}`);
    
    try {
      // Handle participant leaving
      const result = this.quizService.leaveSession(client.id);
      if (result) {
        // Notify other participants
        client.to(result.sessionId).emit('participant-left', {
          participantId: result.participant.id,
        });
        this.logger.log(`👋 Participant left session ${result.sessionId}: ${result.participant.username}`);
      }
    } catch (error) {
      this.logger.error(`Error handling disconnect for ${client.id}:`, error);
    }
  }

  @SubscribeMessage('join-session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebSocketEvents['join-session'],
  ) {
    try {
      this.logger.log(`🚪 Join session request from ${client.id}: ${JSON.stringify(data)}`);
      
      const { sessionId, username } = data;
      
      if (!username || username.trim().length === 0) {
        this.logger.warn(`❌ Join session failed - invalid username: "${username}"`);
        client.emit('error', { message: 'ユーザー名が無効です' });
        return;
      }

      // Get or create session
      let session = this.quizService.getSession(sessionId);
      if (!session) {
        // Create a new session if it doesn't exist
        this.logger.log(`📝 Creating new session for: ${sessionId}`);
        session = this.quizService.createSession('Live Quiz Session');
      }

      // Join the participant to the session
      const participant = this.quizService.joinSession(session.id, username.trim(), client.id);
      if (!participant) {
        this.logger.error(`❌ Failed to join session ${session.id} for user ${username}`);
        client.emit('error', { message: 'セッションへの参加に失敗しました' });
        return;
      }

      // Join the socket room
      await client.join(session.id);
      this.logger.log(`🏠 Client ${client.id} joined room ${session.id}`);

      // Send session info to the client
      const updatedSession = this.quizService.getSession(session.id)!;
      client.emit('session-joined', {
        session: updatedSession,
        participantId: participant.id,
      });

      // Notify all participants in the session (including host)
      this.server.to(session.id).emit('participant-joined', participant);
      this.logger.log(`📢 Emitted participant-joined event to room ${session.id} for participant: ${participant.username}`);

      this.logger.log(`✅ ${username} successfully joined session ${session.id} (${updatedSession.participants.length} total participants)`);
    } catch (error) {
      this.logger.error(`💥 Error joining session:`, error);
      client.emit('error', { message: 'セッション参加中にエラーが発生しました' });
    }
  }

  @SubscribeMessage('leave-session')
  async handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebSocketEvents['leave-session'],
  ) {
    try {
      const { sessionId } = data;
      await client.leave(sessionId);
      
      const result = this.quizService.leaveSession(client.id);
      if (result) {
        client.to(sessionId).emit('participant-left', {
          participantId: result.participant.id,
        });
      }

      this.logger.log(`Client ${client.id} left session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error leaving session: ${error.message}`);
    }
  }

  @SubscribeMessage('submit-answer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebSocketEvents['submit-answer'],
  ) {
    try {
      const answer: QuizAnswer = {
        ...data,
        timestamp: Date.now(),
      };

      const success = this.quizService.submitAnswer(answer);
      if (!success) {
        client.emit('error', { message: 'Failed to submit answer or already answered' });
        return;
      }

      // Get participant info
      const session = this.quizService.getSession(answer.sessionId);
      const participant = session?.participants.find(p => p.id === answer.participantId);

      if (participant) {
        // Notify all participants that an answer was received
        this.server.to(answer.sessionId).emit('answer-received', {
          participantId: answer.participantId,
          username: participant.username,
        });
      }

      this.logger.log(`Answer submitted by ${participant?.username} in session ${answer.sessionId}`);
    } catch (error) {
      this.logger.error(`Error submitting answer: ${error.message}`);
      client.emit('error', { message: 'Failed to submit answer' });
    }
  }

  // Admin/Host methods for controlling quiz flow
  @SubscribeMessage('start-question')
  async handleStartQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; questionIndex: number },
  ) {
    try {
      const { sessionId, questionIndex } = data;
      
      const question = this.quizService.startQuestion(sessionId, questionIndex);
      if (!question) {
        client.emit('error', { message: 'Failed to start question' });
        return;
      }

      // Notify all participants
      this.server.to(sessionId).emit('question-started', {
        question,
        questionNumber: questionIndex + 1,
      });

      this.logger.log(`Question ${questionIndex} started in session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error starting question: ${error.message}`);
      client.emit('error', { message: 'Failed to start question' });
    }
  }

  @SubscribeMessage('end-question')
  async handleEndQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; questionId: string },
  ) {
    try {
      const { sessionId, questionId } = data;
      
      // End the question
      this.quizService.endQuestion(sessionId);
      
      // Get and send results
      const results = this.quizService.getQuestionResults(sessionId, questionId);
      this.server.to(sessionId).emit('question-results', results);

      // Generate and send updated rankings
      const sessionStats = this.quizService.generateSessionRankings(sessionId);
      this.server.to(sessionId).emit('rankings-updated', sessionStats);

      this.logger.log(`Question ${questionId} ended in session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error ending question: ${error.message}`);
      client.emit('error', { message: 'Failed to end question' });
    }
  }

  @SubscribeMessage('get-sample-questions')
  handleGetSampleQuestions(@ConnectedSocket() client: Socket) {
    const questions = this.quizService.getSampleQuestions();
    client.emit('sample-questions', questions);
  }

  @SubscribeMessage('create-session')
  async handleCreateSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { title: string },
  ) {
    try {
      const session = this.quizService.createSession(data.title);
      
      // Host automatically joins the session room to receive participant updates
      await client.join(session.id);
      this.logger.log(`🏠 Host ${client.id} joined room ${session.id}`);
      
      client.emit('session-created', session);
      this.logger.log(`Session created: ${session.id}`);
    } catch (error) {
      this.logger.error(`Error creating session: ${error.message}`);
      client.emit('error', { message: 'Failed to create session' });
    }
  }

  // Utility method to get session info
  @SubscribeMessage('get-session-info')
  handleGetSessionInfo(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const session = this.quizService.getSession(data.sessionId);
    if (session) {
      client.emit('session-info', session);
    } else {
      client.emit('error', { message: 'Session not found' });
    }
  }

  // Get current rankings for a session
  @SubscribeMessage('get-rankings')
  handleGetRankings(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    try {
      const sessionStats = this.quizService.generateSessionRankings(data.sessionId);
      client.emit('rankings-updated', sessionStats);
    } catch (error) {
      this.logger.error(`Error getting rankings: ${error.message}`);
      client.emit('error', { message: 'Failed to get rankings' });
    }
  }

  // Get participant statistics
  @SubscribeMessage('get-participant-stats')
  handleGetParticipantStats(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { participantId: string },
  ) {
    try {
      const stats = this.quizService.getParticipantStatistics(data.participantId);
      if (stats) {
        client.emit('participant-stats', stats);
      } else {
        client.emit('error', { message: 'Participant not found' });
      }
    } catch (error) {
      this.logger.error(`Error getting participant stats: ${error.message}`);
      client.emit('error', { message: 'Failed to get participant stats' });
    }
  }

  // YouTube API methods
  @SubscribeMessage('search-youtube-videos')
  async handleSearchYoutubeVideos(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { query: string },
  ) {
    try {
      this.logger.log(`Searching YouTube videos: "${data.query}"`);
      const results = await this.youtubeService.searchMusicVideos(data.query, 20);
      client.emit('youtube-search-results', results);
    } catch (error) {
      this.logger.error(`Error searching YouTube videos: ${error.message}`);
      client.emit('error', { message: 'Failed to search YouTube videos' });
    }
  }

  @SubscribeMessage('get-video-details')
  async handleGetVideoDetails(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { videoId: string },
  ) {
    try {
      this.logger.log(`Getting video details: ${data.videoId}`);
      const details = await this.youtubeService.getVideoDetails(data.videoId);
      client.emit('video-details', details);
    } catch (error) {
      this.logger.error(`Error getting video details: ${error.message}`);
      client.emit('error', { message: 'Failed to get video details' });
    }
  }

  // YouTube Quiz management methods
  @SubscribeMessage('create-youtube-quiz')
  async handleCreateYoutubeQuiz(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: Omit<YoutubeQuiz, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    try {
      this.logger.log(`Creating YouTube quiz: "${data.title}"`);
      
      // Validate quiz data
      const errors = this.youtubeQuizService.validateQuizData(data);
      if (errors.length > 0) {
        client.emit('error', { message: `Validation errors: ${errors.join(', ')}` });
        return;
      }

      // Validate video ID (skip if YouTube API not available)
      const isValidVideo = await this.youtubeService.validateVideoId(data.videoId);
      if (isValidVideo === false) { // Only reject if explicitly false, allow null (API unavailable)
        client.emit('error', { message: 'Invalid YouTube video ID' });
        return;
      }
      
      // Log validation result for debugging
      this.logger.log(`Video validation result for ${data.videoId}: ${isValidVideo}`);

      const quiz = this.youtubeQuizService.createQuiz(data);
      client.emit('youtube-quiz-created', quiz);
      
      this.logger.log(`YouTube quiz created: ${quiz.id}`);
    } catch (error) {
      this.logger.error(`Error creating YouTube quiz: ${error.message}`);
      client.emit('error', { message: 'Failed to create YouTube quiz' });
    }
  }

  @SubscribeMessage('update-youtube-quiz')
  async handleUpdateYoutubeQuiz(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: YoutubeQuiz,
  ) {
    try {
      this.logger.log(`Updating YouTube quiz: ${data.id}`);
      
      const updatedQuiz = this.youtubeQuizService.updateQuiz(data.id, data);
      if (!updatedQuiz) {
        client.emit('error', { message: 'YouTube quiz not found' });
        return;
      }

      client.emit('youtube-quiz-updated', updatedQuiz);
    } catch (error) {
      this.logger.error(`Error updating YouTube quiz: ${error.message}`);
      client.emit('error', { message: 'Failed to update YouTube quiz' });
    }
  }

  @SubscribeMessage('delete-youtube-quiz')
  async handleDeleteYoutubeQuiz(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { quizId: string },
  ) {
    try {
      this.logger.log(`Deleting YouTube quiz: ${data.quizId}`);
      
      const deleted = this.youtubeQuizService.deleteQuiz(data.quizId);
      if (!deleted) {
        client.emit('error', { message: 'YouTube quiz not found' });
        return;
      }

      client.emit('youtube-quiz-deleted', { quizId: data.quizId });
    } catch (error) {
      this.logger.error(`Error deleting YouTube quiz: ${error.message}`);
      client.emit('error', { message: 'Failed to delete YouTube quiz' });
    }
  }

  @SubscribeMessage('get-youtube-quizzes')
  handleGetYoutubeQuizzes(@ConnectedSocket() client: Socket) {
    try {
      const quizzes = this.youtubeQuizService.getAllQuizzes();
      client.emit('youtube-quizzes', quizzes);
    } catch (error) {
      this.logger.error(`Error getting YouTube quizzes: ${error.message}`);
      client.emit('error', { message: 'Failed to get YouTube quizzes' });
    }
  }

  @SubscribeMessage('get-session-youtube-quizzes')
  handleGetSessionYoutubeQuizzes(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    try {
      const quizzes = this.youtubeQuizService.getQuizzesBySession(data.sessionId);
      client.emit('session-youtube-quizzes', quizzes);
    } catch (error) {
      this.logger.error(`Error getting session YouTube quizzes: ${error.message}`);
      client.emit('error', { message: 'Failed to get session YouTube quizzes' });
    }
  }

  @SubscribeMessage('add-quiz-to-session')
  handleAddQuizToSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; quizId: string },
  ) {
    try {
      const success = this.youtubeQuizService.addQuizToSession(data.sessionId, data.quizId);
      if (!success) {
        client.emit('error', { message: 'Failed to add quiz to session' });
        return;
      }

      // Get updated session quizzes
      const quizzes = this.youtubeQuizService.getQuizzesBySession(data.sessionId);
      this.server.to(data.sessionId).emit('session-youtube-quizzes', quizzes);
    } catch (error) {
      this.logger.error(`Error adding quiz to session: ${error.message}`);
      client.emit('error', { message: 'Failed to add quiz to session' });
    }
  }

  @SubscribeMessage('start-youtube-question')
  async handleStartYoutubeQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; quizId: string },
  ) {
    try {
      const quiz = this.youtubeQuizService.getQuiz(data.quizId);
      if (!quiz) {
        client.emit('error', { message: 'YouTube quiz not found' });
        return;
      }

      const session = this.quizService.getSession(data.sessionId);
      if (!session) {
        client.emit('error', { message: 'Session not found' });
        return;
      }

      // Start the YouTube quiz question
      this.server.to(data.sessionId).emit('youtube-question-started', {
        quiz,
        questionNumber: session.currentQuestion + 1,
      });

      this.logger.log(`YouTube question started: ${quiz.title} in session ${data.sessionId}`);
    } catch (error) {
      this.logger.error(`Error starting YouTube question: ${error.message}`);
      client.emit('error', { message: 'Failed to start YouTube question' });
    }
  }
}