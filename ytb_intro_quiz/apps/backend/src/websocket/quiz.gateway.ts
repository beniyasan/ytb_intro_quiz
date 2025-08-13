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
import {
  QuizSession,
  Participant,
  QuizAnswer,
  Question,
  WebSocketEvents,
} from '@ytb-quiz/shared';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/quiz',
})
export class QuizGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(QuizGateway.name);

  constructor(private readonly quizService: QuizService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Handle participant leaving
    const result = this.quizService.leaveSession(client.id);
    if (result) {
      // Notify other participants
      client.to(result.sessionId).emit('participant-left', {
        participantId: result.participant.id,
      });
    }
  }

  @SubscribeMessage('join-session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebSocketEvents['join-session'],
  ) {
    try {
      const { sessionId, username } = data;
      
      // Get or create session
      let session = this.quizService.getSession(sessionId);
      if (!session) {
        // Create a new session if it doesn't exist
        session = this.quizService.createSession('Live Quiz Session');
      }

      // Join the participant to the session
      const participant = this.quizService.joinSession(sessionId, username, client.id);
      if (!participant) {
        client.emit('error', { message: 'Failed to join session' });
        return;
      }

      // Join the socket room
      await client.join(sessionId);

      // Send session info to the client
      client.emit('session-joined', {
        session: this.quizService.getSession(sessionId)!,
        participantId: participant.id,
      });

      // Notify other participants
      client.to(sessionId).emit('participant-joined', participant);

      this.logger.log(`${username} joined session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error joining session: ${error.message}`);
      client.emit('error', { message: 'Failed to join session' });
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
  handleCreateSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { title: string },
  ) {
    try {
      const session = this.quizService.createSession(data.title);
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
}