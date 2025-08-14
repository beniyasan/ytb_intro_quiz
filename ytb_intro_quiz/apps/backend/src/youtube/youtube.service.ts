import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import {
  VideoSearchResult,
  VideoDetails,
  extractVideoIdFromUrl,
  formatDuration,
  parseDurationToSeconds,
} from '@ytb-quiz/shared';

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private readonly youtube;

  constructor() {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      this.logger.warn('YOUTUBE_API_KEY not found in environment variables. YouTube features will be disabled.');
      // Create a placeholder - API calls will fail gracefully
      this.youtube = null;
      return;
    }

    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });
    
    this.logger.log('YouTube API client initialized successfully');
  }

  async searchVideos(query: string, maxResults: number = 10): Promise<VideoSearchResult[]> {
    if (!this.youtube) {
      throw new Error('YouTube API not initialized - missing API key');
    }
    
    try {
      this.logger.log(`Searching YouTube videos for: "${query}"`);
      
      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        type: ['video'],
        maxResults,
        order: 'relevance',
        videoCategoryId: '10', // Music category
        safeSearch: 'moderate',
      });

      if (!response.data.items) {
        return [];
      }

      // Get detailed video information including duration
      const videoIds = response.data.items
        .map(item => item.id?.videoId)
        .filter(Boolean) as string[];

      const videoDetails = await this.getMultipleVideoDetails(videoIds);
      
      return response.data.items.map(item => {
        const videoId = item.id?.videoId || '';
        const details = videoDetails.find(d => d.videoId === videoId);
        
        return {
          videoId,
          title: item.snippet?.title || '',
          channelTitle: item.snippet?.channelTitle || '',
          thumbnail: item.snippet?.thumbnails?.medium?.url || '',
          publishedAt: item.snippet?.publishedAt || '',
          duration: details?.duration || '',
        };
      });
    } catch (error) {
      this.logger.error('Error searching YouTube videos:', error);
      throw new Error('Failed to search YouTube videos');
    }
  }

  async getVideoDetails(videoId: string): Promise<VideoDetails> {
    if (!this.youtube) {
      throw new Error('YouTube API not initialized - missing API key');
    }
    
    try {
      this.logger.log(`Getting video details for: ${videoId}`);
      
      const response = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: [videoId],
      });

      const video = response.data.items?.[0];
      if (!video) {
        throw new Error(`Video not found: ${videoId}`);
      }

      return {
        videoId,
        title: video.snippet?.title || '',
        channelTitle: video.snippet?.channelTitle || '',
        channelId: video.snippet?.channelId || '',
        thumbnail: video.snippet?.thumbnails?.maxres?.url || 
                  video.snippet?.thumbnails?.high?.url || 
                  video.snippet?.thumbnails?.medium?.url || '',
        publishedAt: video.snippet?.publishedAt || '',
        duration: video.contentDetails?.duration || '',
        viewCount: parseInt(video.statistics?.viewCount || '0'),
        description: video.snippet?.description || '',
      };
    } catch (error) {
      this.logger.error(`Error getting video details for ${videoId}:`, error);
      throw new Error(`Failed to get video details: ${videoId}`);
    }
  }

  async getMultipleVideoDetails(videoIds: string[]): Promise<VideoDetails[]> {
    if (videoIds.length === 0) return [];
    
    if (!this.youtube) {
      throw new Error('YouTube API not initialized - missing API key');
    }

    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: videoIds,
      });

      return response.data.items?.map(video => ({
        videoId: video.id || '',
        title: video.snippet?.title || '',
        channelTitle: video.snippet?.channelTitle || '',
        channelId: video.snippet?.channelId || '',
        thumbnail: video.snippet?.thumbnails?.medium?.url || '',
        publishedAt: video.snippet?.publishedAt || '',
        duration: video.contentDetails?.duration || '',
        viewCount: parseInt(video.statistics?.viewCount || '0'),
        description: video.snippet?.description || '',
      })) || [];
    } catch (error) {
      this.logger.error('Error getting multiple video details:', error);
      return [];
    }
  }

  async validateVideoId(videoId: string): Promise<boolean | null> {
    if (!this.youtube) {
      this.logger.warn('Cannot validate video ID - YouTube API not initialized');
      return null; // Return null to indicate API unavailable
    }
    
    try {
      const response = await this.youtube.videos.list({
        part: ['id'],
        id: [videoId],
      });
      
      return response.data.items && response.data.items.length > 0;
    } catch (error) {
      this.logger.error(`Error validating video ID ${videoId}:`, error);
      return false;
    }
  }

  extractVideoIdFromUrl(url: string): string | null {
    return extractVideoIdFromUrl(url);
  }

  async searchMusicVideos(query: string, maxResults: number = 20): Promise<VideoSearchResult[]> {
    if (!this.youtube) {
      throw new Error('YouTube API not initialized - missing API key');
    }
    
    try {
      this.logger.log(`Searching music videos for: "${query}"`);
      
      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        type: ['video'],
        maxResults,
        order: 'relevance',
        videoCategoryId: '10', // Music category
        safeSearch: 'moderate',
        videoDefinition: 'any',
        videoDuration: 'any', // short, medium, long
      });

      if (!response.data.items) {
        return [];
      }

      // Get detailed video information
      const videoIds = response.data.items
        .map(item => item.id?.videoId)
        .filter(Boolean) as string[];

      const videoDetails = await this.getMultipleVideoDetails(videoIds);
      
      return response.data.items.map(item => {
        const videoId = item.id?.videoId || '';
        const details = videoDetails.find(d => d.videoId === videoId);
        
        return {
          videoId,
          title: item.snippet?.title || '',
          channelTitle: item.snippet?.channelTitle || '',
          thumbnail: item.snippet?.thumbnails?.medium?.url || '',
          publishedAt: item.snippet?.publishedAt || '',
          duration: details?.duration || '',
        };
      }).filter(video => {
        // Filter out videos that are too short (likely not music videos)
        const durationSeconds = parseDurationToSeconds(video.duration);
        return durationSeconds >= 60; // At least 1 minute
      });
    } catch (error) {
      this.logger.error('Error searching music videos:', error);
      throw new Error('Failed to search music videos');
    }
  }
}