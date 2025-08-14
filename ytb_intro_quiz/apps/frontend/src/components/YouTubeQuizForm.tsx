'use client';

import React, { useState, useEffect } from 'react';
import { VideoSearchResult, VideoDetails, YoutubeQuiz } from '@ytb-quiz/shared';

interface YouTubeQuizFormProps {
  selectedVideo: VideoSearchResult;
  videoDetails: VideoDetails | null;
  onCreateQuiz: (quiz: Omit<YoutubeQuiz, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const YouTubeQuizForm: React.FC<YouTubeQuizFormProps> = ({
  selectedVideo,
  videoDetails,
  onCreateQuiz,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    startTime: 10,
    duration: 30,
    correctAnswer: '',
    options: ['', '', '', ''],
    fadeOut: true
  });
  
  const [previewTime, setPreviewTime] = useState(10);

  // Initialize form with video data
  useEffect(() => {
    if (videoDetails) {
      setFormData(prev => ({
        ...prev,
        correctAnswer: videoDetails.title // Default to video title
      }));
    }
  }, [videoDetails]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const handleStartTimeChange = (time: number) => {
    setFormData(prev => ({
      ...prev,
      startTime: time
    }));
    setPreviewTime(time);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.correctAnswer.trim()) {
      alert('正解を入力してください');
      return;
    }
    
    const filledOptions = formData.options.filter(opt => opt.trim());
    if (filledOptions.length < 2) {
      alert('選択肢を最低2つ入力してください');
      return;
    }

    const quizData = {
      videoId: selectedVideo.videoId,
      title: videoDetails?.title || selectedVideo.title,
      channel: videoDetails?.channelTitle || selectedVideo.channelTitle,
      thumbnail: videoDetails?.thumbnail || selectedVideo.thumbnail,
      startTime: formData.startTime,
      duration: formData.duration,
      correctAnswer: formData.correctAnswer.trim(),
      options: filledOptions,
      fadeOut: formData.fadeOut
    };

    onCreateQuiz(quizData);
  };

  // Parse duration from ISO 8601 format (PT4M30S) to seconds
  const parseDuration = (duration: string): number => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const videoDurationSeconds = videoDetails?.duration ? parseDuration(videoDetails.duration) : 300;
  const maxStartTime = Math.max(0, videoDurationSeconds - formData.duration);

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6">YouTubeクイズ作成</h2>
      
      {/* Selected Video Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex gap-4">
          <img
            src={selectedVideo.thumbnail}
            alt={selectedVideo.title}
            className="w-32 h-24 object-cover rounded"
          />
          <div className="flex-1">
            <h3 className="font-semibold mb-1">{videoDetails?.title || selectedVideo.title}</h3>
            <p className="text-gray-600 mb-2">{videoDetails?.channelTitle || selectedVideo.channelTitle}</p>
            <div className="text-sm text-gray-500">
              <p>動画ID: {selectedVideo.videoId}</p>
              {videoDetails && (
                <>
                  <p>再生時間: {videoDetails.duration}</p>
                  <p>再生回数: {videoDetails.viewCount.toLocaleString()}回</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* YouTube Player Preview */}
        <div className="space-y-4">
          <h3 className="font-semibold">プレビュー・再生設定</h3>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="aspect-video bg-black rounded mb-4">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.videoId}?start=${previewTime}&autoplay=0&controls=1`}
                className="w-full h-full rounded"
                allowFullScreen
                title="YouTube Preview"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  開始時間 (秒)
                </label>
                <input
                  type="number"
                  min="0"
                  max={maxStartTime}
                  value={formData.startTime}
                  onChange={(e) => handleStartTimeChange(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formatTime(formData.startTime)} から再生開始
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  再生時間 (秒)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.duration}秒間再生
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.fadeOut}
                  onChange={(e) => handleInputChange('fadeOut', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm">フェードアウト効果を使用</span>
              </label>
            </div>
          </div>
        </div>

        {/* Quiz Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold">クイズ設定</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              正解 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.correctAnswer}
              onChange={(e) => handleInputChange('correctAnswer', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="正解を入力してください"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              選択肢 <span className="text-red-500">*最低2つ</span>
            </label>
            <div className="space-y-2">
              {formData.options.map((option, index) => (
                <input
                  key={index}
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`選択肢 ${index + 1}${index < 2 ? ' (必須)' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {isLoading ? 'クイズ作成中...' : 'クイズを作成'}
          </button>
        </div>
      </form>
    </div>
  );
};