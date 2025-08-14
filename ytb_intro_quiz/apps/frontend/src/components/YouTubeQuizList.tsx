'use client';

import React, { useState } from 'react';
import { YoutubeQuiz } from '@ytb-quiz/shared';

interface YouTubeQuizListProps {
  quizzes: YoutubeQuiz[];
  onEditQuiz?: (quiz: YoutubeQuiz) => void;
  onDeleteQuiz?: (quizId: string) => void;
  onStartQuiz?: (quiz: YoutubeQuiz) => void;
  showActions?: boolean;
  canStart?: boolean;
}

export const YouTubeQuizList: React.FC<YouTubeQuizListProps> = ({
  quizzes,
  onEditQuiz,
  onDeleteQuiz,
  onStartQuiz,
  showActions = true,
  canStart = false
}) => {
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleExpanded = (quizId: string) => {
    setExpandedQuiz(expandedQuiz === quizId ? null : quizId);
  };

  if (quizzes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">YouTubeクイズがありません</h3>
        <p className="text-gray-500">
          YouTube動画を検索してクイズを作成してください
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {quizzes.map((quiz) => (
        <div key={quiz.id} className="bg-white rounded-lg shadow-sm border">
          {/* Quiz Header */}
          <div className="p-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <img
                  src={quiz.thumbnail}
                  alt={quiz.title}
                  className="w-24 h-18 object-cover rounded"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{quiz.title}</h3>
                <p className="text-gray-600 mb-2">{quiz.channel}</p>
                <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                  <span>開始: {formatDuration(quiz.startTime)}</span>
                  <span>再生: {quiz.duration}秒</span>
                  <span>正解: {quiz.correctAnswer}</span>
                  {quiz.fadeOut && <span className="text-blue-600">フェード効果</span>}
                </div>
              </div>
              <div className="flex-shrink-0 flex flex-col gap-2">
                <button
                  onClick={() => toggleExpanded(quiz.id)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="詳細を表示"
                >
                  <svg 
                    className={`w-5 h-5 transform transition-transform ${
                      expandedQuiz === quiz.id ? 'rotate-180' : ''
                    }`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {showActions && canStart && onStartQuiz && (
                  <button
                    onClick={() => onStartQuiz(quiz)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    開始
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          {expandedQuiz === quiz.id && (
            <div className="border-t bg-gray-50 p-4 space-y-4">
              {/* Quiz Details */}
              <div>
                <h4 className="font-medium mb-2">クイズ詳細</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">動画ID</p>
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded">{quiz.videoId}</code>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">作成日</p>
                    <p className="text-sm">{new Date(quiz.createdAt).toLocaleString('ja-JP')}</p>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div>
                <h4 className="font-medium mb-2">選択肢</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {quiz.options.map((option, index) => (
                    <div 
                      key={index} 
                      className={`p-2 rounded text-sm ${
                        option === quiz.correctAnswer
                          ? 'bg-green-100 border border-green-300 text-green-800'
                          : 'bg-white border'
                      }`}
                    >
                      <span className="font-medium">{index + 1}. </span>
                      {option}
                      {option === quiz.correctAnswer && (
                        <span className="ml-2 text-green-600">✓ 正解</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Video Preview */}
              <div>
                <h4 className="font-medium mb-2">プレビュー</h4>
                <div className="aspect-video bg-black rounded max-w-md">
                  <iframe
                    src={`https://www.youtube.com/embed/${quiz.videoId}?start=${quiz.startTime}&autoplay=0&controls=1`}
                    className="w-full h-full rounded"
                    allowFullScreen
                    title={`Preview: ${quiz.title}`}
                  />
                </div>
              </div>

              {/* Actions */}
              {showActions && (
                <div className="flex gap-2 pt-4 border-t">
                  {onEditQuiz && (
                    <button
                      onClick={() => onEditQuiz(quiz)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                      編集
                    </button>
                  )}
                  {onDeleteQuiz && (
                    <button
                      onClick={() => {
                        if (confirm('このクイズを削除しますか？')) {
                          onDeleteQuiz(quiz.id);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                      削除
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};