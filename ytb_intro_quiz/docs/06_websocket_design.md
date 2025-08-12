# WebSocket通信設計書

## 1. 概要

YouTube イントロクイズバトルシステムにおけるリアルタイム通信の設計書です。Socket.ioを使用した双方向通信により、低遅延な早押し機能とリアルタイムゲーム進行を実現します。

## 2. WebSocket アーキテクチャ

### 2.1 システム構成

```
┌──────────────────────────────────────────────┐
│              Client Layer                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Host    │  │  Player  │  │ Spectator│  │
│  │  Client  │  │  Client  │  │  Client  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
└───────┼──────────────┼──────────────┼────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
           ┌───────────┴───────────┐
           │    Load Balancer      │
           │   (Sticky Session)    │
           └───────────┬───────────┘
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
┌───┴────┐      ┌──────┴──────┐    ┌──────┴──────┐
│ WS     │      │    WS       │    │    WS       │
│ Server │      │   Server    │    │   Server    │
│   #1   │      │     #2      │    │     #3      │
└───┬────┘      └──────┬──────┘    └──────┬──────┘
    │                  │                  │
    └──────────────────┼──────────────────┘
                       │
           ┌───────────┴───────────┐
           │   Redis Pub/Sub       │
           │  (Server間同期)        │
           └───────────────────────┘
```

### 2.2 接続管理戦略

#### Namespace設計
```typescript
// Namespace定義
const namespaces = {
  '/game': 'ゲームプレイ用',
  '/lobby': 'ロビー・待機室用',
  '/admin': '管理者用',
  '/spectator': '観戦者用'
};
```

#### Room管理
```typescript
interface RoomStructure {
  roomId: string;          // ルーム識別子
  hostSocketId: string;    // ホストのソケットID
  players: Map<string, Player>; // プレイヤーマップ
  gameState: GameState;    // ゲーム状態
  settings: RoomSettings;  // ルーム設定
}
```

## 3. イベント設計

### 3.1 イベント命名規則
```
{actor}:{action}:{target}

例：
- player:join:room
- host:start:game
- system:update:scores
```

### 3.2 クライアント→サーバー イベント

#### 認証・接続
```typescript
// 接続時認証
interface AuthenticateEvent {
  event: 'authenticate';
  data: {
    token: string;
  };
  callback: (response: {
    success: boolean;
    userId?: string;
    error?: string;
  }) => void;
}

// 再接続
interface ReconnectEvent {
  event: 'reconnect';
  data: {
    roomId: string;
    playerId: string;
  };
}
```

#### ルーム管理
```typescript
// ルーム作成
interface CreateRoomEvent {
  event: 'room:create';
  data: {
    name: string;
    maxPlayers: number;
    settings: {
      questionCount: number;
      timeLimit: number;
      difficulty: 'easy' | 'medium' | 'hard';
    };
  };
  callback: (response: {
    roomId: string;
    sessionCode: string;
  }) => void;
}

// ルーム参加
interface JoinRoomEvent {
  event: 'room:join';
  data: {
    sessionCode: string;
    displayName: string;
  };
  callback: (response: {
    success: boolean;
    room?: RoomInfo;
    error?: string;
  }) => void;
}

// ルーム退出
interface LeaveRoomEvent {
  event: 'room:leave';
  data: {
    roomId: string;
  };
}
```

#### ゲームプレイ
```typescript
// ゲーム開始（ホストのみ）
interface StartGameEvent {
  event: 'game:start';
  data: {
    roomId: string;
    playlistId: string;
  };
}

// 早押しボタン
interface BuzzerPressEvent {
  event: 'buzzer:press';
  data: {
    timestamp: number;  // クライアント側タイムスタンプ
  };
  callback: (response: {
    rank: number;      // 早押し順位
    serverTimestamp: number;
  }) => void;
}

// 解答送信
interface SubmitAnswerEvent {
  event: 'answer:submit';
  data: {
    answer: string;
    questionId: string;
  };
  callback: (response: {
    isCorrect: boolean;
    points: number;
    correctAnswer?: string;
  }) => void;
}

// 次の問題へ（ホストのみ）
interface NextQuestionEvent {
  event: 'game:nextQuestion';
  data: {
    roomId: string;
  };
}
```

#### チャット・リアクション
```typescript
// チャットメッセージ
interface ChatMessageEvent {
  event: 'chat:message';
  data: {
    message: string;
    roomId: string;
  };
}

// リアクション
interface ReactionEvent {
  event: 'reaction:send';
  data: {
    type: 'like' | 'love' | 'wow' | 'sad' | 'angry';
    targetId?: string;  // 対象（プレイヤーIDなど）
  };
}
```

### 3.3 サーバー→クライアント イベント

#### 接続状態
```typescript
// 接続成功
interface ConnectedEvent {
  event: 'connected';
  data: {
    socketId: string;
    userId: string;
  };
}

// エラー通知
interface ErrorEvent {
  event: 'error';
  data: {
    code: string;
    message: string;
    details?: any;
  };
}
```

#### ルーム状態更新
```typescript
// プレイヤー参加通知
interface PlayerJoinedEvent {
  event: 'room:playerJoined';
  data: {
    player: {
      id: string;
      displayName: string;
      avatar?: string;
    };
    currentPlayers: number;
  };
}

// プレイヤー退出通知
interface PlayerLeftEvent {
  event: 'room:playerLeft';
  data: {
    playerId: string;
    reason: 'leave' | 'disconnect' | 'kick';
  };
}

// ルーム状態更新
interface RoomUpdateEvent {
  event: 'room:update';
  data: {
    status: 'waiting' | 'starting' | 'in_progress' | 'finished';
    players: Player[];
    settings: RoomSettings;
  };
}
```

#### ゲーム進行
```typescript
// ゲーム開始通知
interface GameStartedEvent {
  event: 'game:started';
  data: {
    totalQuestions: number;
    firstQuestion: {
      roundNumber: 1;
      youtubeId: string;
    };
  };
}

// 問題開始
interface QuestionStartEvent {
  event: 'question:start';
  data: {
    questionId: string;
    roundNumber: number;
    totalRounds: number;
    youtubeId: string;
    startTime: number;
    duration: number;
    category?: string;
  };
}

// カウントダウン
interface CountdownEvent {
  event: 'game:countdown';
  data: {
    count: number;  // 3, 2, 1, 0
  };
}

// 早押し勝者通知
interface BuzzerWinnerEvent {
  event: 'buzzer:winner';
  data: {
    winnerId: string;
    winnerName: string;
    timestamp: number;
    timeFromStart: number; // 問題開始からの経過時間
  };
}

// 解答結果通知
interface AnswerResultEvent {
  event: 'answer:result';
  data: {
    playerId: string;
    playerName: string;
    isCorrect: boolean;
    answer: string;
    correctAnswer: string;
    points: number;
  };
}

// スコア更新
interface ScoreUpdateEvent {
  event: 'score:update';
  data: {
    scores: Array<{
      playerId: string;
      playerName: string;
      score: number;
      rank: number;
      correctAnswers: number;
    }>;
  };
}

// ゲーム終了
interface GameEndedEvent {
  event: 'game:ended';
  data: {
    finalScores: Score[];
    winner: {
      playerId: string;
      playerName: string;
      score: number;
    };
    statistics: {
      totalQuestions: number;
      averageResponseTime: number;
      fastestBuzzer: {
        playerId: string;
        time: number;
      };
    };
  };
}
```

## 4. 早押し判定ロジック

### 4.1 タイムスタンプ同期
```typescript
// クライアント側時刻同期
class TimeSyncService {
  private offset: number = 0;
  
  async syncTime(socket: Socket): Promise<void> {
    const samples: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      const t0 = Date.now();
      const serverTime = await this.getServerTime(socket);
      const t1 = Date.now();
      const rtt = t1 - t0;
      const offset = serverTime - (t0 + rtt / 2);
      samples.push(offset);
    }
    
    // 中央値を採用
    samples.sort((a, b) => a - b);
    this.offset = samples[Math.floor(samples.length / 2)];
  }
  
  getServerTime(): number {
    return Date.now() + this.offset;
  }
}
```

### 4.2 早押し判定アルゴリズム
```typescript
// サーバー側早押し判定
class BuzzerService {
  async handleBuzzerPress(
    roomId: string,
    playerId: string,
    clientTimestamp: number
  ): Promise<BuzzerResult> {
    const key = `buzzer:${roomId}:${this.currentQuestionId}`;
    
    // Redisでアトミックに順位決定
    const rank = await this.redis.zadd(
      key,
      'NX',  // 既存エントリーは更新しない
      clientTimestamp,
      playerId
    );
    
    if (rank === 1) {
      // 最初の早押し
      await this.lockBuzzer(roomId);
      this.io.to(roomId).emit('buzzer:winner', {
        winnerId: playerId,
        timestamp: Date.now()
      });
    }
    
    return {
      rank,
      serverTimestamp: Date.now(),
      isWinner: rank === 1
    };
  }
}
```

## 5. 接続管理と障害対策

### 5.1 接続状態管理
```typescript
enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

class ConnectionManager {
  private state: ConnectionState;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  
  constructor(private socket: Socket) {
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    this.socket.on('connect', () => {
      this.state = ConnectionState.CONNECTED;
      this.reconnectAttempts = 0;
      this.onConnected();
    });
    
    this.socket.on('disconnect', (reason) => {
      this.state = ConnectionState.DISCONNECTED;
      this.handleDisconnect(reason);
    });
    
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.state = ConnectionState.RECONNECTING;
      this.reconnectAttempts = attemptNumber;
    });
    
    this.socket.on('reconnect_failed', () => {
      this.state = ConnectionState.ERROR;
      this.handleReconnectFailed();
    });
  }
  
  private handleDisconnect(reason: string): void {
    if (reason === 'io server disconnect') {
      // サーバー側から切断された
      console.error('Server disconnected the client');
    } else if (reason === 'transport close') {
      // ネットワーク切断
      this.attemptReconnect();
    }
  }
}
```

### 5.2 再接続処理
```typescript
class ReconnectionService {
  private roomState: RoomState;
  private playerState: PlayerState;
  
  async handleReconnection(socket: Socket): Promise<void> {
    // セッション情報の復元
    const sessionData = this.getStoredSession();
    
    if (sessionData) {
      socket.emit('session:restore', sessionData, (response) => {
        if (response.success) {
          this.restoreGameState(response.gameState);
          this.restorePlayerState(response.playerState);
        } else {
          this.handleSessionExpired();
        }
      });
    }
  }
  
  private restoreGameState(state: GameState): void {
    // ゲーム状態の復元
    this.roomState = state.room;
    // UIの更新
    this.updateUI(state);
  }
}
```

## 6. スケーリング戦略

### 6.1 Redis Adapter設定
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ 
  host: 'redis-primary',
  port: 6379 
});

const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### 6.2 Sticky Session設定
```nginx
upstream websocket_backend {
    ip_hash;  # Sticky session
    server ws-server-1:3000;
    server ws-server-2:3000;
    server ws-server-3:3000;
}

server {
    location /socket.io/ {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 6.3 水平スケーリング対応
```typescript
// クロスサーバー通信
class CrossServerCommunication {
  constructor(
    private io: Server,
    private redis: RedisClient
  ) {
    this.setupSubscriptions();
  }
  
  private setupSubscriptions(): void {
    // 他サーバーからのイベントを購読
    this.redis.subscribe('game-events');
    
    this.redis.on('message', (channel, message) => {
      const event = JSON.parse(message);
      this.handleCrossServerEvent(event);
    });
  }
  
  broadcastToAllServers(event: GameEvent): void {
    // 全サーバーにイベントを配信
    this.redis.publish('game-events', JSON.stringify(event));
  }
}
```

## 7. パフォーマンス最適化

### 7.1 メッセージ圧縮
```typescript
const io = new Server(server, {
  perMessageDeflate: {
    threshold: 1024,  // 1KB以上のメッセージを圧縮
    zlibDeflateOptions: {
      level: 1  // 圧縮レベル
    }
  }
});
```

### 7.2 バッチング処理
```typescript
class MessageBatcher {
  private queue: Message[] = [];
  private timer: NodeJS.Timeout | null = null;
  
  add(message: Message): void {
    this.queue.push(message);
    
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), 50);
    }
  }
  
  private flush(): void {
    if (this.queue.length > 0) {
      this.socket.emit('batch:messages', this.queue);
      this.queue = [];
    }
    this.timer = null;
  }
}
```

### 7.3 メモリ管理
```typescript
// 不要な接続のクリーンアップ
class ConnectionCleaner {
  private readonly IDLE_TIMEOUT = 30 * 60 * 1000; // 30分
  
  startCleanupTask(): void {
    setInterval(() => {
      this.cleanupIdleConnections();
    }, 60 * 1000); // 1分ごと
  }
  
  private cleanupIdleConnections(): void {
    const now = Date.now();
    
    for (const [socketId, lastActivity] of this.activityMap) {
      if (now - lastActivity > this.IDLE_TIMEOUT) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
        this.activityMap.delete(socketId);
      }
    }
  }
}
```

## 8. セキュリティ対策

### 8.1 認証・認可
```typescript
// JWT認証ミドルウェア
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = decoded.sub;
    socket.data.roles = decoded.roles;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});
```

### 8.2 Rate Limiting
```typescript
class RateLimiter {
  private attempts = new Map<string, number[]>();
  
  check(socketId: string, event: string): boolean {
    const key = `${socketId}:${event}`;
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // 1分以内の試行のみ保持
    const recentAttempts = attempts.filter(
      time => now - time < 60000
    );
    
    if (recentAttempts.length >= 100) {
      return false; // レート制限
    }
    
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }
}
```

### 8.3 入力検証
```typescript
// イベントデータの検証
import { z } from 'zod';

const BuzzerPressSchema = z.object({
  timestamp: z.number().min(0).max(Date.now() + 1000)
});

socket.on('buzzer:press', (data, callback) => {
  try {
    const validated = BuzzerPressSchema.parse(data);
    // 処理続行
  } catch (error) {
    callback({ error: 'Invalid data' });
  }
});
```

## 9. モニタリング

### 9.1 メトリクス収集
```typescript
interface WebSocketMetrics {
  connectionsTotal: number;
  activeConnections: number;
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
}

class MetricsCollector {
  collect(): WebSocketMetrics {
    return {
      connectionsTotal: this.io.engine.clientsCount,
      activeConnections: this.io.sockets.sockets.size,
      messagesPerSecond: this.calculateMessageRate(),
      averageLatency: this.calculateAverageLatency(),
      errorRate: this.calculateErrorRate()
    };
  }
}
```

### 9.2 ログ設計
```typescript
// 構造化ログ
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'websocket.log' 
    })
  ]
});

io.on('connection', (socket) => {
  logger.info('New connection', {
    socketId: socket.id,
    userId: socket.data.userId,
    ip: socket.handshake.address,
    timestamp: new Date().toISOString()
  });
});
```

## 10. テスト戦略

### 10.1 単体テスト
```typescript
describe('WebSocket Events', () => {
  let clientSocket: Socket;
  let serverSocket: Socket;
  
  beforeEach((done) => {
    server.listen(() => {
      const port = (server.address() as any).port;
      clientSocket = io(`http://localhost:${port}`, {
        auth: { token: validToken }
      });
      
      server.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
  });
  
  it('should handle buzzer press', (done) => {
    clientSocket.emit('buzzer:press', 
      { timestamp: Date.now() },
      (response) => {
        expect(response.rank).toBe(1);
        done();
      }
    );
  });
});
```

### 10.2 負荷テスト
```javascript
// Artillery.io設定
config:
  target: "ws://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 100
  processor: "./processor.js"

scenarios:
  - name: "Game Play"
    engine: "socketio"
    flow:
      - emit:
          channel: "room:join"
          data:
            sessionCode: "ABC123"
      - think: 5
      - loop:
        - emit:
            channel: "buzzer:press"
            data:
              timestamp: "{{ $timestamp() }}"
        - think: 2
        count: 10
```

## 11. まとめ

本WebSocket通信設計により、以下を実現：

1. **低遅延**: 最適化された早押し判定ロジック
2. **高可用性**: 再接続・障害復旧メカニズム
3. **スケーラビリティ**: 水平スケーリング対応
4. **セキュリティ**: 認証・入力検証・レート制限