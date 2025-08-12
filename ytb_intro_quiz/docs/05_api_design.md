# API設計書

## 1. 概要

YouTube イントロクイズバトルシステムのRESTful API設計書です。OpenAPI 3.0仕様に準拠し、型安全性とドキュメント自動生成を実現します。

## 2. API設計原則

### 2.1 設計方針
- RESTful原則の遵守
- リソース指向設計
- 統一的なエラーハンドリング
- バージョニング戦略
- ページネーション対応
- Rate Limiting実装

### 2.2 URL構造
```
https://api.yiq.example.com/v1/{resource}/{id}/{sub-resource}
```

### 2.3 HTTPメソッド規約
| メソッド | 用途 | べき等性 | 安全性 |
|---------|------|---------|--------|
| GET | リソース取得 | Yes | Yes |
| POST | リソース作成 | No | No |
| PUT | リソース完全更新 | Yes | No |
| PATCH | リソース部分更新 | No | No |
| DELETE | リソース削除 | Yes | No |

## 3. 認証・認可

### 3.1 認証フロー
```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    
    oauth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://accounts.google.com/o/oauth2/v2/auth
          tokenUrl: https://oauth2.googleapis.com/token
          scopes:
            read: Read access
            write: Write access
```

### 3.2 JWT構造
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user123",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["player"],
    "iat": 1710486400,
    "exp": 1710490000
  }
}
```

## 4. エンドポイント詳細

### 4.1 認証エンドポイント

#### POST /v1/auth/register
**ユーザー登録**
```yaml
requestBody:
  content:
    application/json:
      schema:
        type: object
        required: [email, password, name]
        properties:
          email:
            type: string
            format: email
          password:
            type: string
            minLength: 8
          name:
            type: string
            maxLength: 100

responses:
  '201':
    description: User created successfully
    content:
      application/json:
        schema:
          type: object
          properties:
            user:
              $ref: '#/components/schemas/User'
            accessToken:
              type: string
            refreshToken:
              type: string
```

#### POST /v1/auth/login
**ログイン**
```yaml
requestBody:
  content:
    application/json:
      schema:
        type: object
        required: [email, password]
        properties:
          email:
            type: string
          password:
            type: string

responses:
  '200':
    description: Login successful
    content:
      application/json:
        schema:
          type: object
          properties:
            user:
              $ref: '#/components/schemas/User'
            accessToken:
              type: string
            refreshToken:
              type: string
```

#### POST /v1/auth/refresh
**トークンリフレッシュ**
```yaml
requestBody:
  content:
    application/json:
      schema:
        type: object
        required: [refreshToken]
        properties:
          refreshToken:
            type: string

responses:
  '200':
    description: Token refreshed
    content:
      application/json:
        schema:
          type: object
          properties:
            accessToken:
              type: string
            refreshToken:
              type: string
```

### 4.2 ユーザーエンドポイント

#### GET /v1/users/me
**現在のユーザー情報取得**
```yaml
security:
  - bearerAuth: []

responses:
  '200':
    description: User profile
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/UserProfile'
```

#### PATCH /v1/users/me
**プロフィール更新**
```yaml
security:
  - bearerAuth: []

requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          name:
            type: string
          avatar:
            type: string
            format: uri

responses:
  '200':
    description: Profile updated
```

### 4.3 ルームエンドポイント

#### POST /v1/rooms
**ルーム作成**
```yaml
security:
  - bearerAuth: []

requestBody:
  content:
    application/json:
      schema:
        type: object
        required: [name]
        properties:
          name:
            type: string
            maxLength: 100
          maxPlayers:
            type: integer
            minimum: 2
            maximum: 20
            default: 10
          isPrivate:
            type: boolean
            default: false
          settings:
            type: object
            properties:
              questionCount:
                type: integer
                default: 10
              timeLimit:
                type: integer
                default: 15
              difficulty:
                type: string
                enum: [easy, medium, hard]

responses:
  '201':
    description: Room created
    content:
      application/json:
        schema:
          type: object
          properties:
            room:
              $ref: '#/components/schemas/Room'
            sessionCode:
              type: string
              pattern: '^[A-Z0-9]{6}$'
```

#### GET /v1/rooms/{roomId}
**ルーム情報取得**
```yaml
parameters:
  - name: roomId
    in: path
    required: true
    schema:
      type: string

responses:
  '200':
    description: Room details
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/RoomDetails'
```

#### POST /v1/rooms/join
**ルーム参加**
```yaml
security:
  - bearerAuth: []

requestBody:
  content:
    application/json:
      schema:
        type: object
        required: [sessionCode]
        properties:
          sessionCode:
            type: string
            pattern: '^[A-Z0-9]{6}$'
          displayName:
            type: string

responses:
  '200':
    description: Joined room successfully
    content:
      application/json:
        schema:
          type: object
          properties:
            room:
              $ref: '#/components/schemas/Room'
            player:
              $ref: '#/components/schemas/Player'
```

#### GET /v1/rooms
**アクティブルーム一覧**
```yaml
parameters:
  - name: status
    in: query
    schema:
      type: string
      enum: [waiting, in_progress]
  - name: page
    in: query
    schema:
      type: integer
      default: 1
  - name: limit
    in: query
    schema:
      type: integer
      default: 20
      maximum: 100

responses:
  '200':
    description: List of rooms
    content:
      application/json:
        schema:
          type: object
          properties:
            data:
              type: array
              items:
                $ref: '#/components/schemas/Room'
            meta:
              type: object
              properties:
                total:
                  type: integer
                page:
                  type: integer
                limit:
                  type: integer
```

### 4.4 プレイリストエンドポイント

#### POST /v1/playlists
**プレイリスト作成**
```yaml
security:
  - bearerAuth: []

requestBody:
  content:
    application/json:
      schema:
        type: object
        required: [name, youtubePlaylistUrl]
        properties:
          name:
            type: string
          youtubePlaylistUrl:
            type: string
            format: uri
          isPublic:
            type: boolean
            default: false
          tags:
            type: array
            items:
              type: string

responses:
  '201':
    description: Playlist created
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Playlist'
```

#### GET /v1/playlists/{playlistId}/items
**プレイリストアイテム取得**
```yaml
parameters:
  - name: playlistId
    in: path
    required: true
    schema:
      type: string

responses:
  '200':
    description: Playlist items
    content:
      application/json:
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: string
              youtubeId:
                type: string
              title:
                type: string
              artist:
                type: string
              duration:
                type: integer
              thumbnail:
                type: string
```

### 4.5 ゲームエンドポイント

#### POST /v1/games/{roomId}/start
**ゲーム開始**
```yaml
security:
  - bearerAuth: []

parameters:
  - name: roomId
    in: path
    required: true
    schema:
      type: string

requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          playlistId:
            type: string
          shuffleQuestions:
            type: boolean
            default: true

responses:
  '200':
    description: Game started
    content:
      application/json:
        schema:
          type: object
          properties:
            gameSession:
              $ref: '#/components/schemas/GameSession'
```

#### GET /v1/games/{roomId}/current-question
**現在の問題取得**
```yaml
security:
  - bearerAuth: []

parameters:
  - name: roomId
    in: path
    required: true
    schema:
      type: string

responses:
  '200':
    description: Current question
    content:
      application/json:
        schema:
          type: object
          properties:
            question:
              type: object
              properties:
                id:
                  type: string
                roundNumber:
                  type: integer
                totalRounds:
                  type: integer
                youtubeId:
                  type: string
                startTime:
                  type: integer
                duration:
                  type: integer
```

#### POST /v1/games/{roomId}/answer
**解答送信**
```yaml
security:
  - bearerAuth: []

parameters:
  - name: roomId
    in: path
    required: true
    schema:
      type: string

requestBody:
  content:
    application/json:
      schema:
        type: object
        required: [answer]
        properties:
          answer:
            type: string
          buzzerTimestamp:
            type: integer

responses:
  '200':
    description: Answer submitted
    content:
      application/json:
        schema:
          type: object
          properties:
            isCorrect:
              type: boolean
            points:
              type: integer
            correctAnswer:
              type: string
```

### 4.6 スコアエンドポイント

#### GET /v1/scores/room/{roomId}
**ルーム内スコア取得**
```yaml
parameters:
  - name: roomId
    in: path
    required: true
    schema:
      type: string

responses:
  '200':
    description: Room scores
    content:
      application/json:
        schema:
          type: array
          items:
            type: object
            properties:
              playerId:
                type: string
              playerName:
                type: string
              score:
                type: integer
              correctAnswers:
                type: integer
              rank:
                type: integer
```

#### GET /v1/scores/leaderboard
**グローバルリーダーボード**
```yaml
parameters:
  - name: period
    in: query
    schema:
      type: string
      enum: [daily, weekly, monthly, all-time]
      default: daily
  - name: limit
    in: query
    schema:
      type: integer
      default: 100

responses:
  '200':
    description: Leaderboard
    content:
      application/json:
        schema:
          type: array
          items:
            type: object
            properties:
              rank:
                type: integer
              userId:
                type: string
              userName:
                type: string
              score:
                type: integer
              gamesPlayed:
                type: integer
```

## 5. スキーマ定義

### 5.1 User スキーマ
```yaml
User:
  type: object
  properties:
    id:
      type: string
    email:
      type: string
      format: email
    name:
      type: string
    avatar:
      type: string
      format: uri
    createdAt:
      type: string
      format: date-time
```

### 5.2 Room スキーマ
```yaml
Room:
  type: object
  properties:
    id:
      type: string
    code:
      type: string
    name:
      type: string
    hostId:
      type: string
    maxPlayers:
      type: integer
    currentPlayers:
      type: integer
    status:
      type: string
      enum: [waiting, in_progress, finished]
    settings:
      type: object
    createdAt:
      type: string
      format: date-time
```

### 5.3 Player スキーマ
```yaml
Player:
  type: object
  properties:
    id:
      type: string
    userId:
      type: string
    roomId:
      type: string
    displayName:
      type: string
    seatNumber:
      type: integer
    status:
      type: string
      enum: [active, disconnected, spectating]
    score:
      type: integer
```

## 6. エラーレスポンス

### 6.1 エラー形式
```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The requested room does not exist",
    "details": {
      "roomId": "abc123"
    },
    "timestamp": "2024-03-15T10:30:00Z",
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 6.2 エラーコード一覧
| HTTPステータス | エラーコード | 説明 |
|--------------|------------|------|
| 400 | INVALID_REQUEST | リクエストパラメータ不正 |
| 401 | UNAUTHORIZED | 認証失敗 |
| 403 | FORBIDDEN | アクセス権限なし |
| 404 | NOT_FOUND | リソースが存在しない |
| 409 | CONFLICT | リソースの競合 |
| 422 | VALIDATION_ERROR | バリデーションエラー |
| 429 | RATE_LIMIT_EXCEEDED | レート制限超過 |
| 500 | INTERNAL_ERROR | サーバー内部エラー |
| 503 | SERVICE_UNAVAILABLE | サービス利用不可 |

## 7. Rate Limiting

### 7.1 制限設定
```yaml
rateLimits:
  default:
    requests: 100
    window: 60 # seconds
  
  authenticated:
    requests: 1000
    window: 60
  
  endpoints:
    - path: /v1/auth/login
      requests: 5
      window: 300
    - path: /v1/rooms/join
      requests: 10
      window: 60
```

### 7.2 レスポンスヘッダー
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1710486400
```

## 8. ページネーション

### 8.1 クエリパラメータ
```yaml
parameters:
  page:
    type: integer
    default: 1
    minimum: 1
  limit:
    type: integer
    default: 20
    minimum: 1
    maximum: 100
  sort:
    type: string
    enum: [created_at, updated_at, name]
  order:
    type: string
    enum: [asc, desc]
    default: desc
```

### 8.2 レスポンス形式
```json
{
  "data": [...],
  "meta": {
    "total": 256,
    "page": 2,
    "limit": 20,
    "totalPages": 13
  },
  "links": {
    "first": "/v1/rooms?page=1&limit=20",
    "prev": "/v1/rooms?page=1&limit=20",
    "next": "/v1/rooms?page=3&limit=20",
    "last": "/v1/rooms?page=13&limit=20"
  }
}
```

## 9. バージョニング戦略

### 9.1 URLバージョニング
```
https://api.yiq.example.com/v1/...
https://api.yiq.example.com/v2/...
```

### 9.2 廃止予定通知
```http
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Deprecation: true
Link: <https://api.yiq.example.com/v2/docs>; rel="successor-version"
```

## 10. API テスト

### 10.1 テストケース例
```typescript
describe('Room API', () => {
  it('should create a new room', async () => {
    const response = await request(app)
      .post('/v1/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Room',
        maxPlayers: 10
      });
    
    expect(response.status).toBe(201);
    expect(response.body.room).toHaveProperty('code');
    expect(response.body.room.code).toMatch(/^[A-Z0-9]{6}$/);
  });
  
  it('should handle rate limiting', async () => {
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password' });
    }
    
    const response = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    expect(response.status).toBe(429);
  });
});
```

## 11. API ドキュメント

### 11.1 Swagger UI設定
```typescript
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'YouTube Intro Quiz API',
      version: '1.0.0',
      description: 'API for real-time quiz battle system',
    },
    servers: [
      {
        url: 'https://api.yiq.example.com/v1',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3000/v1',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};
```

### 11.2 Postmanコレクション
```json
{
  "info": {
    "name": "YouTube Intro Quiz API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{access_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://api.yiq.example.com/v1"
    }
  ]
}
```

## 12. まとめ

本API設計により、以下を実現：

1. **一貫性**: RESTful原則に基づく統一的なAPI
2. **型安全性**: OpenAPI仕様による型定義
3. **可用性**: Rate Limitingとエラーハンドリング
4. **拡張性**: バージョニング戦略による後方互換性