'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ResultList } from '../../components/ResultList';
import { RankingList } from '../../components/RankingList';
import { YouTubeSearchDialog } from '../../components/YouTubeSearchDialog';
import { YouTubeQuizForm } from '../../components/YouTubeQuizForm';
import { YouTubeQuizList } from '../../components/YouTubeQuizList';
import { 
  QuizSession, 
  Participant, 
  Question, 
  QuizResult,
  SessionStatistics,
  VideoSearchResult,
  VideoDetails,
  YoutubeQuiz
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
  const [sessionStats, setSessionStats] = useState<SessionStatistics | null>(null);

  // YouTube states
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoSearchResult | null>(null);
  const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);
  const [searchResults, setSearchResults] = useState<VideoSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [youtubeQuizzes, setYoutubeQuizzes] = useState<YoutubeQuiz[]>([]);
  const [activeTab, setActiveTab] = useState<'sample' | 'youtube'>('sample');

  const onParticipantJoined = useCallback((participant: Participant) => {
    console.log('🔔 HOST: Received participant-joined event:', participant);
    setCurrentSession(prev => {
      if (prev) {
        console.log('🔔 HOST: Current session participants before update:', prev.participants);
        // Check if participant already exists to avoid duplicates
        const exists = prev.participants.some(p => p.id === participant.id);
        if (!exists) {
          const updated = {
            ...prev,
            participants: [...prev.participants, participant]
          };
          console.log('🔔 HOST: Updated session participants:', updated.participants);
          return updated;
        } else {
          console.log('🔔 HOST: Participant already exists, skipping update');
          return prev;
        }
      } else {
        console.warn('🔔 HOST: No current session available when participant joined');
        return prev;
      }
    });
  }, []);

  const onParticipantLeft = useCallback(({ participantId }: { participantId: string }) => {
    console.log('🔔 HOST: Participant left:', participantId);
    setCurrentSession(prev => {
      if (prev) {
        const updated = {
          ...prev,
          participants: prev.participants.filter(p => p.id !== participantId)
        };
        console.log('🔔 HOST: Updated participants after leave:', updated.participants);
        return updated;
      }
      return prev;
    });
  }, []);

  const onAnswerReceived = useCallback(({ participantId, username }: { participantId: string; username: string }) => {
    console.log(`Answer received from: ${username}`);
    setAnsweredCount(prev => prev + 1);
  }, []);

  const onQuestionResults = useCallback((questionResults: QuizResult[]) => {
    console.log('Question results received:', questionResults);
    setResults(questionResults);
    setIsQuestionActive(false);
  }, []);

  const onRankingsUpdated = useCallback((stats: SessionStatistics) => {
    console.log('Rankings updated:', stats);
    setSessionStats(stats);
  }, []);

  const onError = useCallback(({ message }: { message: string }) => {
    console.error('WebSocket error:', message);
    setError(message);
  }, []);

  // YouTube callbacks
  const onYoutubeSearchResults = useCallback((results: VideoSearchResult[]) => {
    console.log('YouTube search results:', results);
    setSearchResults(results);
    setIsSearching(false);
  }, []);

  const onVideoDetails = useCallback((details: VideoDetails) => {
    console.log('Video details:', details);
    setVideoDetails(details);
  }, []);

  const onYoutubeQuizCreated = useCallback((quiz: YoutubeQuiz) => {
    console.log('YouTube quiz created:', quiz);
    setYoutubeQuizzes(prev => [...prev, quiz]);
    setShowQuizForm(false);
    setSelectedVideo(null);
    setVideoDetails(null);
  }, []);

  const onYoutubeQuizzes = useCallback((quizzes: YoutubeQuiz[]) => {
    console.log('YouTube quizzes:', quizzes);
    setYoutubeQuizzes(quizzes);
  }, []);

  const onYoutubeQuestionStarted = useCallback((data: { quiz: YoutubeQuiz; questionNumber: number }) => {
    console.log('YouTube question started:', data);
    // Set the current YouTube quiz as the current question
    setCurrentQuestion({
      id: data.quiz.id,
      text: `この曲の名前は？`,
      options: data.quiz.options,
      correctAnswer: data.quiz.options.indexOf(data.quiz.correctAnswer),
      timestamp: Date.now(),
    });
    setCurrentQuestionIndex(data.questionNumber - 1);
    setIsQuestionActive(true);
    setResults([]);
    setAnsweredCount(0);
  }, []);

  const {
    socket,
    isConnected,
    createSession,
    startQuestion,
    endQuestion,
    getSampleQuestions,
    getRankings,
    searchYoutubeVideos,
    getVideoDetails,
    createYoutubeQuiz,
    getYoutubeQuizzes,
    deleteYoutubeQuiz,
    startYoutubeQuestion,
  } = useWebSocket({
    onParticipantJoined,
    onParticipantLeft,
    onAnswerReceived,
    onQuestionResults,
    onRankingsUpdated,
    onError,
    onYoutubeSearchResults,
    onVideoDetails,
    onYoutubeQuizCreated,
    onYoutubeQuizzes,
    onYoutubeQuestionStarted,
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

      // Get YouTube quizzes
      getYoutubeQuizzes();

      return () => {
        socket.off('sample-questions');
        socket.off('session-created');
      };
    }
  }, [isConnected, socket, getYoutubeQuizzes]);

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

  // YouTube handlers
  const handleSearchVideos = useCallback((query: string) => {
    setIsSearching(true);
    searchYoutubeVideos(query);
  }, [searchYoutubeVideos]);

  const handleSelectVideo = useCallback((video: VideoSearchResult) => {
    setSelectedVideo(video);
    setShowSearchDialog(false);
    setShowQuizForm(true);
    
    // Get video details
    getVideoDetails(video.videoId);
  }, [getVideoDetails]);

  const handleCreateYoutubeQuiz = useCallback((quizData: Omit<YoutubeQuiz, 'id' | 'createdAt' | 'updatedAt'>) => {
    createYoutubeQuiz(quizData);
  }, [createYoutubeQuiz]);

  const handleDeleteYoutubeQuiz = useCallback((quizId: string) => {
    deleteYoutubeQuiz(quizId);
    setYoutubeQuizzes(prev => prev.filter(q => q.id !== quizId));
  }, [deleteYoutubeQuiz]);

  const handleStartYoutubeQuiz = useCallback((quiz: YoutubeQuiz) => {
    if (!currentSession) return;
    
    console.log('Starting YouTube quiz:', quiz);
    startYoutubeQuestion(currentSession.id, quiz.id);
    
    // Update session state to show YouTube quiz is active
    setIsQuestionActive(true);
    setCurrentQuestionIndex(0);
  }, [currentSession, startYoutubeQuestion]);

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
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">問題コントロール</h2>
                <button
                  onClick={() => setShowSearchDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1 px-3 rounded transition-colors"
                >
                  YouTube動画検索
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b mb-4">
                <button
                  onClick={() => setActiveTab('sample')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'sample'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  サンプル問題 ({sampleQuestions.length})
                </button>
                <button
                  onClick={() => setActiveTab('youtube')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'youtube'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  YouTubeクイズ ({youtubeQuizzes.length})
                </button>
              </div>
              
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
                  {/* Sample Questions Tab */}
                  {activeTab === 'sample' && (
                    <>
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
                    </>
                  )}

                  {/* YouTube Quizzes Tab */}
                  {activeTab === 'youtube' && (
                    <div className="space-y-3">
                      {youtubeQuizzes.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          <p className="text-sm mb-2">YouTubeクイズがありません</p>
                          <button
                            onClick={() => setShowSearchDialog(true)}
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            YouTube動画を検索してクイズを作成
                          </button>
                        </div>
                      ) : (
                        youtubeQuizzes.map((quiz) => (
                          <div key={quiz.id} className="border rounded p-3">
                            <div className="flex items-start gap-3">
                              <img
                                src={quiz.thumbnail}
                                alt={quiz.title}
                                className="w-16 h-12 object-cover rounded flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium truncate">{quiz.title}</h4>
                                <p className="text-xs text-gray-600 truncate">{quiz.channel}</p>
                                <div className="flex gap-2 mt-1 text-xs text-gray-500">
                                  <span>{Math.floor(quiz.startTime / 60)}:{(quiz.startTime % 60).toString().padStart(2, '0')}</span>
                                  <span>• {quiz.duration}s</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleStartYoutubeQuiz(quiz)}
                                disabled={currentSession.participants.length === 0}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs font-medium py-1 px-2 rounded transition-colors"
                              >
                                開始
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
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
              <div className="space-y-6">
                <ResultList
                  results={results}
                  participants={currentSession.participants}
                  title={`問題 ${currentQuestionIndex + 1} の結果`}
                  showAnswers={true}
                />
                
                {sessionStats && (
                  <RankingList
                    sessionStats={sessionStats}
                    title="現在のランキング"
                    showStats={true}
                  />
                )}
              </div>
            )}

            {sessionStats && results.length === 0 && !isQuestionActive && (
              <RankingList
                sessionStats={sessionStats}
                title="現在のランキング"
                showStats={true}
              />
            )}

            {!sessionStats && results.length === 0 && !isQuestionActive && (
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

      {/* YouTube Search Dialog */}
      <YouTubeSearchDialog
        isOpen={showSearchDialog}
        onClose={() => setShowSearchDialog(false)}
        onSelectVideo={handleSelectVideo}
        onSearch={handleSearchVideos}
        searchResults={searchResults}
        isSearching={isSearching}
      />

      {/* YouTube Quiz Form Modal */}
      {showQuizForm && selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <YouTubeQuizForm
              selectedVideo={selectedVideo}
              videoDetails={videoDetails}
              onCreateQuiz={handleCreateYoutubeQuiz}
              onCancel={() => {
                setShowQuizForm(false);
                setSelectedVideo(null);
                setVideoDetails(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}