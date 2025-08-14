import { Module } from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { YoutubeQuizService } from './youtube-quiz.service';

@Module({
  providers: [YoutubeService, YoutubeQuizService],
  exports: [YoutubeService, YoutubeQuizService],
})
export class YoutubeModule {}