# UI デザイン改善 設計書

## 1. デザインシステム

### 1.1 カラーパレット
```css
/* Primary Colors - Gradient */
--gradient-primary: linear-gradient(to bottom right, #9333ea, #3b82f6, #2563eb);
--purple-600: #9333ea;
--blue-600: #3b82f6;
--blue-800: #2563eb;

/* Secondary Colors */
--white: #ffffff;
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-600: #4b5563;
--gray-800: #1f2937;

/* Accent Colors */
--green-500: #10b981;
--green-600: #059669;
--red-500: #ef4444;
--red-600: #dc2626;
--yellow-500: #eab308;
--purple-500: #a855f7;
```

### 1.2 タイポグラフィ
- **見出し (H1)**: text-3xl md:text-4xl font-bold
- **見出し (H2)**: text-2xl md:text-3xl font-bold  
- **見出し (H3)**: text-xl md:text-2xl font-semibold
- **本文**: text-base
- **キャプション**: text-sm text-gray-600

### 1.3 スペーシング
- **セクション間**: mb-8 または mb-12
- **カード内パディング**: p-6 または p-8
- **要素間**: space-y-4 または space-y-6

### 1.4 シャドウとエフェクト
- **カードシャドウ**: shadow-2xl
- **ホバーシャドウ**: hover:shadow-xl
- **トランジション**: transition-all duration-200
- **ホバースケール**: hover:scale-105

## 2. コンポーネント設計

### 2.1 レイアウトコンポーネント

#### GradientLayout
```tsx
interface GradientLayoutProps {
  children: React.ReactNode;
  className?: string;
}
```
- 全画面にグラデーション背景を適用
- min-h-screenで最小高さを確保
- 子要素の配置を柔軟に対応

#### DashboardCard
```tsx
interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}
```
- 白背景に半透明効果
- 角丸とシャドウ
- オプションでホバーエフェクト

### 2.2 ボタンコンポーネント

#### PrimaryButton
- グラデーション背景
- ホバー時の色変化とスケール効果
- ローディング状態のサポート

#### SecondaryButton
- 白背景にボーダー
- ホバー時の背景色変化

#### IconButton
- アイコン付きボタン
- 絵文字またはSVGアイコンのサポート

### 2.3 ナビゲーションコンポーネント

#### DashboardHeader
- ユーザー情報表示
- ロゴ/ブランド表示
- ログアウトボタン

#### QuickActionCard
- アイコン付きのアクションカード
- グラデーション背景
- ホバーエフェクト

## 3. 画面別設計

### 3.1 ダッシュボード画面

#### レイアウト構造
```
GradientLayout
├── DashboardHeader
│   ├── Logo/Brand
│   ├── User Info
│   └── Logout Button
├── Quick Actions Section
│   ├── QuickActionCard (クイズを開始)
│   └── QuickActionCard (クイズに参加)
└── Playlists Section
    ├── Section Header
    └── Playlist Grid
        └── PlaylistCard (複数)
```

#### スタイリング詳細
1. **背景**: ログイン画面と同じグラデーション
2. **ヘッダー**: 半透明の白背景カード
3. **クイックアクション**: グラデーションカード with アイコン
4. **プレイリストセクション**: 白背景カード内にグリッド配置

### 3.2 プレイリスト関連画面

#### PlaylistCard デザイン
- サムネイル画像エリア（将来的な拡張を考慮）
- タイトルと説明文
- 動画数などのメタ情報
- ホバー時のトランスフォーム効果

### 3.3 共通要素

#### LoadingSpinner
- アニメーション付きスピナー
- 中央配置またはインライン表示

#### EmptyState
- アイコンとメッセージ
- CTAボタン付き

## 4. レスポンシブデザイン戦略

### 4.1 ブレークポイント
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

### 4.2 グリッドシステム
- **Mobile**: 1カラム
- **Tablet**: 2カラム
- **Desktop**: 3-4カラム

### 4.3 スペーシング調整
- モバイルでは狭めのパディング
- デスクトップでは広めのマージン

## 5. アニメーション仕様

### 5.1 ページ遷移
- フェードイン効果
- 要素の段階的表示

### 5.2 インタラクション
- ボタンホバー: scale(1.05)
- カードホバー: translateY(-4px)
- フォーカス: ring効果

### 5.3 ローディング
- スケルトンローディング
- プログレスインジケーター

## 6. アクセシビリティ考慮事項

### 6.1 カラーコントラスト
- 背景と文字のコントラスト比 4.5:1以上
- 重要な情報は色だけに依存しない

### 6.2 キーボードナビゲーション
- 全ての対話要素がキーボードでアクセス可能
- フォーカス順序が論理的

### 6.3 スクリーンリーダー対応
- 適切なaria-label
- セマンティックなHTML構造

## 7. 実装における技術的配慮

### 7.1 パフォーマンス
- CSS-in-JSは避け、Tailwind CSSを活用
- 不要な再レンダリングを防ぐ

### 7.2 保守性
- 共通コンポーネントの再利用
- デザイントークンの一元管理

### 7.3 拡張性
- 新しい画面追加時も同じデザインシステムを適用
- カラーテーマの切り替えを考慮した設計