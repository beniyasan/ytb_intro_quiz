# セキュリティ設計書

## 1. 概要

YouTube イントロクイズバトルシステムのセキュリティ設計書です。OWASP Top 10に基づく脅威分析と対策を実施し、安全なシステムを構築します。

## 2. セキュリティ原則

### 2.1 基本原則
- **Defense in Depth**: 多層防御の実装
- **Least Privilege**: 最小権限の原則
- **Zero Trust**: ゼロトラストアーキテクチャ
- **Secure by Default**: デフォルトセキュア設定
- **Fail Secure**: 安全側に倒れる設計

### 2.2 コンプライアンス要件
- 個人情報保護法準拠
- GDPR対応（EU圏ユーザー向け）
- PCI DSS（決済機能追加時）
- ISO 27001/27017準拠

## 3. 脅威分析（STRIDE）

### 3.1 脅威マトリクス

| 脅威カテゴリ | 説明 | リスクレベル | 対策 |
|------------|------|------------|------|
| **Spoofing** (なりすまし) | 他ユーザーへのなりすまし | 高 | JWT認証、MFA |
| **Tampering** (改ざん) | データの不正な変更 | 高 | 入力検証、HMAC |
| **Repudiation** (否認) | 行動の否認 | 中 | 監査ログ、署名 |
| **Information Disclosure** (情報漏洩) | 機密情報の露出 | 高 | 暗号化、アクセス制御 |
| **Denial of Service** (DoS) | サービス妨害 | 中 | Rate Limiting、DDoS対策 |
| **Elevation of Privilege** (権限昇格) | 不正な権限取得 | 高 | RBAC、最小権限 |

## 4. 認証・認可

### 4.1 認証フロー

#### JWT実装
```typescript
// JWT生成
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

interface TokenPayload {
  sub: string;  // User ID
  email: string;
  roles: string[];
  sessionId: string;
  iat: number;
  exp: number;
}

class AuthService {
  private readonly accessTokenSecret = process.env.JWT_ACCESS_SECRET!;
  private readonly refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;
  
  generateTokens(user: User): TokenPair {
    const sessionId = randomBytes(32).toString('hex');
    
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        roles: user.roles,
        sessionId,
      },
      this.accessTokenSecret,
      {
        expiresIn: '15m',
        issuer: 'yiq-api',
        audience: 'yiq-client',
      }
    );
    
    const refreshToken = jwt.sign(
      {
        sub: user.id,
        sessionId,
      },
      this.refreshTokenSecret,
      {
        expiresIn: '7d',
      }
    );
    
    // RefreshトークンをDBに保存（セキュアストレージ）
    this.storeRefreshToken(user.id, refreshToken, sessionId);
    
    return { accessToken, refreshToken };
  }
  
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'yiq-api',
        audience: 'yiq-client',
      }) as TokenPayload;
      
      // セッション検証
      const isValidSession = await this.validateSession(payload.sessionId);
      if (!isValidSession) {
        throw new UnauthorizedException('Invalid session');
      }
      
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

#### パスワード管理
```typescript
import bcrypt from 'bcrypt';
import { z } from 'zod';

// パスワードポリシー
const PasswordSchema = z.string()
  .min(8, 'パスワードは8文字以上必要です')
  .regex(/[A-Z]/, '大文字を含む必要があります')
  .regex(/[a-z]/, '小文字を含む必要があります')
  .regex(/[0-9]/, '数字を含む必要があります')
  .regex(/[^A-Za-z0-9]/, '特殊文字を含む必要があります');

class PasswordService {
  private readonly saltRounds = 12;
  
  async hashPassword(password: string): Promise<string> {
    // パスワード検証
    PasswordSchema.parse(password);
    
    // ハッシュ化
    return bcrypt.hash(password, this.saltRounds);
  }
  
  async verifyPassword(
    password: string, 
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  // パスワード履歴チェック
  async checkPasswordHistory(
    userId: string, 
    newPassword: string
  ): Promise<boolean> {
    const history = await this.getPasswordHistory(userId, 5);
    
    for (const oldHash of history) {
      if (await bcrypt.compare(newPassword, oldHash)) {
        throw new Error('過去5回以内に使用されたパスワードは使用できません');
      }
    }
    
    return true;
  }
}
```

### 4.2 認可（RBAC）

```typescript
// ロールベースアクセス制御
enum Role {
  ADMIN = 'admin',
  HOST = 'host',
  PLAYER = 'player',
  SPECTATOR = 'spectator'
}

enum Permission {
  CREATE_ROOM = 'room:create',
  DELETE_ROOM = 'room:delete',
  START_GAME = 'game:start',
  SUBMIT_ANSWER = 'answer:submit',
  VIEW_STATISTICS = 'statistics:view'
}

const RolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.CREATE_ROOM,
    Permission.DELETE_ROOM,
    Permission.START_GAME,
    Permission.SUBMIT_ANSWER,
    Permission.VIEW_STATISTICS
  ],
  [Role.HOST]: [
    Permission.CREATE_ROOM,
    Permission.START_GAME,
    Permission.VIEW_STATISTICS
  ],
  [Role.PLAYER]: [
    Permission.SUBMIT_ANSWER
  ],
  [Role.SPECTATOR]: []
};

// 認可デコレータ
function Authorize(...permissions: Permission[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const user = args[0].user;
      
      const hasPermission = permissions.every(permission =>
        RolePermissions[user.role]?.includes(permission)
      );
      
      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }
      
      return originalMethod.apply(this, args);
    };
  };
}
```

### 4.3 多要素認証（MFA）

```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

class MFAService {
  // TOTP設定
  async setupTOTP(userId: string): Promise<TOTPSetup> {
    const secret = speakeasy.generateSecret({
      name: `YIQ (${userId})`,
      issuer: 'YouTube Intro Quiz',
      length: 32
    });
    
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
    
    // シークレットを暗号化して保存
    await this.storeTOTPSecret(userId, this.encrypt(secret.base32));
    
    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes: this.generateBackupCodes()
    };
  }
  
  // TOTP検証
  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const encryptedSecret = await this.getTOTPSecret(userId);
    const secret = this.decrypt(encryptedSecret);
    
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2  // 前後2つの時間窓を許容
    });
  }
}
```

## 5. データ保護

### 5.1 暗号化

#### 保存時暗号化
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  
  encrypt(text: string): EncryptedData {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(data: EncryptedData): string {
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(data.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

#### 転送時暗号化
```nginx
# SSL/TLS設定
server {
    listen 443 ssl http2;
    server_name api.yiq.example.com;
    
    # SSL証明書
    ssl_certificate /etc/ssl/certs/yiq.crt;
    ssl_certificate_key /etc/ssl/private/yiq.key;
    
    # TLS 1.2以上のみ許可
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # 強力な暗号スイートのみ使用
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### 5.2 個人情報保護

```typescript
// PII (個人識別情報) マスキング
class PIIMaskingService {
  maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    const maskedLocal = local.substring(0, 2) + '****';
    return `${maskedLocal}@${domain}`;
  }
  
  maskName(name: string): string {
    if (name.length <= 2) return '**';
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
  }
  
  // ログ出力時の自動マスキング
  sanitizeForLogging(data: any): any {
    const sensitiveFields = ['password', 'email', 'token', 'creditCard'];
    
    return JSON.parse(JSON.stringify(data, (key, value) => {
      if (sensitiveFields.includes(key)) {
        return '***REDACTED***';
      }
      return value;
    }));
  }
}
```

## 6. 入力検証とサニタイゼーション

### 6.1 入力検証

```typescript
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// バリデーションスキーマ
const CreateRoomSchema = z.object({
  name: z.string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9\s\-_]+$/, '使用できない文字が含まれています'),
  maxPlayers: z.number()
    .int()
    .min(2)
    .max(20),
  playlistUrl: z.string()
    .url()
    .regex(/^https:\/\/(www\.)?youtube\.com\//, 'YouTube URLのみ許可'),
  settings: z.object({
    questionCount: z.number().int().min(5).max(50),
    timeLimit: z.number().int().min(5).max(60),
    difficulty: z.enum(['easy', 'medium', 'hard'])
  })
});

// SQLインジェクション対策
class QueryBuilder {
  // パラメータ化クエリの使用
  async findUser(email: string): Promise<User> {
    return this.prisma.user.findUnique({
      where: { email }  // Prismaが自動的にエスケープ
    });
  }
  
  // 生SQLを使用する場合
  async customQuery(userId: string): Promise<any> {
    return this.prisma.$queryRaw`
      SELECT * FROM users 
      WHERE id = ${userId}  -- パラメータ化
    `;
  }
}

// XSS対策
class SanitizationService {
  sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
      ALLOWED_ATTR: ['href']
    });
  }
  
  sanitizeUserInput(input: string): string {
    // HTMLエンティティエスケープ
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}
```

### 6.2 ファイルアップロード検証

```typescript
import fileType from 'file-type';
import sharp from 'sharp';

class FileUploadService {
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  
  async validateAndProcessImage(
    file: Express.Multer.File
  ): Promise<ProcessedImage> {
    // ファイルサイズチェック
    if (file.size > this.maxFileSize) {
      throw new Error('File size exceeds 5MB');
    }
    
    // MIMEタイプ検証（マジックナンバー）
    const type = await fileType.fromBuffer(file.buffer);
    if (!type || !this.allowedMimeTypes.includes(type.mime)) {
      throw new Error('Invalid file type');
    }
    
    // 画像処理とメタデータ削除
    const processedImage = await sharp(file.buffer)
      .resize(800, 800, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .rotate() // EXIF orientationに基づく自動回転
      .removeMetadata() // メタデータ削除
      .webp({ quality: 80 })
      .toBuffer();
    
    return {
      buffer: processedImage,
      mimeType: 'image/webp',
      size: processedImage.length
    };
  }
}
```

## 7. セッション管理

### 7.1 セッションセキュリティ

```typescript
import session from 'express-session';
import RedisStore from 'connect-redis';

// セッション設定
app.use(session({
  store: new RedisStore({ 
    client: redisClient,
    prefix: 'session:',
    ttl: 3600 // 1時間
  }),
  secret: process.env.SESSION_SECRET!,
  name: 'yiq.sid',
  resave: false,
  saveUninitialized: false,
  rolling: true, // アクティビティでセッション更新
  cookie: {
    secure: true, // HTTPS必須
    httpOnly: true, // XSS対策
    sameSite: 'strict', // CSRF対策
    maxAge: 1000 * 60 * 60, // 1時間
    domain: '.yiq.example.com'
  }
}));

// セッション固定攻撃対策
class SessionManager {
  regenerateSession(req: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  
  // ログイン後のセッション再生成
  async handleLogin(req: Request, user: User): Promise<void> {
    await this.regenerateSession(req);
    req.session.userId = user.id;
    req.session.loginTime = Date.now();
  }
}
```

## 8. API セキュリティ

### 8.1 Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// グローバルレート制限
const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:global:'
  }),
  windowMs: 60 * 1000, // 1分
  max: 100, // 最大100リクエスト
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false
});

// エンドポイント別制限
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回
  skipSuccessfulRequests: true // 成功時はカウントしない
});

// DDoS対策
const ddosProtection = {
  burst: 10,
  rate: 0.1, // 10秒に1リクエスト
  maxCount: 100,
  whiteList: ['127.0.0.1'],
  onDenial: (req: Request) => {
    logger.warn('DDoS attack detected', {
      ip: req.ip,
      path: req.path
    });
  }
};
```

### 8.2 CORS設定

```typescript
import cors from 'cors';

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://yiq.example.com',
      'https://app.yiq.example.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400 // 24時間
};

app.use(cors(corsOptions));
```

## 9. 監査とロギング

### 9.1 監査ログ

```typescript
interface AuditLog {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  metadata: Record<string, any>;
  ip: string;
  userAgent: string;
}

class AuditService {
  async log(entry: AuditLog): Promise<void> {
    // 監査ログの保存（改ざん防止）
    const hash = this.calculateHash(entry);
    
    await this.prisma.auditLog.create({
      data: {
        ...entry,
        hash,
        previousHash: await this.getLastHash()
      }
    });
    
    // 重要イベントの通知
    if (this.isCriticalEvent(entry.action)) {
      await this.notifySecurityTeam(entry);
    }
  }
  
  private calculateHash(entry: AuditLog): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(entry))
      .digest('hex');
  }
}
```

### 9.2 セキュリティモニタリング

```typescript
// 異常検知
class SecurityMonitor {
  async detectAnomalies(userId: string): Promise<void> {
    const recentActivity = await this.getRecentActivity(userId);
    
    // 異常なログイン試行
    if (recentActivity.failedLogins > 5) {
      await this.lockAccount(userId);
      await this.notifyUser(userId, 'Suspicious login attempts detected');
    }
    
    // 異常なAPIアクセスパターン
    if (recentActivity.apiCallsPerMinute > 50) {
      await this.flagSuspiciousActivity(userId);
    }
    
    // 地理的異常
    if (await this.detectGeographicAnomaly(userId)) {
      await this.requireMFA(userId);
    }
  }
}
```

## 10. インシデント対応

### 10.1 インシデント対応計画

```yaml
incident_response:
  phases:
    1_detection:
      - automated_monitoring
      - user_reports
      - security_alerts
    
    2_containment:
      - isolate_affected_systems
      - disable_compromised_accounts
      - block_malicious_ips
    
    3_investigation:
      - collect_logs
      - analyze_attack_vectors
      - identify_impact
    
    4_recovery:
      - patch_vulnerabilities
      - restore_services
      - reset_credentials
    
    5_lessons_learned:
      - post_mortem_analysis
      - update_security_measures
      - improve_monitoring
```

### 10.2 データ漏洩対応

```typescript
class DataBreachResponse {
  async handleDataBreach(breach: DataBreach): Promise<void> {
    // 1. 即座の対応
    await this.containBreach(breach);
    
    // 2. 影響範囲の特定
    const affectedUsers = await this.identifyAffectedUsers(breach);
    
    // 3. 通知
    await this.notifyUsers(affectedUsers);
    await this.notifyAuthorities(); // 72時間以内
    
    // 4. 対策実施
    await this.implementCountermeasures(breach);
    
    // 5. 報告書作成
    await this.generateIncidentReport(breach);
  }
}
```

## 11. セキュリティテスト

### 11.1 ペネトレーションテスト

```bash
# OWASP ZAP自動スキャン
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://api.yiq.example.com \
  -r security-report.html

# SQLMap (SQLインジェクションテスト)
sqlmap -u "https://api.yiq.example.com/users?id=1" \
  --batch --random-agent

# Nikto (Webサーバースキャン)
nikto -h https://api.yiq.example.com
```

### 11.2 セキュリティユニットテスト

```typescript
describe('Security Tests', () => {
  describe('Authentication', () => {
    it('should reject expired tokens', async () => {
      const expiredToken = generateExpiredToken();
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(response.status).toBe(401);
    });
    
    it('should prevent SQL injection', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const response = await request(app)
        .post('/api/search')
        .send({ query: maliciousInput });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid input');
    });
    
    it('should sanitize XSS attempts', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      const response = await request(app)
        .post('/api/comment')
        .send({ text: xssPayload });
      
      expect(response.body.text).not.toContain('<script>');
    });
  });
});
```

## 12. まとめ

本セキュリティ設計により、以下を実現：

1. **多層防御**: 複数のセキュリティレイヤーによる保護
2. **ゼロトラスト**: すべてのアクセスを検証
3. **監査性**: 完全な監査ログとトレーサビリティ
4. **コンプライアンス**: 法規制への準拠