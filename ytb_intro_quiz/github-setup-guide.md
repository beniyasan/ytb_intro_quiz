# GitHub リポジトリセットアップガイド

## 概要
作成した実装計画に基づいて、GitHub リポジトリを効率的にセットアップする手順です。

## 1. ラベル作成

GitHubリポジトリの「Issues」→「Labels」で以下のラベルを作成してください：

### Priority Labels
```
priority/critical - 色: #d73a49 - 緊急対応が必要
priority/high - 色: #f66a0a - 高優先度  
priority/medium - 色: #fbca04 - 中優先度
priority/low - 色: #0e8a16 - 低優先度
```

### Type Labels
```
type/bug - 色: #d73a49 - バグ修正
type/feature - 色: #0052cc - 新機能
type/enhancement - 色: #a2eeef - 既存機能改善
type/chore - 色: #fef2c0 - 雑務・保守
type/docs - 色: #0075ca - ドキュメント
type/epic - 色: #3e4b9e - 大型機能
```

### Component Labels
```
component/frontend - 色: #1f77b4 - フロントエンド
component/backend - 色: #ff7f0e - バックエンド
component/database - 色: #2ca02c - データベース
component/websocket - 色: #d62728 - WebSocket機能
component/auth - 色: #9467bd - 認証・認可
component/deployment - 色: #8c564b - デプロイ・インフラ
component/mobile - 色: #e377c2 - モバイルアプリ
```

### Phase Labels
```
phase/mvp - 色: #0e8a16 - MVP実装
phase/scale - 色: #fbca04 - スケーラビリティ強化
phase/advanced - 色: #0052cc - 高度機能
```

## 2. Milestones作成

「Issues」→「Milestones」で以下のマイルストーンを作成：

```
Project Setup - 期限: 2024-04-15 - プロジェクト初期セットアップ
Basic Authentication - 期限: 2024-05-01 - 認証システム実装
Room Management - 期限: 2024-05-31 - ルーム管理機能
Quiz Core - 期限: 2024-07-15 - コアクイズ機能
WebSocket Integration - 期限: 2024-08-01 - リアルタイム通信
MVP Release - 期限: 2024-08-31 - MVP版リリース
Performance Optimization - 期限: 2024-10-15 - パフォーマンス最適化
Multi-Room Support - 期限: 2024-11-15 - マルチルーム対応
Load Testing - 期限: 2024-11-30 - 負荷テスト
Kubernetes Deployment - 期限: 2024-12-15 - Kubernetes環境
Advanced Game Modes - 期限: 2025-02-28 - 高度ゲーム機能
Social Features - 期限: 2025-04-30 - ソーシャル機能
Mobile Experience - 期限: 2025-06-30 - モバイル対応
Enterprise Features - 期限: 2025-08-31 - エンタープライズ機能
```

## 3. Issue Templates作成

`.github/ISSUE_TEMPLATE/` フォルダに以下のファイルを作成：

### Bug Report Template
ファイル名: `bug_report.yml`
```yaml
name: Bug Report
description: バグ報告用テンプレート
title: "[BUG] "
labels: ["type/bug"]
body:
  - type: markdown
    attributes:
      value: |
        バグを報告していただき、ありがとうございます！
        
  - type: textarea
    id: what-happened
    attributes:
      label: バグの内容
      description: 何が起こったかを詳しく説明してください
      placeholder: バグの詳細な説明...
    validations:
      required: true
      
  - type: textarea
    id: steps
    attributes:
      label: 再現手順
      description: バグを再現するための手順を教えてください
      placeholder: |
        1. '...'に移動
        2. '...'をクリック
        3. '...'まで下にスクロール
        4. エラーを確認
    validations:
      required: true
      
  - type: textarea
    id: expected
    attributes:
      label: 期待される動作
      description: 何が起こるべきだったかを説明してください
    validations:
      required: true
      
  - type: textarea
    id: screenshots
    attributes:
      label: スクリーンショット
      description: 問題を説明するのに役立つスクリーンショットがあれば添付してください
      
  - type: dropdown
    id: browsers
    attributes:
      label: ブラウザ
      multiple: true
      options:
        - Chrome
        - Firefox
        - Safari
        - Edge
        - その他
    validations:
      required: true
```

### Feature Request Template
ファイル名: `feature_request.yml`
```yaml
name: Feature Request  
description: 新機能要求用テンプレート
title: "[FEATURE] "
labels: ["type/feature"]
body:
  - type: markdown
    attributes:
      value: |
        新機能のご提案をありがとうございます！
        
  - type: textarea
    id: summary
    attributes:
      label: 機能概要
      description: 提案する機能の概要を説明してください
      placeholder: 機能の簡潔な説明...
    validations:
      required: true
      
  - type: textarea
    id: user-story
    attributes:
      label: ユーザーストーリー
      description: "ユーザーの視点から機能を説明してください"
      placeholder: "[ユーザータイプ]として、[目標]したい。なぜなら[理由]だから。"
    validations:
      required: true
      
  - type: textarea
    id: acceptance-criteria
    attributes:
      label: 受け入れ基準
      description: この機能が完成したと判断する基準をリストアップしてください
      placeholder: |
        - [ ] 基準 1
        - [ ] 基準 2
        - [ ] 基準 3
    validations:
      required: true
      
  - type: dropdown
    id: priority
    attributes:
      label: 優先度
      options:
        - Low
        - Medium  
        - High
        - Critical
    validations:
      required: true
      
  - type: dropdown
    id: story-points
    attributes:
      label: 見積もり (Story Points)
      options:
        - "1"
        - "2" 
        - "3"
        - "5"
        - "8"
        - "13"
        - "20"
    validations:
      required: true
```

## 4. GitHub Actions Workflow作成

`.github/workflows/` フォルダに以下のファイルを作成：

### Issue Management
ファイル名: `issue-management.yml`
```yaml
name: Issue Management

on:
  issues:
    types: [opened, labeled]

jobs:
  auto-assign:
    runs-on: ubuntu-latest
    steps:
      - name: Auto assign issues
        uses: actions/github-script@v7
        if: github.event.action == 'opened'
        with:
          script: |
            github.rest.issues.addAssignees({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              assignees: [context.repo.owner]
            });
            
  validate-feature:
    runs-on: ubuntu-latest  
    if: contains(github.event.issue.labels.*.name, 'type/feature')
    steps:
      - name: Check story points
        uses: actions/github-script@v7
        with:
          script: |
            const issue = context.payload.issue;
            const hasStoryPoints = issue.body && issue.body.includes('Story Points');
            
            if (!hasStoryPoints) {
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: '⚠️ この機能要求にはStory Pointsの見積もりが必要です。'
              });
            }
```

## 5. 最初のイシュー作成

以下の手順で最初のイシューを手動作成してください：

### Issue #1: プロジェクト初期構造セットアップ

```
Title: [SETUP] プロジェクト初期構造セットアップ
Labels: priority/high, type/chore, phase/mvp, component/frontend, component/backend
Milestone: Project Setup
Assignee: beniyasan

## Description
monorepoでのプロジェクト構造を構築

## Tasks
- [ ] pnpm workspace設定
- [ ] apps/frontend (Next.js 14)フォルダ作成
- [ ] apps/backend (NestJS)フォルダ作成  
- [ ] packages/shared (共通型定義)フォルダ作成
- [ ] ESLint、Prettier設定
- [ ] TypeScript設定
- [ ] package.jsonスクリプト設定

## Acceptance Criteria
- [ ] `pnpm dev`でfrontend/backend同時起動
- [ ] Lintとフォーマットが正常動作
- [ ] TypeScript型チェックが正常動作

## Story Points
5

## Notes
プロジェクトの基盤となる重要なセットアップ作業
```

## 6. GitHub Projects設定

1. リポジトリの「Projects」タブに移動
2. 「New project」をクリック
3. 「Board」テンプレートを選択
4. プロジェクト名: "YouTube Intro Quiz Development"

### カラム設定
```
Backlog - 未着手のタスク
Sprint Backlog - スプリント計画済み
In Progress - 作業中
In Review - レビュー中  
Testing - テスト中
Done - 完了
```

### カスタムフィールド追加
- Story Points (Number)
- Sprint (Select: Sprint 1, Sprint 2, ...)
- Component (Select: Frontend, Backend, Database, ...)
- Phase (Select: MVP, Scale, Advanced)

## 7. 効率的なイシュー一括作成方法

### 方法1: GitHub CLI使用
```bash
# GitHub CLI インストール後
gh auth login

# テンプレートスクリプト実行（後述）
chmod +x create_issues.sh
./create_issues.sh
```

### 方法2: Issueインポートツール
- GitHub Importer
- Linear to GitHub
- Jira to GitHub

## 8. 最初の10個のイシュー作成スクリプト

以下のスクリプトを `create_issues.sh` として保存：

```bash
#!/bin/bash

# GitHub CLIでissue作成
gh issue create --title "[SETUP] プロジェクト初期構造セットアップ" \
  --body "monorepoでのプロジェクト構造を構築

## Tasks
- [ ] pnpm workspace設定  
- [ ] apps/frontend作成
- [ ] apps/backend作成
- [ ] packages/shared作成
- [ ] ESLint、Prettier設定
- [ ] TypeScript設定

## Acceptance Criteria
- [ ] pnpm devで同時起動
- [ ] Lint正常動作
- [ ] TypeScript型チェック正常

Story Points: 5" \
  --label "priority/high,type/chore,phase/mvp,component/frontend,component/backend" \
  --milestone "Project Setup"

gh issue create --title "[SETUP] 開発環境Docker構成" \
  --body "開発用Docker環境の構築

## Tasks  
- [ ] docker-compose.yml作成
- [ ] PostgreSQL設定
- [ ] Redis設定  
- [ ] 環境変数設定
- [ ] DB初期化スクリプト

## Acceptance Criteria
- [ ] docker-compose upで全サービス起動
- [ ] DB接続確認
- [ ] Redis接続確認

Story Points: 3" \
  --label "priority/high,type/chore,phase/mvp,component/deployment" \
  --milestone "Project Setup"

# 続けて他のイシューも作成...
```

## 9. おすすめワークフロー

### 週次作業
1. **月曜日**: Sprint Planning
2. **水曜日**: Mid-sprint Review  
3. **金曜日**: Sprint Review & Retrospective

### 日次作業
1. Issues の進捗更新
2. Project Board の更新
3. コードレビュー対応

## 10. トラブルシューティング

### "Failed to load issues" エラーの対処法

1. **ブラウザキャッシュクリア**
2. **別ブラウザで確認**
3. **GitHub Status確認**: https://www.githubstatus.com/
4. **リポジトリアクセス権限確認**
5. **Issue作成権限確認**

### 権限が不足している場合
- Repository Settings → Manage access で権限確認
- Organization settings確認（該当する場合）

このガイドに従って段階的にセットアップを進めることで、効率的なプロジェクト管理環境を構築できます。