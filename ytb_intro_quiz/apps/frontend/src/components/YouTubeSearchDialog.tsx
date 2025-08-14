'use client';

import React, { useState, useEffect } from 'react';
import { VideoSearchResult } from '@ytb-quiz/shared';

interface YouTubeSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo: (video: VideoSearchResult) => void;
  onSearch: (query: string) => void;
  searchResults: VideoSearchResult[];
  isSearching: boolean;
}

export const YouTubeSearchDialog: React.FC<YouTubeSearchDialogProps> = ({
  isOpen,
  onClose,
  onSelectVideo,
  onSearch,
  searchResults,
  isSearching
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<VideoSearchResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedVideo(null);
    }
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleVideoSelect = (video: VideoSearchResult) => {
    setSelectedVideo(video);
  };

  const handleConfirmSelection = () => {
    if (selectedVideo) {
      onSelectVideo(selectedVideo);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">YouTube動画検索</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleSearch} className="mt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="曲名、アーティスト名を入力..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!searchQuery.trim() || isSearching}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md transition-colors"
              >
                {isSearching ? '検索中...' : '検索'}
              </button>
            </div>
          </form>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {isSearching && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">動画を検索中...</p>
            </div>
          )}

          {!isSearching && searchResults.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>検索キーワードを入力して動画を検索してください</p>
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-4">
              {searchResults.map((video) => (
                <div
                  key={video.videoId}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedVideo?.videoId === video.videoId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleVideoSelect(video)}
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-32 h-24 object-cover rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{video.title}</h3>
                      <p className="text-gray-600 mb-2">{video.channelTitle}</p>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span>動画ID: {video.videoId}</span>
                        {video.duration && (
                          <span>長さ: {video.duration}</span>
                        )}
                      </div>
                    </div>
                    {selectedVideo?.videoId === video.videoId && (
                      <div className="flex-shrink-0 flex items-center">
                        <div className="bg-blue-600 text-white rounded-full p-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedVideo && (
          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">選択中:</p>
                <p className="font-semibold">{selectedVideo.title}</p>
              </div>
              <button
                onClick={handleConfirmSelection}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition-colors"
              >
                この動画を選択
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};