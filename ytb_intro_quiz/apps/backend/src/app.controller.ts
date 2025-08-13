import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      message: 'YTB Quiz Backend API is running',
      timestamp: new Date().toISOString(),
      service: 'ytb-quiz-backend',
      version: '0.1.0',
    };
  }
}