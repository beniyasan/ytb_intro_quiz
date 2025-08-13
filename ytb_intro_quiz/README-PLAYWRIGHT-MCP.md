# Playwright MCP Integration

このドキュメントでは、YouTube Quiz AppにおけるPlaywright MCPの設定と使用方法について説明します。

## 概要

Playwright MCPは、Model Context Protocol (MCP)を使用してPlaywrightによるブラウザ自動化を提供するサーバーです。これにより、AIモデルがブラウザを操作し、E2Eテストの実行や自動化タスクを実行できます。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
npm run playwright:install
```

### 2. MCP サーバーの起動

```bash
npm run mcp:start
```

## 利用可能なMCPツール

### launch_browser
新しいブラウザインスタンスを起動します。

**パラメータ:**
- `browserType`: 'chromium' | 'firefox' | 'webkit' (デフォルト: 'chromium')
- `headless`: boolean (デフォルト: true)

### navigate
指定されたURLにナビゲートします。

**パラメータ:**
- `pageId`: string (必須)
- `url`: string (必須)

### click
要素をクリックします。

**パラメータ:**
- `pageId`: string (必須)
- `selector`: string (必須)

### fill
入力フィールドに値を入力します。

**パラメータ:**
- `pageId`: string (必須)
- `selector`: string (必須)
- `value`: string (必須)

### screenshot
スクリーンショットを撮影します。

**パラメータ:**
- `pageId`: string (必須)
- `path`: string (必須)
- `fullPage`: boolean (デフォルト: false)

### get_text
要素のテキスト内容を取得します。

**パラメータ:**
- `pageId`: string (必須)
- `selector`: string (必須)

### wait_for_selector
要素が表示されるまで待機します。

**パラメータ:**
- `pageId`: string (必須)
- `selector`: string (必須)
- `timeout`: number (デフォルト: 30000)

### close_browser
ブラウザインスタンスを閉じます。

**パラメータ:**
- `browserId`: string (必須)

## Playwrightテストの実行

### 全テストの実行
```bash
npm test
```

### UIモードでテストを実行
```bash
npm run test:ui
```

### デバッグモードでテストを実行
```bash
npm run test:debug
```

### ヘッドフルモードでテストを実行
```bash
npm run test:headed
```

### テストレポートの表示
```bash
npm run test:report
```

## テストファイル

- `tests/example.spec.ts`: 基本的なE2Eテスト
- `tests/mcp-integration.spec.ts`: MCP統合テスト

## 設定ファイル

- `playwright.config.ts`: Playwrightの設定
- `mcp-server.js`: MCPサーバーの実装
- `package.json`: 依存関係とスクリプト

## Docker環境での実行

Docker環境でPlaywrightテストを実行する場合：

```bash
# Dockerコンテナ内でテストを実行
docker-compose exec app npm test

# ヘッドレスモードで実行（CI/CD向け）
docker-compose exec app npm test -- --reporter=json
```

## トラブルシューティング

### ブラウザが起動しない場合
- システムに必要な依存関係がインストールされているか確認
- `npm run playwright:install` を実行してブラウザをインストール

### MCPサーバーが起動しない場合
- ポートが使用されていないか確認
- Node.jsのバージョンが要件を満たしているか確認

### テストがタイムアウトする場合
- `playwright.config.ts` でタイムアウト設定を調整
- ネットワーク接続を確認

## 参考リンク

- [Playwright Documentation](https://playwright.dev/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Project Repository](https://github.com/beniyasan/ytb_intro_quiz)