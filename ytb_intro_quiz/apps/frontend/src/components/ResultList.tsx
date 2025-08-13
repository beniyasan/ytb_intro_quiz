'use client';

import React from 'react';
import { QuizResult, Participant } from '@ytb-quiz/shared';

interface ResultListProps {
  results: QuizResult[];
  participants: Participant[];
  title?: string;
  showAnswers?: boolean;
}

export const ResultList: React.FC<ResultListProps> = ({
  results,
  participants,
  title = '結果',
  showAnswers = false,
}) => {
  const sortedResults = [...results].sort((a, b) => {
    // Correct answers first, then by rank
    if (a.isCorrect && !b.isCorrect) return -1;
    if (!a.isCorrect && b.isCorrect) return 1;
    if (a.isCorrect && b.isCorrect) return a.rank - b.rank;
    return a.responseTime - b.responseTime;
  });

  const getRankDisplay = (result: QuizResult) => {
    if (!result.isCorrect) return '❌';
    if (result.rank === 1) return '🥇';
    if (result.rank === 2) return '🥈';
    if (result.rank === 3) return '🥉';
    return `${result.rank}位`;
  };

  const getResponseTimeDisplay = (responseTime: number) => {
    return `${(responseTime / 1000).toFixed(2)}秒`;
  };

  if (results.length === 0) {
    return (
      <div className="result-list-container">
        <h3 className="result-title">{title}</h3>
        <div className="empty-results">
          <p>まだ結果がありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="result-list-container">
      <h3 className="result-title">{title}</h3>
      
      <div className="results-grid">
        {sortedResults.map((result, index) => (
          <div 
            key={result.participantId} 
            className={`result-item ${result.isCorrect ? 'correct' : 'incorrect'}`}
          >
            <div className="rank-section">
              <span className="rank-display">{getRankDisplay(result)}</span>
            </div>
            
            <div className="participant-section">
              <span className="participant-name">{result.username}</span>
              {showAnswers && (
                <span className="answer-display">
                  選択: {result.answer + 1}番
                </span>
              )}
            </div>
            
            <div className="stats-section">
              {result.isCorrect && (
                <span className="response-time">
                  {getResponseTimeDisplay(result.responseTime)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Participants who haven't answered */}
      {participants.length > results.length && (
        <div className="pending-section">
          <h4 className="pending-title">回答待ち</h4>
          <div className="pending-list">
            {participants
              .filter(p => !results.find(r => r.participantId === p.id))
              .map(participant => (
                <div key={participant.id} className="pending-item">
                  <span className="pending-name">{participant.username}</span>
                  <span className="pending-status">...</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .result-list-container {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .result-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 16px 0;
          color: #212529;
          text-align: center;
        }

        .empty-results {
          text-align: center;
          padding: 40px 20px;
          background: #f8f9fa;
          border-radius: 8px;
          color: #6c757d;
        }

        .results-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .result-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #dee2e6;
          background: white;
          transition: all 0.2s ease;
        }

        .result-item.correct {
          border-color: #28a745;
          background: #f8fff9;
        }

        .result-item.incorrect {
          border-color: #dc3545;
          background: #fff5f5;
        }

        .rank-section {
          display: flex;
          align-items: center;
          width: 60px;
          flex-shrink: 0;
        }

        .rank-display {
          font-size: 1.2rem;
          font-weight: 600;
        }

        .participant-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin: 0 16px;
        }

        .participant-name {
          font-weight: 600;
          color: #212529;
          font-size: 1rem;
        }

        .answer-display {
          font-size: 0.875rem;
          color: #6c757d;
        }

        .stats-section {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          min-width: 80px;
        }

        .response-time {
          font-size: 0.875rem;
          color: #6c757d;
          font-weight: 500;
        }

        .pending-section {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #dee2e6;
        }

        .pending-title {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: #6c757d;
        }

        .pending-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pending-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          background: #f8f9fa;
          border-radius: 6px;
          border: 1px solid #dee2e6;
        }

        .pending-name {
          font-weight: 500;
          color: #495057;
        }

        .pending-status {
          color: #6c757d;
          font-size: 1.2rem;
        }

        @media (max-width: 480px) {
          .result-list-container {
            padding: 16px;
          }
          
          .result-item {
            padding: 10px 12px;
          }
          
          .participant-section {
            margin: 0 12px;
          }
          
          .rank-section {
            width: 50px;
          }
        }
      `}</style>
    </div>
  );
};