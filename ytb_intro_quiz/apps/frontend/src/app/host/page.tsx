'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ResultList } from '../../components/ResultList';
import { 
  QuizSession, 
  Participant, 
  Question, 
  QuizResult 
} from '@ytb-quiz/shared';

export default function HostPage() {
  const [sessionTitle, setSessionTitle] = useState('Live Quiz Session');
  const [currentSession, setCurrentSession] = useState<QuizSession | null>(null);
  const [sampleQuestions, setSampleQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [isQuestionActive, setIsQuestionActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);

  const {
    socket,
    isConnected,
    createSession,
    startQuestion,
    endQuestion,
    getSampleQuestions,
  } = useWebSocket({
    onParticipantJoined: (participant) => {
      console.log('New participant joined:', participant.username);
      if (currentSession) {
        setCurrentSession(prev => prev ? {
          ...prev,
          participants: [...prev.participants, participant]
        } : null);
      }
    },
    onParticipantLeft: ({ participantId }) => {
      console.log('Participant left:', participantId);
      if (currentSession) {
        setCurrentSession(prev => prev ? {
          ...prev,
          participants: prev.participants.filter(p => p.id !== participantId)
        } : null);
      }
    },
    onAnswerReceived: ({ participantId, username }) => {
      console.log(`Answer received from: ${username}`);
      setAnsweredCount(prev => prev + 1);
    },
    onQuestionResults: (questionResults) => {
      console.log('Question results received:', questionResults);
      setResults(questionResults);
      setIsQuestionActive(false);
    },
    onError: ({ message }) => {
      console.error('WebSocket error:', message);
      setError(message);
    },
  });

  // Get sample questions on component mount
  useEffect(() => {
    if (isConnected && socket) {
      getSampleQuestions();
      
      // Listen for sample questions response
      socket.on('sample-questions', (questions: Question[]) => {
        console.log('Received sample questions:', questions);
        setSampleQuestions(questions);
      });

      // Listen for session created
      socket.on('session-created', (session: QuizSession) => {
        console.log('Session created:', session);
        setCurrentSession(session);
        setError(null);
      });

      return () => {
        socket.off('sample-questions');
        socket.off('session-created');
      };
    }
  }, [isConnected, socket, getSampleQuestions]);

  const handleCreateSession = useCallback(() => {
    if (!sessionTitle.trim()) {
      setError('セッションタイトルを入力してください');
      return;
    }
    
    console.log('Creating session with title:', sessionTitle);
    createSession(sessionTitle.trim());
  }, [sessionTitle, createSession]);

  const handleStartQuestion = useCallback((questionIndex: number) => {
    if (!currentSession || questionIndex >= sampleQuestions.length) return;
    
    const question = sampleQuestions[questionIndex];
    console.log('Starting question:', question.text);
    
    setCurrentQuestion(question);
    setCurrentQuestionIndex(questionIndex);
    setResults([]);
    setAnsweredCount(0);
    setIsQuestionActive(true);
    
    startQuestion(currentSession.id, questionIndex);
  }, [currentSession, sampleQuestions, startQuestion]);

  const handleEndQuestion = useCallback(() => {
    if (!currentSession || !currentQuestion) return;
    
    console.log('Ending question:', currentQuestion.id);
    setIsQuestionActive(false);
    
    endQuestion(currentSession.id, currentQuestion.id);
  }, [currentSession, currentQuestion, endQuestion]);

  const handleNextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < sampleQuestions.length) {
      handleStartQuestion(nextIndex);
    }
  }, [currentQuestionIndex, sampleQuestions.length, handleStartQuestion]);

  const copySessionId = useCallback(() => {
    if (currentSession) {
      navigator.clipboard.writeText(currentSession.id);
      // You could add a toast notification here
      console.log('Session ID copied to clipboard');
    }
  }, [currentSession]);

  // Show session creation form if no session exists
  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">クイズを主催</h1>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="sessionTitle" className="block text-sm font-medium text-gray-700 mb-1">
                セッションタイトル
              </label>
              <input
                type="text"
                id="sessionTitle"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="セッション名を入力"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleCreateSession}
              disabled={!isConnected || !sessionTitle.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-md transition-colors"
            >
              {isConnected ? 'セッションを作成' : '接続中...'}
            </button>
          </div>

          <div className="text-center mt-4">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {isConnected ? '✅ 接続済み' : '🔄 接続中...'}
            </div>
            {!isConnected && (
              <p className="text-xs text-gray-500 mt-2">
                サーバーへの接続を確立しています。少々お待ちください。
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">クイズホスト</h1>
              <p className="text-sm text-gray-600">{currentSession.title}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-gray-600">セッションID: </span>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {currentSession.id.slice(0, 8)}...
                </code>
                <button
                  onClick={copySessionId}
                  className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                >
                  コピー
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Session Management */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h2 className="font-semibold mb-4">参加者 ({currentSession.participants.length}名)</h2>
              <div className="space-y-2">
                {currentSession.participants.length === 0 ? (
                  <p className="text-gray-500 text-sm">参加者を待っています...</p>
                ) : (
                  currentSession.participants.map(participant => (
                    <div key={participant.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">{participant.username}</span>
                      <span className="text-xs text-gray-500">スコア: {participant.score}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Question Controls */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="font-semibold mb-4">問題コントロール</h2>
              
              {currentQuestion && isQuestionActive ? (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                    <p className="text-sm font-medium">問題 {currentQuestionIndex + 1} 実施中</p>
                    <p className="text-xs text-gray-600 mt-1">{currentQuestion.text}</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    回答済み: {answeredCount} / {currentSession.participants.length} 名
                  </div>
                  <button
                    onClick={handleEndQuestion}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
                  >
                    問題終了・結果表示
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sampleQuestions.map((question, index) => (
                    <div key={question.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">問題 {index + 1}</p>
                        <p className="text-xs text-gray-600">{question.text.slice(0, 50)}...</p>
                      </div>
                      <button
                        onClick={() => handleStartQuestion(index)}
                        disabled={currentSession.participants.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-medium py-1 px-3 rounded transition-colors"
                      >
                        開始
                      </button>
                    </div>
                  ))}
                  
                  {results.length > 0 && currentQuestionIndex < sampleQuestions.length - 1 && (
                    <button
                      onClick={handleNextQuestion}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
                    >
                      次の問題へ
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-2">
            {currentQuestion && isQuestionActive && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">問題 {currentQuestionIndex + 1}</h2>
                <p className="text-lg mb-4">{currentQuestion.text}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="p-3 border rounded bg-gray-50">
                      <span className="font-medium">{index + 1}. </span>
                      {option}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  正解: {currentQuestion.correctAnswer + 1}番
                </div>
              </div>
            )}

            {results.length > 0 && (
              <ResultList
                results={results}
                participants={currentSession.participants}
                title={`問題 ${currentQuestionIndex + 1} の結果`}
                showAnswers={true}
              />
            )}

            {results.length === 0 && !isQuestionActive && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">クイズを開始しましょう</h2>
                <p className="text-gray-600">
                  参加者が揃ったら左側の問題リストから問題を選択して開始してください。
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </main>
    </div>
  );
}