import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'YTB Quiz Backend API - NestJS Application';
  }
}