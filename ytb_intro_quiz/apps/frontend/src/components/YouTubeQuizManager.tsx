'use client';

import React, { useState } from 'react';
import { YoutubeQuiz } from '@ytb-quiz/shared';
import { YouTubeQuizList } from './YouTubeQuizList';

interface YouTubeQuizManagerProps {
  quizzes: YoutubeQuiz[];
  onDeleteQuiz: (quizId: string) => void;
  onStartQuiz?: (quiz: YoutubeQuiz) => void;
  canStart?: boolean;
}

export const YouTubeQuizManager: React.FC<YouTubeQuizManagerProps> = ({
  quizzes,
  onDeleteQuiz,
  onStartQuiz,
  canStart = false
}) => {
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-gray-900">
          YouTubeクイズ ({quizzes.length}件)
        </h3>
        <div className="flex gap-1 bg-gray-100 rounded p-1">
          <button
            onClick={() => setViewMode('compact')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === 'compact'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            簡潔
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === 'detailed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            詳細
          </button>
        </div>
      </div>

      {/* Quiz List */}
      {viewMode === 'compact' ? (
        <div className="space-y-2">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white border rounded p-3">
              <div className="flex items-center gap-3">
                <img
                  src={quiz.thumbnail}
                  alt={quiz.title}
                  className="w-16 h-12 object-cover rounded flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">{quiz.title}</h4>
                  <p className="text-xs text-gray-600 truncate">{quiz.channel}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span>{Math.floor(quiz.startTime / 60)}:{(quiz.startTime % 60).toString().padStart(2, '0')}</span>
                    <span>• {quiz.duration}s</span>
                    <span>• {quiz.options.length}択</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {canStart && onStartQuiz && (
                    <button
                      onClick={() => onStartQuiz(quiz)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      開始
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('このクイズを削除しますか？')) {
                        onDeleteQuiz(quiz.id);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <YouTubeQuizList
          quizzes={quizzes}
          onDeleteQuiz={onDeleteQuiz}
          onStartQuiz={onStartQuiz}
          canStart={canStart}
          showActions={true}
        />
      )}

      {quizzes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <p className="text-sm">YouTubeクイズがまだありません</p>
          <p className="text-xs mt-1">YouTube動画を検索してクイズを作成してください</p>
        </div>
      )}
    </div>
  );
};