'use client';

import React, { useState, useCallback } from 'react';
import { Question, QuizAnswer } from '@ytb-quiz/shared';

interface QuizButtonProps {
  question: Question | null;
  sessionId: string;
  participantId: string;
  onSubmitAnswer: (answer: Omit<QuizAnswer, 'timestamp'>) => void;
  disabled?: boolean;
  hasAnswered?: boolean;
}

export const QuizButton: React.FC<QuizButtonProps> = ({
  question,
  sessionId,
  participantId,
  onSubmitAnswer,
  disabled = false,
  hasAnswered = false,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswerSelect = useCallback((answerIndex: number) => {
    if (hasAnswered || disabled || !question) return;
    setSelectedAnswer(answerIndex);
  }, [hasAnswered, disabled, question]);

  const handleSubmit = useCallback(async () => {
    if (!question || selectedAnswer === null || hasAnswered || disabled) return;

    setIsSubmitting(true);
    
    const answer: Omit<QuizAnswer, 'timestamp'> = {
      sessionId,
      questionId: question.id,
      participantId,
      answer: selectedAnswer,
    };

    onSubmitAnswer(answer);
    
    // Keep the submitting state for a short while to prevent double clicks
    setTimeout(() => setIsSubmitting(false), 1000);
  }, [question, selectedAnswer, hasAnswered, disabled, sessionId, participantId, onSubmitAnswer]);

  const resetSelection = useCallback(() => {
    setSelectedAnswer(null);
    setIsSubmitting(false);
  }, []);

  // Reset selection when question changes
  React.useEffect(() => {
    resetSelection();
  }, [question?.id, resetSelection]);

  if (!question) {
    return (
      <div className="quiz-button-container">
        <div className="waiting-message">
          <h2>クイズを待っています...</h2>
          <p>ホストが次の問題を開始するのを待ってください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-button-container">
      <div className="question-section">
        <h2 className="question-text">{question.text}</h2>
        
        <div className="options-grid">
          {question.options.map((option, index) => (
            <button
              key={index}
              className={`option-button ${
                selectedAnswer === index ? 'selected' : ''
              } ${hasAnswered ? 'answered' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => handleAnswerSelect(index)}
              disabled={disabled || hasAnswered || isSubmitting}
              aria-label={`選択肢 ${index + 1}: ${option}`}
            >
              <span className="option-number">{index + 1}</span>
              <span className="option-text">{option}</span>
            </button>
          ))}
        </div>

        <div className="action-section">
          {hasAnswered ? (
            <div className="answered-state">
              <span className="status-text">✅ 回答済み</span>
            </div>
          ) : (
            <button
              className={`submit-button ${
                selectedAnswer !== null ? 'ready' : 'not-ready'
              }`}
              onClick={handleSubmit}
              disabled={disabled || selectedAnswer === null || isSubmitting}
            >
              {isSubmitting ? '送信中...' : '回答する'}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .quiz-button-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .waiting-message {
          text-align: center;
          padding: 40px 20px;
          background: #f8f9fa;
          border-radius: 12px;
          border: 2px dashed #dee2e6;
        }

        .waiting-message h2 {
          color: #6c757d;
          margin: 0 0 10px 0;
          font-size: 1.5rem;
        }

        .waiting-message p {
          color: #6c757d;
          margin: 0;
          font-size: 1rem;
        }

        .question-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .question-text {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 20px 0;
          color: #212529;
          text-align: center;
          line-height: 1.4;
        }

        .options-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }

        @media (min-width: 480px) {
          .options-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .option-button {
          display: flex;
          align-items: center;
          padding: 15px;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          font-size: 1rem;
        }

        .option-button:hover:not(.disabled):not(.answered) {
          border-color: #007bff;
          background: #f8f9ff;
        }

        .option-button.selected {
          border-color: #007bff;
          background: #007bff;
          color: white;
        }

        .option-button.answered {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .option-button.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .option-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #6c757d;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          margin-right: 12px;
          flex-shrink: 0;
        }

        .option-button.selected .option-number {
          background: white;
          color: #007bff;
        }

        .option-text {
          flex: 1;
          line-height: 1.3;
        }

        .action-section {
          display: flex;
          justify-content: center;
          margin-top: 20px;
        }

        .submit-button {
          padding: 12px 30px;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 120px;
        }

        .submit-button.ready {
          background: #28a745;
          color: white;
        }

        .submit-button.ready:hover:not(:disabled) {
          background: #218838;
        }

        .submit-button.not-ready {
          background: #6c757d;
          color: white;
          cursor: not-allowed;
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .answered-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 30px;
        }

        .status-text {
          font-size: 1rem;
          font-weight: 600;
          color: #28a745;
        }
      `}</style>
    </div>
  );
};