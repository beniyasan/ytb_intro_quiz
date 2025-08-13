import { Module } from '@nestjs/common';
import { QuizGateway } from './quiz.gateway';
import { QuizService } from './quiz.service';

@Module({
  providers: [QuizGateway, QuizService],
  exports: [QuizService],
})
export class QuizModule {}