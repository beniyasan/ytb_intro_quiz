'use client';

import React from 'react';
import { ParticipantStatistics } from '@ytb-quiz/shared';

interface ParticipantStatsProps {
  stats: ParticipantStatistics;
  className?: string;
}

export function ParticipantStats({ stats, className = "" }: ParticipantStatsProps) {
  const formatResponseTime = (time: number) => {
    return time > 0 ? `${(time / 1000).toFixed(1)}秒` : '-';
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-green-600';
    if (accuracy >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-600';
    if (rank === 2) return 'text-gray-600';
    if (rank === 3) return 'text-orange-600';
    return 'text-blue-600';
  };

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">
          {stats.username} の成績
        </h3>
        <div className={`text-2xl font-bold ${getRankColor(stats.currentRank)}`}>
          {stats.currentRank === 1 ? '🥇' : 
           stats.currentRank === 2 ? '🥈' : 
           stats.currentRank === 3 ? '🥉' : 
           `${stats.currentRank}位`}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600">
            {stats.totalScore}
          </div>
          <div className="text-sm text-gray-600">総スコア</div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold ${getAccuracyColor(stats.accuracy)}`}>
            {Math.round(stats.accuracy)}%
          </div>
          <div className="text-sm text-gray-600">正答率</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {stats.correctAnswers}/{stats.questionsAnswered}
          </div>
          <div className="text-sm text-gray-600">正解数</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {formatResponseTime(stats.averageResponseTime)}
          </div>
          <div className="text-sm text-gray-600">平均回答時間</div>
        </div>
      </div>

      {(stats.currentStreak > 0 || stats.bestStreak > 0) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-center space-x-6">
            {stats.currentStreak > 0 && (
              <div className="text-center">
                <div className="text-xl font-bold text-orange-600">
                  🔥 {stats.currentStreak}
                </div>
                <div className="text-sm text-gray-600">現在の連続正解</div>
              </div>
            )}
            
            {stats.bestStreak > 0 && (
              <div className="text-center">
                <div className="text-xl font-bold text-red-600">
                  🏆 {stats.bestStreak}
                </div>
                <div className="text-sm text-gray-600">最長連続正解</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}