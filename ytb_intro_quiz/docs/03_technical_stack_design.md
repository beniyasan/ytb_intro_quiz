# 技術スタック詳細設計書

## 1. 概要

本書では、YouTube イントロクイズバトルシステムで使用する技術スタックの詳細と、各技術の選定理由、実装方針を定義します。

## 2. フロントエンド技術スタック

### 2.1 コアフレームワーク

#### Next.js 14 (App Router)
```json
{
  "package": "next",
  "version": "^14.0.0",
  "選定理由": [
    "SSR/SSGによるSEO最適化",
    "App Routerによる最新のルーティング機能",
    "React Server Componentsによるパフォーマンス向上",
    "Built-in最適化機能（画像、フォント、スクリプト）"
  ]
}
```

#### React 18
```json
{
  "package": "react",
  "version": "^18.2.0",
  "活用機能": [
    "Concurrent Features",
    "Suspense for Data Fetching",
    "Automatic Batching",
    "Transitions API"
  ]
}
```

### 2.2 状態管理

#### Zustand
```typescript
// store/gameStore.ts
interface GameState {
  roomId: string;
  players: Player[];
  currentQuestion: Question | null;
  scores: Score[];
  isHost: boolean;
  
  // Actions
  joinRoom: (roomId: string) => void;
  updateScores: (scores: Score[]) => void;
  submitAnswer: (answer: string) => void;
}
```

**選定理由:**
- 軽量（8KB）
- TypeScript完全対応
- Redux DevTools対応
- ボイラープレート最小

### 2.3 リアルタイム通信

#### Socket.io-client
```typescript
// lib/socket.ts
import { io, Socket } from 'socket.io-client';

interface ServerToClientEvents {
  playerJoined: (player: Player) => void;
  questionStart: (question: Question) => void;
  buzzerPressed: (playerId: string, timestamp: number) => void;
  answerResult: (result: AnswerResult) => void;
  gameEnd: (finalScores: Score[]) => void;
}

interface ClientToServerEvents {
  joinRoom: (roomCode: string, playerName: string) => void;
  pressBuzzer: () => void;
  submitAnswer: (answer: string) => void;
  startGame: () => void;
}
```

### 2.4 UIコンポーネント

#### Tailwind CSS + shadcn/ui
```typescript
// components/ui/buzzer-button.tsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BuzzerButton({ 
  onPress, 
  disabled, 
  pressed 
}: BuzzerButtonProps) {
  return (
    <Button
      size="lg"
      disabled={disabled}
      onClick={onPress}
      className={cn(
        "h-32 w-32 rounded-full transition-all",
        "bg-red-500 hover:bg-red-600",
        "active:scale-95",
        pressed && "animate-pulse bg-yellow-500"
      )}
    >
      PUSH!
    </Button>
  );
}
```

### 2.5 動画再生

#### YouTube IFrame Player API
```typescript
// hooks/useYouTubePlayer.ts
interface YouTubePlayerOptions {
  videoId: string;
  startSeconds?: number;
  endSeconds?: number;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
}

export function useYouTubePlayer(
  containerId: string,
  options: YouTubePlayerOptions
) {
  const [player, setPlayer] = useState<YT.Player | null>(null);
  
  useEffect(() => {
    const newPlayer = new YT.Player(containerId, {
      videoId: options.videoId,
      playerVars: {
        start: options.startSeconds,
        end: options.endSeconds,
        controls: 0,
        disablekb: 1,
        modestbranding: 1
      },
      events: {
        onReady: options.onReady,
        onStateChange: options.onStateChange
      }
    });
    
    setPlayer(newPlayer);
    return () => newPlayer.destroy();
  }, []);
  
  return player;
}
```

## 3. バックエンド技術スタック

### 3.1 コアフレームワーク

#### NestJS
```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // グローバルパイプ
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  // Swagger設定
  const config = new DocumentBuilder()
    .setTitle('YouTube Intro Quiz API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  await app.listen(3000);
}
```

**選定理由:**
- エンタープライズグレードのアーキテクチャ
- 依存性注入（DI）
- デコレータベースの開発
- マイクロサービス対応

### 3.2 WebSocket実装

#### Socket.io (NestJS Gateway)
```typescript
// gateways/game.gateway.ts
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  constructor(
    private gameService: GameService,
    private redisService: RedisService,
  ) {}
  
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: JoinRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    const room = await this.gameService.joinRoom(
      data.roomCode,
      data.playerName,
      client.id
    );
    
    client.join(room.id);
    
    // Redis Pub/Sub for multi-server sync
    await this.redisService.publish('room-update', {
      roomId: room.id,
      action: 'player-joined',
      data: room,
    });
    
    this.server.to(room.id).emit('playerJoined', room);
    return room;
  }
  
  @SubscribeMessage('pressBuzzer')
  async handleBuzzer(@ConnectedSocket() client: Socket) {
    const timestamp = Date.now();
    const playerId = client.id;
    
    // Redisでアトミックに早押し順位を決定
    const rank = await this.redisService.incrementAndGet(
      `buzzer:${client.data.roomId}:${client.data.questionId}`
    );
    
    if (rank === 1) {
      this.server.to(client.data.roomId).emit('buzzerWinner', {
        playerId,
        timestamp,
      });
    }
    
    return { rank, timestamp };
  }
}
```

### 3.3 認証・認可

#### JWT + Passport
```typescript
// auth/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }
  
  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

### 3.4 データベースORM

#### Prisma
```prisma
// prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  avatar    String?
  
  rooms     Room[]   @relation("HostRooms")
  scores    Score[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([email])
}

model Room {
  id           String   @id @default(cuid())
  code         String   @unique @db.VarChar(6)
  name         String
  hostId       String
  host         User     @relation("HostRooms", fields: [hostId], references: [id])
  maxPlayers   Int      @default(20)
  status       RoomStatus @default(WAITING)
  playlistUrl  String?
  
  players      Player[]
  questions    Question[]
  scores       Score[]
  
  createdAt    DateTime @default(now())
  endedAt      DateTime?
  
  @@index([code])
  @@index([status])
}

model Question {
  id           String   @id @default(cuid())
  roomId       String
  room         Room     @relation(fields: [roomId], references: [id])
  youtubeId    String
  title        String
  artist       String?
  startTime    Int      @default(0)
  duration     Int      @default(15)
  orderIndex   Int
  
  answers      Answer[]
  
  @@index([roomId])
}
```

## 4. インフラストラクチャ

### 4.1 データストア

#### PostgreSQL
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: youtube_quiz
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
```

#### Redis
```typescript
// config/redis.config.ts
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  
  // Pub/Sub用
  pubSubOptions: {
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  },
  
  // キャッシュ用
  cacheOptions: {
    ttl: 3600, // 1時間
    max: 100,  // 最大100エントリ
  },
};
```

### 4.2 メッセージキュー

#### RabbitMQ
```typescript
// config/rabbitmq.config.ts
export const rabbitMQConfig = {
  exchanges: [
    {
      name: 'game-events',
      type: 'topic',
    },
  ],
  uri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
  connectionInitOptions: {
    wait: false,
  },
  channels: {
    'game-channel': {
      prefetchCount: 10,
    },
  },
};
```

## 5. 開発ツール

### 5.1 パッケージ管理
- **pnpm**: 高速で効率的なパッケージ管理

### 5.2 コード品質
```json
{
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.45.0",
    "prettier": "^3.0.0",
    "husky": "^8.0.0",
    "lint-staged": "^14.0.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0",
    "supertest": "^6.3.0"
  }
}
```

### 5.3 Git Hooks設定
```json
// .husky/pre-commit
{
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write",
    "jest --bail --findRelatedTests"
  ]
}
```

## 6. 外部API統合

### 6.1 YouTube Data API v3
```typescript
// services/youtube.service.ts
import { google } from 'googleapis';

@Injectable()
export class YouTubeService {
  private youtube;
  
  constructor(private configService: ConfigService) {
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.configService.get('YOUTUBE_API_KEY'),
    });
  }
  
  async getPlaylistItems(playlistId: string) {
    const response = await this.youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId,
      maxResults: 50,
    });
    
    return response.data.items.map(item => ({
      videoId: item.contentDetails.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      duration: await this.getVideoDuration(item.contentDetails.videoId),
    }));
  }
  
  private async getVideoDuration(videoId: string) {
    const response = await this.youtube.videos.list({
      part: ['contentDetails'],
      id: [videoId],
    });
    
    return this.parseDuration(response.data.items[0].contentDetails.duration);
  }
}
```

## 7. モニタリング・ロギング

### 7.1 ロギング
```typescript
// config/winston.config.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'combined.log' 
    }),
  ],
});
```

### 7.2 メトリクス収集
```typescript
// config/prometheus.config.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

export const prometheusConfig = PrometheusModule.register({
  defaultMetrics: {
    enabled: true,
  },
  customMetrics: [
    {
      name: 'game_active_rooms',
      help: 'Number of active game rooms',
      type: 'gauge',
    },
    {
      name: 'buzzer_press_latency',
      help: 'Buzzer press latency in milliseconds',
      type: 'histogram',
      buckets: [10, 25, 50, 100, 250, 500, 1000],
    },
  ],
});
```

## 8. 技術選定マトリクス

| カテゴリ | 技術 | 成熟度 | 学習曲線 | パフォーマンス | 保守性 |
|---------|------|--------|----------|--------------|--------|
| フロントエンド | Next.js 14 | ★★★★★ | ★★★☆☆ | ★★★★★ | ★★★★★ |
| 状態管理 | Zustand | ★★★★☆ | ★★★★★ | ★★★★★ | ★★★★☆ |
| バックエンド | NestJS | ★★★★★ | ★★☆☆☆ | ★★★★☆ | ★★★★★ |
| リアルタイム | Socket.io | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★★☆ |
| データベース | PostgreSQL | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★★★ |
| キャッシュ | Redis | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★★☆ |

## 9. パフォーマンス最適化戦略

### 9.1 フロントエンド最適化
- Code Splitting with dynamic imports
- Image optimization with Next.js Image
- Font optimization
- Critical CSS inlining
- Service Worker for offline support

### 9.2 バックエンド最適化
- Database connection pooling
- Query optimization with indexes
- Redis caching strategy
- Horizontal scaling with PM2/Kubernetes
- CDN for static assets

## 10. まとめ

選定した技術スタックにより、以下の利点を実現：

1. **開発効率**: TypeScript統一、充実したツールチェーン
2. **パフォーマンス**: 最適化された各技術の組み合わせ
3. **保守性**: 型安全性、テスト容易性、明確な責務分離
4. **拡張性**: マイクロサービス対応、水平スケーリング可能