'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { QuizButton } from '../../components/QuizButton';
import { ResultList } from '../../components/ResultList';
import { 
  QuizSession, 
  Participant, 
  Question, 
  QuizResult 
} from '@ytb-quiz/shared';

export default function QuizPage() {
  const [username, setUsername] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [currentSession, setCurrentSession] = useState<QuizSession | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answeredParticipants, setAnsweredParticipants] = useState<string[]>([]);

  const {
    socket,
    isConnected,
    joinSession,
    submitAnswer,
  } = useWebSocket({
    onSessionJoined: ({ session, participantId: pid }) => {
      console.log('Session joined successfully');
      setCurrentSession(session);
      setParticipantId(pid);
      setIsJoined(true);
      setError(null);
    },
    onParticipantJoined: (participant) => {
      console.log('New participant joined:', participant.username);
      if (currentSession) {
        setCurrentSession(prev => prev ? {
          ...prev,
          participants: [...prev.participants, participant]
        } : null);
      }
    },
    onParticipantLeft: ({ participantId: leftParticipantId }) => {
      console.log('Participant left:', leftParticipantId);
      if (currentSession) {
        setCurrentSession(prev => prev ? {
          ...prev,
          participants: prev.participants.filter(p => p.id !== leftParticipantId)
        } : null);
      }
      setAnsweredParticipants(prev => prev.filter(id => id !== leftParticipantId));
    },
    onQuestionStarted: ({ question, questionNumber: qNum }) => {
      console.log('Question started:', question.text);
      setCurrentQuestion(question);
      setQuestionNumber(qNum);
      setHasAnswered(false);
      setResults([]);
      setAnsweredParticipants([]);
    },
    onAnswerReceived: ({ participantId: answeredParticipantId, username: answeredUsername }) => {
      console.log(`Answer received from: ${answeredUsername}`);
      setAnsweredParticipants(prev => [...prev, answeredParticipantId]);
    },
    onQuestionResults: (questionResults) => {
      console.log('Question results received:', questionResults);
      setResults(questionResults);
      setCurrentQuestion(null); // Hide question when results are shown
    },
    onError: ({ message }) => {
      console.error('WebSocket error:', message);
      setError(message);
    },
  });

  const handleJoinSession = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !sessionId.trim()) {
      setError('ユーザー名とセッションIDを入力してください');
      return;
    }
    
    console.log('Attempting to join session:', { sessionId, username });
    joinSession(sessionId, username.trim());
  }, [username, sessionId, joinSession]);

  const handleSubmitAnswer = useCallback((answer: any) => {
    console.log('Submitting answer:', answer);
    submitAnswer(answer);
    setHasAnswered(true);
  }, [submitAnswer]);

  const handleLeaveSession = useCallback(() => {
    setIsJoined(false);
    setCurrentSession(null);
    setParticipantId(null);
    setCurrentQuestion(null);
    setResults([]);
    setHasAnswered(false);
    setAnsweredParticipants([]);
    setError(null);
    // Socket will automatically disconnect on page unload
  }, []);

  // Show join form if not connected to a session
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">クイズに参加</h1>
          
          <form onSubmit={handleJoinSession} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                ユーザー名
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="あなたの名前を入力"
                required
              />
            </div>
            
            <div>
              <label htmlFor="sessionId" className="block text-sm font-medium text-gray-700 mb-1">
                セッションID
              </label>
              <input
                type="text"
                id="sessionId"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="セッションIDを入力（空白の場合は新規作成）"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!isConnected || !username.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-md transition-colors"
            >
              {isConnected ? '参加する' : '接続中...'}
            </button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-4">
            接続状態: {isConnected ? '✅ 接続済み' : '🔄 接続中...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">YTB Quiz</h1>
              {currentSession && (
                <p className="text-sm text-gray-600">
                  セッション: {currentSession.title}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {username} として参加中
              </span>
              <button
                onClick={handleLeaveSession}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded transition-colors"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4">
        {/* Session Info */}
        {currentSession && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold">参加者 ({currentSession.participants.length}名)</h2>
              {currentQuestion && (
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  問題 {questionNumber}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {currentSession.participants.map(participant => (
                <span
                  key={participant.id}
                  className={`px-2 py-1 text-xs rounded-full ${
                    answeredParticipants.includes(participant.id)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {participant.username}
                  {answeredParticipants.includes(participant.id) && ' ✓'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quiz Button */}
        {participantId && currentSession && (
          <QuizButton
            question={currentQuestion}
            sessionId={currentSession.id}
            participantId={participantId}
            onSubmitAnswer={handleSubmitAnswer}
            hasAnswered={hasAnswered}
          />
        )}

        {/* Results */}
        {results.length > 0 && currentSession && (
          <ResultList
            results={results}
            participants={currentSession.participants}
            title={`問題 ${questionNumber} の結果`}
            showAnswers={true}
          />
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </main>
    </div>
  );
}