# Backend Server Startup Issue - リアルタイムWebSocket接続問題

## 問題の概要

Phase 3のランキング機能実装後、バックエンドサーバーの起動とWebSocket接続に問題が発生しています。

## 発生している症状

### 1. バックエンドサーバー起動の停止
```bash
# バックエンドの起動が以下で停止
[10:20:41 AM] Starting compilation in watch mode...
# この後、コンパイルが進行しない
```

### 2. WebSocket接続エラー
```javascript
// フロントエンドで発生するエラー
Failed to load resource: net::ERR_CONNECTION_REFUSED
TransportError: xhr poll error
🚨 WebSocket connection error
```

### 3. タイムアウト問題
- `nest start --watch` がコンパイル中に停止
- `npx tsc --noEmit` もタイムアウト
- TypeScriptコンパイルが無限に実行される

## 原因分析

### 主要原因
1. **TypeScriptコンパイル問題**
   - 循環依存またはTypeScriptの型エラー
   - WSL2環境でのファイルシステムの問題
   - メモリ不足によるコンパイルの停止

2. **環境依存問題**
   - Windows WSL2での開発環境
   - pnpm workspaceの設定問題
   - Node.jsのバージョン互換性

3. **依存関係の問題**
   - NestJSとSocket.IOの バージョン互換性
   - 新しく追加したYouTube API依存関係

## 具体的な改善案

### 即座に試すべき解決策

#### 1. TypeScriptコンパイルの修正
```bash
# コンパイルエラーを詳細表示
cd apps/backend
npx tsc --noEmit --listFiles --diagnostics

# 循環依存チェック
npx madge --circular --extensions ts ./src
```

#### 2. バックエンドの段階的起動
```bash
# 1. shared packageを先にビルド
pnpm --filter @ytb-quiz/shared build

# 2. バックエンドを単体でビルド
cd apps/backend
pnpm build

# 3. 本番モードで起動テスト
pnpm start:prod
```

#### 3. 依存関係の整理
```bash
# node_modulesを完全削除してクリーンインストール
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install --frozen-lockfile
```

### 中期的な改善策

#### 1. 開発環境の最適化
- **DockerによるLocolhost統一**
  ```dockerfile
  # docker-compose.yml作成
  # バックエンド、フロントエンド、データベースの統一環境
  ```

- **WSL2のパフォーマンス改善**
  ```bash
  # .wslconfig設定
  [wsl2]
  memory=4GB
  processors=2
  ```

#### 2. コード構造の改善
```typescript
// apps/backend/src/main.ts
// WebSocketサーバーの初期化エラーハンドリング強化
async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    
    // CORS設定の明示化
    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    });
    
    // WebSocketの設定を分離
    const server = app.getHttpServer();
    const io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      }
    });
    
    await app.listen(3001);
    console.log('✅ Backend server started on http://localhost:3001');
    
  } catch (error) {
    console.error('❌ Backend startup failed:', error);
    process.exit(1);
  }
}
```

#### 3. エラーハンドリングの強化
```typescript
// apps/frontend/src/hooks/useWebSocket.ts
// 接続エラー時のフォールバック機能
const useWebSocket = (props: UseWebSocketProps = {}) => {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;
  
  useEffect(() => {
    const connectWithRetry = () => {
      setConnectionStatus('connecting');
      
      const socketInstance = io(backendUrl, {
        timeout: 5000,
        retries: 3,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: maxRetries
      });
      
      socketInstance.on('connect_error', (error) => {
        console.error('Connection failed:', error);
        setConnectionStatus('error');
        
        if (retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connectWithRetry();
          }, 2000 * (retryCount + 1));
        }
      });
    };
    
    connectWithRetry();
  }, []);
};
```

### 長期的な改善策

#### 1. インフラストラクチャの改善
- **Kubernetes/Docker Composeの導入**
- **CI/CDパイプラインの整備**
- **監視とロギングシステムの導入**

#### 2. 開発体験の向上
- **Hot Reloadの最適化**
- **型安全性の向上**
- **テスト環境の自動化**

## 緊急対応手順

### 現在の問題を回避する手順
1. **モック WebSocketサーバーの作成**
   ```typescript
   // 一時的にランキング機能をモックデータで動作
   const mockSessionStats: SessionStatistics = {
     sessionId: 'mock',
     rankings: [
       { participantId: '1', username: 'Player1', totalScore: 100, rank: 1 }
     ],
     averageScore: 100,
     topScore: 100
   };
   ```

2. **ポーリングベースの更新に切り替え**
   ```typescript
   // WebSocketの代わりにHTTP APIポーリング
   const usePollingRankings = (sessionId: string) => {
     useEffect(() => {
       const interval = setInterval(async () => {
         try {
           const response = await fetch(`/api/rankings/${sessionId}`);
           const rankings = await response.json();
           // 状態更新
         } catch (error) {
           console.warn('Polling failed, using cached data');
         }
       }, 2000);
       
       return () => clearInterval(interval);
     }, [sessionId]);
   };
   ```

## 優先度と対応スケジュール

### 最優先（今すぐ）
1. TypeScriptコンパイルエラーの特定と修正
2. バックエンドサーバーの起動確認

### 高優先（1日以内）
1. WebSocket接続の復旧
2. ランキング機能の動作確認

### 中優先（1週間以内）
1. 開発環境の安定化
2. エラーハンドリングの強化
3. テストの追加

### 低優先（長期）
1. インフラの改善
2. パフォーマンスの最適化

## 参考リンク
- [NestJS WebSocket Documentation](https://docs.nestjs.com/websockets/gateways)
- [Socket.IO Node.js Documentation](https://socket.io/docs/v4/server-api/)
- [WSL2 Performance Guide](https://docs.microsoft.com/en-us/windows/wsl/compare-versions#performance-across-os-file-systems)