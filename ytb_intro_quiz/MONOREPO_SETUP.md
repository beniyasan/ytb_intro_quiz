# Monorepo Setup Documentation

## 概要
このプロジェクトをpnpmワークスペースを使用したmonorepo構造に移行しました。

## 構造

```
ytb-intro-quiz/
├── apps/
│   ├── frontend/          # Next.js 14 フロントエンドアプリケーション
│   └── backend/           # NestJS バックエンドアプリケーション
├── packages/
│   └── shared/            # 共通の型定義とユーティリティ
├── pnpm-workspace.yaml    # pnpmワークスペース設定
├── package.json           # ルートパッケージ設定
├── tsconfig.json          # TypeScript設定
├── .eslintrc.js           # ESLint設定
├── .prettierrc            # Prettier設定
└── .prettierignore        # Prettierの除外設定
```

## パッケージ

### apps/frontend
- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: 未設定（CSS/Tailwind CSS等を後で追加予定）
- **共通パッケージ**: @ytb-quiz/shared を使用

### apps/backend  
- **フレームワーク**: NestJS
- **言語**: TypeScript
- **データベース**: 未設定（TypeORM対応準備済み）
- **共通パッケージ**: @ytb-quiz/shared を使用

### packages/shared
- **内容**: 共通の型定義、ユーティリティ関数
- **エクスポート**: User、Auth、API Response型、定数など

## 利用可能なスクリプト

### ルートレベル

```bash
# 全パッケージの依存関係をインストール
pnpm install

# フロントエンドとバックエンドを同時に開発モードで起動
pnpm dev

# 全パッケージをビルド
pnpm build

# 全パッケージでリントを実行
pnpm lint

# 全パッケージでタイプチェックを実行  
pnpm type-check

# 全パッケージをフォーマット
pnpm format
```

### 個別パッケージ

```bash
# フロントエンドのみ起動
pnpm --filter @ytb-quiz/frontend dev

# バックエンドのみ起動
pnpm --filter @ytb-quiz/backend dev

# 共通パッケージをビルド
pnpm --filter @ytb-quiz/shared build
```

## 開発環境セットアップ

1. **依存関係のインストール**
   ```bash
   pnpm install
   ```

2. **開発サーバー起動**
   ```bash
   pnpm dev
   ```
   - フロントエンド: http://localhost:3000
   - バックエンド: http://localhost:3001

3. **型チェック実行**
   ```bash
   pnpm type-check
   ```

4. **コードフォーマット**
   ```bash
   pnpm format
   ```

## 設定詳細

### pnpm Workspace設定
- `pnpm-workspace.yaml`にワークスペースパッケージを定義
- `apps/*` と `packages/*` を含む

### TypeScript設定
- ルートの`tsconfig.json`でパス解決を設定
- 各パッケージが独自の`tsconfig.json`を持つ
- 共通パッケージへのパス: `@ytb-quiz/shared`

### ESLint & Prettier
- ルートレベルで統一された設定
- TypeScriptと連携
- Prettierと統合

## Issue #5 完了事項

✅ pnpm workspace設定ファイルを作成  
✅ apps/frontend (Next.js 14) フォルダを作成  
✅ apps/backend (NestJS) フォルダを作成  
✅ packages/shared (共通型定義) フォルダを作成  
✅ ESLint・Prettier設定を追加  
✅ TypeScript設定を追加  
✅ package.jsonスクリプトを設定  
✅ `pnpm dev` で frontend/backend 同時起動対応  
✅ lint・format・typecheck が動作する設定  

## 次のステップ

1. 依存関係のインストール完了確認
2. 各アプリケーションの詳細実装
3. 共通パッケージの拡張
4. テスト設定の追加
5. CI/CD パイプラインの設定