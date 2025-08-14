'use client';

import React, { useEffect, useState } from 'react';
import { RankingEntry, SessionStatistics } from '@ytb-quiz/shared';

interface RankingListProps {
  sessionStats: SessionStatistics;
  title?: string;
  highlightParticipantId?: string;
  showStats?: boolean;
}

export function RankingList({ 
  sessionStats, 
  title = "ランキング", 
  highlightParticipantId,
  showStats = true 
}: RankingListProps) {
  const { rankings, averageScore, topScore, currentQuestion, totalQuestions } = sessionStats;
  const [previousRankings, setPreviousRankings] = useState<RankingEntry[]>([]);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Detect rank changes
    const newAnimatingIds = new Set<string>();
    
    rankings.forEach(entry => {
      const prevEntry = previousRankings.find(p => p.participantId === entry.participantId);
      if (prevEntry && prevEntry.rank !== entry.rank) {
        newAnimatingIds.add(entry.participantId);
      }
    });

    setAnimatingIds(newAnimatingIds);
    setPreviousRankings(rankings);

    // Clear animations after 500ms
    if (newAnimatingIds.size > 0) {
      const timer = setTimeout(() => {
        setAnimatingIds(new Set());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [rankings]);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 2: return 'bg-gray-100 border-gray-300 text-gray-800';
      case 3: return 'bg-orange-100 border-orange-300 text-orange-800';
      default: return 'bg-white border-gray-200 text-gray-700';
    }
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';  
      case 3: return '🥉';
      default: return `${rank}位`;
    }
  };

  const formatResponseTime = (time: number) => {
    return time > 0 ? `${(time / 1000).toFixed(1)}秒` : '-';
  };

  const formatAccuracy = (correct: number, total: number) => {
    return total > 0 ? `${Math.round((correct / total) * 100)}%` : '0%';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{title}</h2>
        {showStats && (
          <div className="text-sm text-gray-600">
            問題 {currentQuestion} / {totalQuestions}
          </div>
        )}
      </div>

      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">平均スコア</div>
            <div className="text-2xl font-bold text-blue-800">
              {Math.round(averageScore)}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium">最高スコア</div>
            <div className="text-2xl font-bold text-green-800">
              {topScore}
            </div>
          </div>
        </div>
      )}

      {rankings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          まだランキングデータがありません
        </div>
      ) : (
        <div className="space-y-3">
          {rankings.map((entry) => (
            <div
              key={entry.participantId}
              className={`
                p-4 rounded-lg border-2 transition-all duration-500
                ${entry.participantId === highlightParticipantId 
                  ? 'ring-2 ring-blue-400 border-blue-400' 
                  : getRankColor(entry.rank)
                }
                ${animatingIds.has(entry.participantId) 
                  ? 'transform scale-105 shadow-lg animate-pulse' 
                  : ''}
              `}
              style={{
                animation: animatingIds.has(entry.participantId) 
                  ? 'rankChange 0.5s ease-in-out' 
                  : undefined
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-lg font-bold min-w-[60px]">
                    {getRankEmoji(entry.rank)}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">
                      {entry.username}
                      {entry.participantId === highlightParticipantId && (
                        <span className="ml-2 text-sm text-blue-600">(あなた)</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-x-4">
                      <span>正解数: {entry.correctAnswers}/{entry.totalQuestions}</span>
                      <span>正答率: {formatAccuracy(entry.correctAnswers, entry.totalQuestions)}</span>
                      {entry.averageResponseTime > 0 && (
                        <span>平均回答時間: {formatResponseTime(entry.averageResponseTime)}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {entry.totalScore}
                  </div>
                  <div className="text-sm text-gray-600">
                    ポイント
                  </div>
                  {entry.currentStreak > 0 && (
                    <div className="text-sm text-orange-600 font-medium">
                      🔥 {entry.currentStreak}連続正解
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Add CSS animation keyframes in a style tag or CSS file
if (typeof window !== 'undefined' && !document.getElementById('ranking-animations')) {
  const style = document.createElement('style');
  style.id = 'ranking-animations';
  style.textContent = `
    @keyframes rankChange {
      0% { transform: translateX(0) scale(1); }
      25% { transform: translateX(-10px) scale(1.05); }
      75% { transform: translateX(10px) scale(1.05); }
      100% { transform: translateX(0) scale(1); }
    }
  `;
  document.head.appendChild(style);
}