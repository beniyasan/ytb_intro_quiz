# Phase 1: MVP実装 - GitHubイシュー

## プロジェクトセットアップ

### Issue #1: プロジェクト初期構造セットアップ
**Labels:** `priority/high`, `type/chore`, `phase/mvp`, `component/frontend`, `component/backend`  
**Milestone:** Project Setup

**Description:**
monorepoでのプロジェクト構造を構築

**Tasks:**
- [ ] pnpm workspace設定
- [ ] apps/frontend (Next.js 14)フォルダ作成
- [ ] apps/backend (NestJS)フォルダ作成  
- [ ] packages/shared (共通型定義)フォルダ作成
- [ ] ESLint、Prettier設定
- [ ] TypeScript設定
- [ ] package.jsonスクリプト設定

**Acceptance Criteria:**
- [ ] `pnpm dev`でfrontend/backend同時起動
- [ ] Lintとフォーマットが正常動作
- [ ] TypeScript型チェックが正常動作

**Estimate:** 5 Story Points

---

### Issue #2: 開発環境Docker構成
**Labels:** `priority/high`, `type/chore`, `phase/mvp`, `component/deployment`  
**Milestone:** Project Setup

**Description:**
開発用Docker環境の構築

**Tasks:**
- [ ] docker-compose.yml作成
- [ ] PostgreSQL設定
- [ ] Redis設定
- [ ] 開発用環境変数設定
- [ ] データベース初期化スクリプト

**Acceptance Criteria:**
- [ ] `docker-compose up`で全サービス起動
- [ ] データベース接続確認
- [ ] Redis接続確認

**Estimate:** 3 Story Points

---

## 認証システム

### Issue #3: JWT認証システム実装
**Labels:** `priority/high`, `type/feature`, `phase/mvp`, `component/auth`, `component/backend`  
**Milestone:** Basic Authentication

**Description:**
JWTベースの認証システム実装

**Tasks:**
- [ ] JWT生成・検証ロジック
- [ ] パスワードハッシュ化(bcrypt)
- [ ] リフレッシュトークン機能
- [ ] 認証ミドルウェア実装
- [ ] /auth/login エンドポイント
- [ ] /auth/register エンドポイント
- [ ] /auth/refresh エンドポイント

**Acceptance Criteria:**
- [ ] ユーザー登録が正常動作
- [ ] ログイン/ログアウトが正常動作
- [ ] JWT検証が正常動作
- [ ] パスワード要件チェック実装

**Estimate:** 8 Story Points

---

### Issue #4: ユーザー管理API
**Labels:** `priority/high`, `type/feature`, `phase/mvp`, `component/backend`  
**Milestone:** Basic Authentication

**Description:**
ユーザー関連API実装

**Tasks:**
- [ ] User model (Prisma)
- [ ] /users/me エンドポイント
- [ ] プロフィール更新API
- [ ] ユーザーバリデーション
- [ ] エラーハンドリング

**Acceptance Criteria:**
- [ ] ユーザー情報取得
- [ ] プロフィール更新
- [ ] 適切なエラーレスポンス

**Estimate:** 5 Story Points

---

### Issue #5: フロントエンド認証UI
**Labels:** `priority/high`, `type/feature`, `phase/mvp`, `component/frontend`  
**Milestone:** Basic Authentication

**Description:**
認証関連のUI実装

**Tasks:**
- [ ] ログインページ
- [ ] 登録ページ
- [ ] 認証状態管理(Zustand)
- [ ] JWT保存・取得ロジック
- [ ] 認証ガード実装
- [ ] shadcn/ui form components

**Acceptance Criteria:**
- [ ] ログインフォーム動作
- [ ] 登録フォーム動作
- [ ] 認証状態の永続化
- [ ] 未認証時のリダイレクト

**Estimate:** 8 Story Points

---

## データベース設計

### Issue #6: Prismaスキーマ設計・実装
**Labels:** `priority/high`, `type/feature`, `phase/mvp`, `component/database`  
**Milestone:** Basic Authentication

**Description:**
データベーススキーマの実装

**Tasks:**
- [ ] User model定義
- [ ] Room model定義
- [ ] Player model定義
- [ ] Question model定義
- [ ] Answer model定義
- [ ] Score model定義
- [ ] 初期マイグレーション作成
- [ ] シードデータ作成

**Acceptance Criteria:**
- [ ] `prisma migrate dev`実行成功
- [ ] 全モデル間のリレーション正常動作
- [ ] シードデータ投入成功

**Estimate:** 6 Story Points

---

## ルーム管理

### Issue #7: ルーム作成API
**Labels:** `priority/high`, `type/feature`, `phase/mvp`, `component/backend`  
**Milestone:** Room Management

**Description:**
ルーム作成・管理API実装

**Tasks:**
- [ ] POST /rooms エンドポイント
- [ ] GET /rooms/:id エンドポイント  
- [ ] セッションコード生成ロジック
- [ ] ルーム設定バリデーション
- [ ] ホスト権限チェック

**Acceptance Criteria:**
- [ ] ルーム作成成功
- [ ] 6桁セッションコード生成
- [ ] ルーム情報取得成功
- [ ] 認証済みユーザーのみ作成可能

**Estimate:** 6 Story Points

---

### Issue #8: ルーム参加機能
**Labels:** `priority/high`, `type/feature`, `phase/mvp`, `component/backend`  
**Milestone:** Room Management

**Description:**
セッションコードによるルーム参加

**Tasks:**
- [ ] POST /rooms/join エンドポイント
- [ ] セッションコード検証
- [ ] Player record作成
- [ ] 重複参加チェック
- [ ] 定員チェック

**Acceptance Criteria:**
- [ ] セッションコードで参加可能
- [ ] 定員超過時のエラーハンドリング
- [ ] 重複参加の防止

**Estimate:** 5 Story Points

---

### Issue #9: ルーム管理UI
**Labels:** `priority/high`, `type/feature`, `phase/mvp`, `component/frontend`  
**Milestone:** Room Management

**Description:**
ルーム作成・参加のUI実装

**Tasks:**
- [ ] ルーム作成フォーム
- [ ] ルーム参加フォーム
- [ ] ルーム設定UI
- [ ] ロビー画面
- [ ] 参加者リスト表示

**Acceptance Criteria:**
- [ ] ルーム作成フォーム動作
- [ ] セッションコード入力で参加
- [ ] ロビーでの待機画面表示
- [ ] 参加者リストの動的更新

**Estimate:** 10 Story Points

---

## YouTube API統合

### Issue #10: YouTube API統合
**Labels:** `priority/high`, `type/feature`, `phase/mvp`, `component/backend`  
**Milestone:** Quiz Core

**Description:**
YouTube Data API v3統合

**Tasks:**
- [ ] YouTube API client設定
- [ ] プレイリスト取得機能
- [ ] 動画メタデータ取得
- [ ] APIクォータ管理
- [ ] エラーハンドリング・リトライ

**Acceptance Criteria:**
- [ ] プレイリストURL解析
- [ ] プレイリスト内容取得
- [ ] 動画情報(title, duration)取得
- [ ] API制限エラーの適切な処理

**Estimate:** 8 Story Points

---

### Issue #11: クイズデータ管理
**Labels:** `priority/medium`, `type/feature`, `phase/mvp`, `component/backend`  
**Milestone:** Quiz Core

**Description:**
クイズ問題データの管理機能

**Tasks:**
- [ ] プレイリストからクイズ生成
- [ ] 問題の順序シャッフル
- [ ] 再生時間設定
- [ ] 問題データキャッシュ

**Acceptance Criteria:**
- [ ] プレイリストをクイズに変換
- [ ] ランダム出題順序
- [ ] Redis による問題データキャッシュ

**Estimate:** 6 Story Points

---

## WebSocket基盤

### Issue #12: WebSocket基盤実装
**Labels:** `priority/high`, `type/feature`, `phase/mvp`, `component/websocket`  
**Milestone:** WebSocket Integration

**Description:**
Socket.ioによるリアルタイム通信基盤

**Tasks:**
- [ ] Socket.io server設定
- [ ] namespace設計実装
- [ ] room機能実装
- [ ] 接続/切断ハンドリング
- [ ] 認証ミドルウェア

**Acceptance Criteria:**
- [ ] WebSocket接続確立
- [ ] ルームへの参加・退出
- [ ] 接続状態の管理
- [ ] JWT認証でのWebSocket接続

**Estimate:** 8 Story Points

---

### Issue #13: リアルタイムルーム状態管理
**Labels:** `priority/high`, `type/feature`, `phase/mvp`, `component/websocket`  
**Milestone:** WebSocket Integration

**Description:**
ルーム状態のリアルタイム同期

**Tasks:**
- [ ] プレイヤー参加イベント
- [ ] プレイヤー退出イベント
- [ ] ルーム状態更新イベント
- [ ] Redis Pub/Subによる状態同期

**Acceptance Criteria:**
- [ ] 参加者の動的表示更新
- [ ] ルーム状態変更の即座反映
- [ ] 複数サーバー間での状態同期

**Estimate:** 6 Story Points

---

## ゲーム機能

### Issue #14: 早押し機能実装
**Labels:** `priority/critical`, `type/feature`, `phase/mvp`, `component/websocket`  
**Milestone:** Quiz Core

**Description:**
早押しボタンとタイムスタンプ管理

**Tasks:**
- [ ] 早押しイベントハンドリング
- [ ] Redis による順位決定
- [ ] タイムスタンプ管理
- [ ] 早押し権取得通知

**Acceptance Criteria:**
- [ ] 50ms以内の判定レスポンス
- [ ] 正確な早押し順位決定
- [ ] 同時押し時の適切な処理

**Estimate:** 10 Story Points

---

### Issue #15: 解答判定システム
**Labels:** `priority/high`, `type/feature`, `phase/mvp`, `component/backend`  
**Milestone:** Quiz Core

**Description:**
解答の正誤判定ロジック

**Tasks:**
- [ ] 文字列マッチング(部分一致)
- [ ] カタカナ/ひらがな正規化
- [ ] スコア計算ロジック
- [ ] 解答結果保存

**Acceptance Criteria:**
- [ ] 正解判定の精度向上
- [ ] 表記ゆれに対応
- [ ] スコア計算の正確性

**Estimate:** 7 Story Points

---

### Issue #16: ゲームフロー制御
**Labels:** `priority/high`, `type/feature`, `phase/mvp`, `component/backend`, `component/websocket`  
**Milestone:** Quiz Core

**Description:**
ゲーム進行の制御システム

**Tasks:**
- [ ] ゲーム開始ロジック
- [ ] 問題出題制御
- [ ] 制限時間管理
- [ ] 次の問題への遷移
- [ ] ゲーム終了処理

**Acceptance Criteria:**
- [ ] 順序立てたゲーム進行
- [ ] タイマー機能の実装
- [ ] 適切なゲーム状態遷移

**Estimate:** 10 Story Points

---

## フロントエンドUI

### Issue #17: YouTube動画プレイヤー統合
**Labels:** `priority/high`, `type/feature`, `phase/mvp`, `component/frontend`  
**Milestone:** Quiz Core

**Description:**
YouTube IFrame Player API統合

**Tasks:**
- [ ] YouTube Player Hook実装
- [ ] 再生制御ロジック
- [ ] 音声のみ再生設定
- [ ] 自動再生対応

**Acceptance Criteria:**
- [ ] YouTube動画の埋め込み再生
- [ ] 指定時間からの再生開始
- [ ] 音声のみモード
- [ ] 自動再生の制御

**Estimate:** 8 Story Points

---

### Issue #18: ゲーム画面UI実装
**Labels:** `priority/high`, `type/feature`, `phase/mvp`, `component/frontend`  
**Milestone:** Quiz Core

**Description:**
メインゲーム画面の実装

**Tasks:**
- [ ] 早押しボタンコンポーネント
- [ ] プレイヤーリスト表示
- [ ] スコアボード
- [ ] 解答入力フォーム
- [ ] タイマー表示

**Acceptance Criteria:**
- [ ] レスポンシブな早押しボタン
- [ ] リアルタイムスコア表示
- [ ] 直感的なUI操作

**Estimate:** 12 Story Points

---

### Issue #19: 結果画面実装
**Labels:** `priority/medium`, `type/feature`, `phase/mvp`, `component/frontend`  
**Milestone:** Quiz Core

**Description:**
ゲーム終了後の結果表示

**Tasks:**
- [ ] 最終スコア表示
- [ ] 順位表示
- [ ] 個人統計表示
- [ ] 再戦ボタン

**Acceptance Criteria:**
- [ ] 分かりやすいランキング表示
- [ ] アニメーション効果
- [ ] 共有機能(オプション)

**Estimate:** 6 Story Points

---

## テスト・品質

### Issue #20: バックエンドユニットテスト
**Labels:** `priority/medium`, `type/chore`, `phase/mvp`, `component/backend`  
**Milestone:** MVP Release

**Description:**
重要機能のユニットテスト実装

**Tasks:**
- [ ] 認証ロジックのテスト
- [ ] ルーム管理APIのテスト
- [ ] クイズロジックのテスト
- [ ] WebSocketイベントのテスト

**Acceptance Criteria:**
- [ ] テストカバレッジ80%以上
- [ ] CI/CDでのテスト自動実行

**Estimate:** 8 Story Points

---

### Issue #21: フロントエンドテスト
**Labels:** `priority/medium`, `type/chore`, `phase/mvp`, `component/frontend`  
**Milestone:** MVP Release

**Description:**
重要コンポーネントのテスト実装

**Tasks:**
- [ ] 認証フローのテスト
- [ ] ルーム作成・参加のテスト
- [ ] 早押しボタンのテスト
- [ ] E2Eテスト(Playwright)

**Acceptance Criteria:**
- [ ] 主要フローのE2Eテスト
- [ ] コンポーネントテスト

**Estimate:** 10 Story Points

---

## デプロイ・インフラ

### Issue #22: 本番環境セットアップ
**Labels:** `priority/high`, `type/chore`, `phase/mvp`, `component/deployment`  
**Milestone:** MVP Release

**Description:**
本番環境の初期構築

**Tasks:**
- [ ] Dockerfile作成
- [ ] docker-compose.prod.yml
- [ ] 環境変数設定
- [ ] SSL証明書設定
- [ ] ログ設定

**Acceptance Criteria:**
- [ ] 本番環境での正常動作
- [ ] HTTPS通信
- [ ] ログ出力確認

**Estimate:** 8 Story Points

---

### Issue #23: CI/CDパイプライン構築
**Labels:** `priority/medium`, `type/chore`, `phase/mvp`, `component/deployment`  
**Milestone:** MVP Release

**Description:**
GitHub Actionsによる自動デプロイ

**Tasks:**
- [ ] GitHub Actions workflow
- [ ] テスト自動実行
- [ ] Docker image build
- [ ] デプロイ自動化

**Acceptance Criteria:**
- [ ] mainブランチへのpushで自動デプロイ
- [ ] テスト失敗時のデプロイ停止

**Estimate:** 6 Story Points

---

## 見積もり合計
**Phase 1 Total: 166 Story Points**

## 推奨スプリント構成(2週間スプリント)

### Sprint 1 (20pt): プロジェクト基盤
- Issue #1: プロジェクト初期構造セットアップ (5pt)
- Issue #2: Docker環境構築 (3pt) 
- Issue #6: Prismaスキーマ実装 (6pt)
- Issue #3: JWT認証システム (6pt完了予定)

### Sprint 2 (18pt): 認証システム完成
- Issue #3: JWT認証システム完了 (2pt)
- Issue #4: ユーザー管理API (5pt)
- Issue #5: 認証UI (8pt)
- Issue #12: WebSocket基盤 (3pt開始)

### Sprint 3 (20pt): ルーム管理
- Issue #12: WebSocket基盤完了 (5pt)
- Issue #7: ルーム作成API (6pt)
- Issue #8: ルーム参加機能 (5pt)
- Issue #9: ルーム管理UI (4pt開始)

### Sprint 4 (18pt): YouTube統合
- Issue #9: ルーム管理UI完了 (6pt)
- Issue #10: YouTube API統合 (8pt)
- Issue #11: クイズデータ管理 (4pt開始)

### Sprint 5 (20pt): ゲーム機能1
- Issue #11: クイズデータ管理完了 (2pt)
- Issue #13: リアルタイム状態管理 (6pt)
- Issue #14: 早押し機能 (10pt)
- Issue #17: YouTubeプレイヤー (2pt開始)

### Sprint 6 (20pt): ゲーム機能2  
- Issue #17: YouTubeプレイヤー完了 (6pt)
- Issue #15: 解答判定システム (7pt)
- Issue #16: ゲームフロー制御 (7pt開始)

### Sprint 7 (20pt): UI完成
- Issue #16: ゲームフロー制御完了 (3pt)
- Issue #18: ゲーム画面UI (12pt)
- Issue #19: 結果画面 (5pt開始)

### Sprint 8 (20pt): テスト・デプロイ
- Issue #19: 結果画面完了 (1pt)
- Issue #20: バックエンドテスト (8pt)  
- Issue #21: フロントエンドテスト (10pt)
- Issue #22: 本番環境セットアップ (1pt開始)

### Sprint 9 (10pt): リリース準備
- Issue #22: 本番環境セットアップ完了 (7pt)
- Issue #23: CI/CDパイプライン (3pt開始)

### Sprint 10 (6pt): MVP リリース
- Issue #23: CI/CDパイプライン完了 (3pt)
- バグ修正・最終調整 (3pt)