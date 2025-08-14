import { Module } from '@nestjs/common';
import { QuizGateway } from './quiz.gateway';
import { QuizService } from './quiz.service';
import { YoutubeModule } from '../youtube/youtube.module';

@Module({
  imports: [YoutubeModule],
  providers: [QuizGateway, QuizService],
  exports: [QuizService],
})
export class QuizModule {}