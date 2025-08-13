'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  QuizSession,
  Participant,
  QuizAnswer,
  QuizResult,
  Question,
  WebSocketEvents,
} from '@ytb-quiz/shared';

interface UseWebSocketProps {
  onSessionJoined?: (data: { session: QuizSession; participantId: string }) => void;
  onParticipantJoined?: (participant: Participant) => void;
  onParticipantLeft?: (data: { participantId: string }) => void;
  onQuestionStarted?: (data: { question: Question; questionNumber: number }) => void;
  onAnswerReceived?: (data: { participantId: string; username: string }) => void;
  onQuestionResults?: (results: QuizResult[]) => void;
  onSessionEnded?: (data: { finalResults: QuizResult[] }) => void;
  onError?: (data: { message: string }) => void;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinSession: (sessionId: string, username: string) => void;
  leaveSession: (sessionId: string) => void;
  submitAnswer: (answer: Omit<QuizAnswer, 'timestamp'>) => void;
  startQuestion: (sessionId: string, questionIndex: number) => void;
  endQuestion: (sessionId: string, questionId: string) => void;
  createSession: (title: string) => void;
  getSampleQuestions: () => void;
  getSessionInfo: (sessionId: string) => void;
  disconnect: () => void;
}

export const useWebSocket = (props: UseWebSocketProps = {}): UseWebSocketReturn => {
  const {
    onSessionJoined,
    onParticipantJoined,
    onParticipantLeft,
    onQuestionStarted,
    onAnswerReceived,
    onQuestionResults,
    onSessionEnded,
    onError,
  } = props;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/quiz`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    // Quiz event handlers
    socketInstance.on('session-joined', (data: { session: QuizSession; participantId: string }) => {
      console.log('Session joined:', data);
      onSessionJoined?.(data);
    });

    socketInstance.on('participant-joined', (participant: Participant) => {
      console.log('Participant joined:', participant);
      onParticipantJoined?.(participant);
    });

    socketInstance.on('participant-left', (data: { participantId: string }) => {
      console.log('Participant left:', data);
      onParticipantLeft?.(data);
    });

    socketInstance.on('question-started', (data: { question: Question; questionNumber: number }) => {
      console.log('Question started:', data);
      onQuestionStarted?.(data);
    });

    socketInstance.on('answer-received', (data: { participantId: string; username: string }) => {
      console.log('Answer received:', data);
      onAnswerReceived?.(data);
    });

    socketInstance.on('question-results', (results: QuizResult[]) => {
      console.log('Question results:', results);
      onQuestionResults?.(results);
    });

    socketInstance.on('session-ended', (data: { finalResults: QuizResult[] }) => {
      console.log('Session ended:', data);
      onSessionEnded?.(data);
    });

    socketInstance.on('error', (data: { message: string }) => {
      console.error('WebSocket error:', data);
      onError?.(data);
    });

    // Additional event handlers for session management
    socketInstance.on('session-created', (session: QuizSession) => {
      console.log('Session created:', session);
    });

    socketInstance.on('session-info', (session: QuizSession) => {
      console.log('Session info:', session);
    });

    socketInstance.on('sample-questions', (questions: Question[]) => {
      console.log('Sample questions:', questions);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      console.log('Cleaning up WebSocket connection');
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    };
  }, [
    onSessionJoined,
    onParticipantJoined,
    onParticipantLeft,
    onQuestionStarted,
    onAnswerReceived,
    onQuestionResults,
    onSessionEnded,
    onError,
  ]);

  const joinSession = useCallback((sessionId: string, username: string) => {
    if (socketRef.current) {
      console.log('Joining session:', { sessionId, username });
      socketRef.current.emit('join-session', { sessionId, username });
    }
  }, []);

  const leaveSession = useCallback((sessionId: string) => {
    if (socketRef.current) {
      console.log('Leaving session:', sessionId);
      socketRef.current.emit('leave-session', { sessionId });
    }
  }, []);

  const submitAnswer = useCallback((answer: Omit<QuizAnswer, 'timestamp'>) => {
    if (socketRef.current) {
      console.log('Submitting answer:', answer);
      socketRef.current.emit('submit-answer', answer);
    }
  }, []);

  const startQuestion = useCallback((sessionId: string, questionIndex: number) => {
    if (socketRef.current) {
      console.log('Starting question:', { sessionId, questionIndex });
      socketRef.current.emit('start-question', { sessionId, questionIndex });
    }
  }, []);

  const endQuestion = useCallback((sessionId: string, questionId: string) => {
    if (socketRef.current) {
      console.log('Ending question:', { sessionId, questionId });
      socketRef.current.emit('end-question', { sessionId, questionId });
    }
  }, []);

  const createSession = useCallback((title: string) => {
    if (socketRef.current) {
      console.log('Creating session:', title);
      socketRef.current.emit('create-session', { title });
    }
  }, []);

  const getSampleQuestions = useCallback(() => {
    if (socketRef.current) {
      console.log('Getting sample questions');
      socketRef.current.emit('get-sample-questions');
    }
  }, []);

  const getSessionInfo = useCallback((sessionId: string) => {
    if (socketRef.current) {
      console.log('Getting session info:', sessionId);
      socketRef.current.emit('get-session-info', { sessionId });
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('Manually disconnecting');
      socketRef.current.disconnect();
    }
  }, []);

  return {
    socket,
    isConnected,
    joinSession,
    leaveSession,
    submitAnswer,
    startQuestion,
    endQuestion,
    createSession,
    getSampleQuestions,
    getSessionInfo,
    disconnect,
  };
};