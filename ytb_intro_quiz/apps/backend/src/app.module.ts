import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QuizModule } from './websocket/quiz.module';
import { YoutubeModule } from './youtube/youtube.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    QuizModule,
    // YoutubeModule, // Temporarily disabled for debugging
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}