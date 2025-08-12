# UI/UX設計書

## 1. 概要

YouTube イントロクイズバトルシステムのユーザーインターフェースとユーザー体験の設計書です。直感的で楽しく、レスポンシブなデザインを実現します。

## 2. デザイン原則

### 2.1 基本原則
- **シンプル**: 直感的で理解しやすいインターフェース
- **レスポンシブ**: あらゆるデバイスで最適な表示
- **アクセシブル**: WCAG 2.1 Level AA準拠
- **パフォーマンス**: 高速な画面遷移とアニメーション
- **楽しさ**: ゲーム性を高める視覚効果

### 2.2 デザインシステム

#### カラーパレット
```scss
// Primary Colors
$primary-500: #6366F1;  // Indigo
$primary-600: #4F46E5;
$primary-700: #4338CA;

// Secondary Colors  
$secondary-500: #EC4899; // Pink
$secondary-600: #DB2777;

// Semantic Colors
$success: #10B981;      // Green
$warning: #F59E0B;      // Amber
$error: #EF4444;        // Red
$info: #3B82F6;         // Blue

// Neutral Colors
$gray-50: #F9FAFB;
$gray-100: #F3F4F6;
$gray-900: #111827;

// Game State Colors
$buzzer-active: #EF4444;
$buzzer-pressed: #FCD34D;
$correct-answer: #10B981;
$wrong-answer: #EF4444;
```

#### タイポグラフィ
```scss
// Font Family
$font-primary: 'Inter', system-ui, sans-serif;
$font-display: 'Poppins', sans-serif;
$font-mono: 'JetBrains Mono', monospace;

// Font Sizes
$text-xs: 0.75rem;     // 12px
$text-sm: 0.875rem;    // 14px
$text-base: 1rem;      // 16px
$text-lg: 1.125rem;    // 18px
$text-xl: 1.25rem;     // 20px
$text-2xl: 1.5rem;     // 24px
$text-3xl: 1.875rem;   // 30px
$text-4xl: 2.25rem;    // 36px
$text-5xl: 3rem;       // 48px
```

#### スペーシング
```scss
$spacing-1: 0.25rem;   // 4px
$spacing-2: 0.5rem;    // 8px
$spacing-3: 0.75rem;   // 12px
$spacing-4: 1rem;      // 16px
$spacing-6: 1.5rem;    // 24px
$spacing-8: 2rem;      // 32px
$spacing-12: 3rem;     // 48px
$spacing-16: 4rem;     // 64px
```

## 3. 画面設計

### 3.1 画面一覧

| 画面名 | パス | 説明 | 権限 |
|-------|------|------|------|
| ホーム | / | ランディングページ | 全員 |
| ログイン | /login | ログイン画面 | ゲスト |
| 登録 | /register | ユーザー登録画面 | ゲスト |
| ダッシュボード | /dashboard | ユーザーダッシュボード | ログイン済み |
| ルーム作成 | /room/create | ルーム作成画面 | ログイン済み |
| ルーム参加 | /room/join | セッションコード入力画面 | 全員 |
| ロビー | /room/[id]/lobby | ゲーム開始前の待機画面 | 参加者 |
| ゲーム画面 | /room/[id]/game | メインゲーム画面 | 参加者 |
| 結果画面 | /room/[id]/result | ゲーム終了後の結果表示 | 参加者 |
| ランキング | /leaderboard | グローバルランキング | 全員 |

### 3.2 画面詳細設計

#### ホーム画面
```tsx
// components/pages/Home.tsx
<Layout>
  <Hero>
    <Title>YouTube イントロクイズバトル</Title>
    <Subtitle>音楽の知識で競い合おう！</Subtitle>
    <ButtonGroup>
      <Button variant="primary" size="large">
        ルームを作成
      </Button>
      <Button variant="secondary" size="large">
        ルームに参加
      </Button>
    </ButtonGroup>
  </Hero>
  
  <Features>
    <FeatureCard icon="🎵" title="YouTube連携">
      お気に入りのプレイリストでクイズを作成
    </FeatureCard>
    <FeatureCard icon="⚡" title="リアルタイム対戦">
      最大20人での早押し対戦
    </FeatureCard>
    <FeatureCard icon="🏆" title="ランキング">
      世界中のプレイヤーと競争
    </FeatureCard>
  </Features>
  
  <ActiveRooms>
    <RoomCard v-for="room in activeRooms">
      <RoomName>{room.name}</RoomName>
      <PlayerCount>{room.players}/{room.maxPlayers}</PlayerCount>
      <JoinButton>参加</JoinButton>
    </RoomCard>
  </ActiveRooms>
</Layout>
```

#### ルーム作成画面
```tsx
// components/pages/CreateRoom.tsx
<Container>
  <Card>
    <CardHeader>
      <Title>ルームを作成</Title>
    </CardHeader>
    
    <CardBody>
      <Form onSubmit={handleCreateRoom}>
        <FormField>
          <Label>ルーム名</Label>
          <Input 
            placeholder="例：90年代J-POPクイズ"
            maxLength={50}
          />
        </FormField>
        
        <FormField>
          <Label>最大人数</Label>
          <Slider 
            min={2} 
            max={20} 
            defaultValue={10}
          />
          <SliderValue>{maxPlayers}人</SliderValue>
        </FormField>
        
        <FormField>
          <Label>YouTubeプレイリスト</Label>
          <Input 
            type="url"
            placeholder="https://youtube.com/playlist?list=..."
          />
          <Helper>
            プレイリストURLを貼り付けてください
          </Helper>
        </FormField>
        
        <Accordion>
          <AccordionItem title="詳細設定">
            <FormField>
              <Label>問題数</Label>
              <RadioGroup>
                <Radio value="10">10問</Radio>
                <Radio value="20">20問</Radio>
                <Radio value="30">30問</Radio>
              </RadioGroup>
            </FormField>
            
            <FormField>
              <Label>再生時間</Label>
              <Select>
                <option value="10">10秒</option>
                <option value="15">15秒</option>
                <option value="20">20秒</option>
                <option value="30">30秒</option>
              </Select>
            </FormField>
          </AccordionItem>
        </Accordion>
        
        <Button type="submit" fullWidth>
          ルームを作成
        </Button>
      </Form>
    </CardBody>
  </Card>
</Container>
```

#### ゲーム画面
```tsx
// components/pages/Game.tsx
<GameLayout>
  <TopBar>
    <RoundIndicator>
      第 {currentRound} / {totalRounds} 問
    </RoundIndicator>
    <Timer>{timeRemaining}秒</Timer>
    <ScoreDisplay>{myScore}点</ScoreDisplay>
  </TopBar>
  
  <MainArea>
    <VideoPlayer>
      <YouTubeEmbed 
        videoId={currentQuestion.youtubeId}
        startTime={currentQuestion.startTime}
        autoplay
      />
      <Overlay show={!isPlaying}>
        <CountDown>{countdown}</CountDown>
      </Overlay>
    </VideoPlayer>
    
    <BuzzerArea>
      <BuzzerButton 
        onClick={handleBuzzer}
        disabled={buzzerLocked}
        pressed={buzzerPressed}
      >
        <BuzzerIcon />
        <BuzzerText>早押し！</BuzzerText>
      </BuzzerButton>
      
      {buzzerWinner && (
        <WinnerNotification>
          {buzzerWinner.name}さんが解答権獲得！
        </WinnerNotification>
      )}
    </BuzzerArea>
    
    <AnswerArea show={hasAnswerRight}>
      <AnswerInput
        placeholder="曲名を入力..."
        onSubmit={handleSubmitAnswer}
        disabled={!canAnswer}
      />
      <AnswerTimer>{answerTimeLeft}秒</AnswerTimer>
    </AnswerArea>
  </MainArea>
  
  <SidePanel>
    <PlayerList>
      {players.map(player => (
        <PlayerCard key={player.id}>
          <Avatar src={player.avatar} />
          <PlayerName>{player.name}</PlayerName>
          <PlayerScore>{player.score}</PlayerScore>
          <StatusIndicator status={player.status} />
        </PlayerCard>
      ))}
    </PlayerList>
    
    <ChatArea>
      <ChatMessages>
        {messages.map(msg => (
          <ChatMessage key={msg.id}>
            <MessageAuthor>{msg.author}</MessageAuthor>
            <MessageText>{msg.text}</MessageText>
          </ChatMessage>
        ))}
      </ChatMessages>
      <ChatInput onSend={handleSendMessage} />
    </ChatArea>
  </SidePanel>
</GameLayout>
```

## 4. コンポーネント設計

### 4.1 共通コンポーネント

#### Button コンポーネント
```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}

// 使用例
<Button 
  variant="primary" 
  size="large"
  loading={isSubmitting}
  icon={<PlayIcon />}
>
  ゲーム開始
</Button>
```

#### Card コンポーネント
```tsx
interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  interactive?: boolean;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

// 使用例
<Card variant="elevated" interactive>
  <CardHeader>
    <CardTitle>ルーム情報</CardTitle>
  </CardHeader>
  <CardBody>
    {/* コンテンツ */}
  </CardBody>
</Card>
```

### 4.2 ゲーム専用コンポーネント

#### BuzzerButton コンポーネント
```tsx
const BuzzerButton: React.FC<BuzzerButtonProps> = ({
  onPress,
  disabled,
  pressed,
  countdown
}) => {
  return (
    <motion.button
      className={cn(
        "buzzer-button",
        pressed && "buzzer-button--pressed",
        disabled && "buzzer-button--disabled"
      )}
      onClick={onPress}
      whileTap={{ scale: 0.95 }}
      animate={{
        backgroundColor: pressed ? '#FCD34D' : '#EF4444',
        boxShadow: pressed 
          ? '0 0 50px rgba(252, 211, 77, 0.5)'
          : '0 10px 30px rgba(239, 68, 68, 0.3)'
      }}
    >
      <div className="buzzer-inner">
        {countdown > 0 ? (
          <CountdownDisplay value={countdown} />
        ) : (
          <>
            <BellIcon className="buzzer-icon" />
            <span className="buzzer-text">PUSH!</span>
          </>
        )}
      </div>
      
      {pressed && (
        <motion.div
          className="buzzer-ripple"
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      )}
    </motion.button>
  );
};
```

#### ScoreBoard コンポーネント
```tsx
const ScoreBoard: React.FC<ScoreBoardProps> = ({ scores }) => {
  return (
    <div className="scoreboard">
      <AnimatePresence>
        {scores.map((score, index) => (
          <motion.div
            key={score.playerId}
            className="score-item"
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="rank">
              {index === 0 && <CrownIcon />}
              {index + 1}
            </div>
            <Avatar src={score.avatar} size="small" />
            <div className="player-name">{score.name}</div>
            <div className="score">
              <AnimatedNumber value={score.points} />
              <span className="unit">pts</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
```

## 5. アニメーション設計

### 5.1 マイクロインタラクション

```tsx
// Framer Motion設定
const animations = {
  // ボタンホバー
  buttonHover: {
    scale: 1.05,
    transition: { duration: 0.2 }
  },
  
  // 正解時のアニメーション
  correctAnswer: {
    scale: [1, 1.2, 1],
    rotate: [0, 10, -10, 0],
    transition: { duration: 0.5 }
  },
  
  // スコア増加
  scoreIncrease: {
    y: [-20, 0],
    opacity: [0, 1],
    transition: { duration: 0.3 }
  },
  
  // 画面遷移
  pageTransition: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 }
  }
};
```

### 5.2 ゲーム演出

```tsx
// 正解発表演出
const RevealAnswer: React.FC = ({ isCorrect, answer }) => {
  return (
    <motion.div
      className="reveal-container"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
    >
      {isCorrect ? (
        <>
          <Confetti />
          <CheckCircleIcon className="success-icon" />
          <h2>正解！</h2>
        </>
      ) : (
        <>
          <XCircleIcon className="error-icon" />
          <h2>残念...</h2>
        </>
      )}
      <p className="correct-answer">正解: {answer}</p>
    </motion.div>
  );
};
```

## 6. レスポンシブデザイン

### 6.1 ブレークポイント
```scss
$breakpoints: (
  'sm': 640px,   // Mobile
  'md': 768px,   // Tablet
  'lg': 1024px,  // Desktop
  'xl': 1280px,  // Large Desktop
  '2xl': 1536px  // Extra Large
);
```

### 6.2 レスポンシブレイアウト

#### モバイル最適化
```tsx
// モバイル用ゲーム画面
const MobileGameLayout: React.FC = () => {
  return (
    <div className="mobile-game">
      <div className="mobile-header">
        <RoundIndicator compact />
        <ScoreBadge />
      </div>
      
      <div className="mobile-video">
        <YouTubePlayer fullWidth />
      </div>
      
      <div className="mobile-buzzer">
        <BuzzerButton size="large" />
      </div>
      
      <BottomSheet>
        <TabBar>
          <Tab icon={<UsersIcon />} label="プレイヤー" />
          <Tab icon={<ChatIcon />} label="チャット" />
          <Tab icon={<TrophyIcon />} label="スコア" />
        </TabBar>
        <TabContent>
          {/* タブコンテンツ */}
        </TabContent>
      </BottomSheet>
    </div>
  );
};
```

## 7. アクセシビリティ

### 7.1 キーボードナビゲーション
```tsx
// キーボードショートカット
const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':  // スペースキー
          if (!buzzerLocked) handleBuzzerPress();
          break;
        case 'Enter':
          if (canSubmitAnswer) handleSubmitAnswer();
          break;
        case 'Escape':
          closeModal();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
};
```

### 7.2 スクリーンリーダー対応
```tsx
// ARIA属性の適用
<button
  aria-label="早押しボタン"
  aria-pressed={buzzerPressed}
  aria-disabled={buzzerLocked}
  role="button"
>
  <span className="sr-only">
    {buzzerPressed ? '押されました' : '早押し可能'}
  </span>
</button>

// ライブリージョン
<div aria-live="polite" aria-atomic="true">
  {currentPlayer}さんが解答権を獲得しました
</div>
```

## 8. パフォーマンス最適化

### 8.1 画像最適化
```tsx
// Next.js Image最適化
import Image from 'next/image';

<Image
  src={player.avatar}
  alt={player.name}
  width={40}
  height={40}
  loading="lazy"
  placeholder="blur"
  blurDataURL={avatarPlaceholder}
/>
```

### 8.2 コンポーネント最適化
```tsx
// メモ化
const PlayerCard = React.memo(({ player }) => {
  return (
    <div className="player-card">
      {/* プレイヤー情報 */}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.player.score === nextProps.player.score;
});

// 仮想スクロール
import { FixedSizeList } from 'react-window';

const PlayerList = ({ players }) => (
  <FixedSizeList
    height={600}
    itemCount={players.length}
    itemSize={80}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <PlayerCard player={players[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

## 9. エラー処理UI

### 9.1 エラー状態の表示
```tsx
// エラーバウンダリ
class ErrorBoundary extends React.Component {
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback>
          <ErrorIcon />
          <h2>エラーが発生しました</h2>
          <p>ページを再読み込みしてください</p>
          <Button onClick={() => window.location.reload()}>
            再読み込み
          </Button>
        </ErrorFallback>
      );
    }
    return this.props.children;
  }
}
```

### 9.2 接続状態の表示
```tsx
const ConnectionStatus: React.FC = () => {
  const { isConnected, isReconnecting } = useSocket();
  
  if (isConnected) return null;
  
  return (
    <div className="connection-status">
      {isReconnecting ? (
        <>
          <Spinner />
          <span>再接続中...</span>
        </>
      ) : (
        <>
          <AlertIcon />
          <span>接続が切断されました</span>
        </>
      )}
    </div>
  );
};
```

## 10. ユーザーテスト計画

### 10.1 テスト項目
| テスト項目 | 成功基準 | 優先度 |
|-----------|---------|--------|
| ルーム作成フロー | 3クリック以内で完了 | 高 |
| 早押しレスポンス | 体感遅延なし | 高 |
| モバイル操作性 | 片手で全操作可能 | 中 |
| エラー復帰 | 自動再接続成功 | 高 |

### 10.2 A/Bテスト
```typescript
// A/Bテスト設定
const variants = {
  buzzerDesign: {
    A: 'circular',
    B: 'rectangular'
  },
  scoreBoardPosition: {
    A: 'sidebar',
    B: 'bottom'
  }
};
```

## 11. まとめ

本UI/UX設計により、以下を実現：

1. **直感的操作**: シンプルで分かりやすいインターフェース
2. **楽しい体験**: アニメーションとゲーム演出
3. **高いアクセシビリティ**: WCAG準拠の設計
4. **優れたパフォーマンス**: 最適化されたレンダリング