// src/App.jsx
// 画面遷移骨格
//
// ルーティング方針:
//   home → input → simulation → result → timeline / ranking
//
// 各画面コンポーネントは useAppStore() で state と actions を参照する。
// このファイル自体は「どの画面を表示するか」だけを担当する。

import React from 'react';
import { AppProvider, useAppStore } from './store/useAppStore.jsx';
import { HomeScreen }       from './components/HomeScreen.jsx';
import { InputScreen }      from './components/InputScreen.jsx';
import { SimulationScreen } from './components/SimulationScreen.jsx';
import { ResultScreen }     from './components/ResultScreen.jsx';
import { ActionPage }       from './components/ActionPage.jsx';

// ── 未実装画面のプレースホルダー ──────────────────────────────
// 後続のステップで順次差し替える
const PlaceholderScreen = ({ title, icon, onBack }) => {
  const style = {
    wrap: {
      minHeight:      '100vh',
      background:     '#f8fafb',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            16,
      padding:        32,
    },
    icon: {
      fontSize: 56,
      lineHeight: 1,
    },
    title: {
      fontSize:   18,
      fontWeight: 800,
      color:      '#1a2e1a',
      textAlign:  'center',
    },
    badge: {
      fontSize:     11,
      fontWeight:   700,
      color:        '#888',
      background:   '#f0f0f0',
      padding:      '4px 12px',
      borderRadius: 999,
      letterSpacing: '0.06em',
    },
    btn: {
      marginTop:    20,
      padding:      '12px 28px',
      borderRadius: 999,
      border:       '1.5px solid #dde5dd',
      background:   '#fff',
      fontSize:     14,
      fontWeight:   700,
      cursor:       'pointer',
      color:        '#4a6a4a',
    },
  };

  return (
    <div style={style.wrap}>
      <div style={style.icon}>{icon}</div>
      <div style={style.title}>{title}</div>
      <div style={style.badge}>実装中</div>
      <button style={style.btn} onClick={onBack}>← 戻る</button>
    </div>
  );
};

// ── 画面ルーター ────────────────────────────────────────────────
const AppRouter = () => {
  const { state, actions } = useAppStore();
  const { screen } = state;

  // ── ページ遷移ハンドラを集約（コンポーネントに props で渡す） ──
  const nav = {
    toInput:      () => actions.setScreen('input'),
    toSimulation: () => {
      actions.resetSimulation();
      actions.setScreen('simulation');
    },
    toResult:     () => actions.setScreen('result'),
    toAction:     () => actions.setScreen('action'),
    toTimeline:   () => actions.setScreen('timeline'),
    toRanking:    () => actions.setScreen('ranking'),
    toHome:       () => actions.setScreen('home'),
    back: {
      fromInput:      () => actions.setScreen('home'),
      fromSimulation: () => actions.setScreen('input'),
      fromResult:     () => actions.setScreen('simulation'),
      fromAction:     () => actions.setScreen('result'),
      fromTimeline:   () => actions.setScreen('result'),
      fromRanking:    () => actions.setScreen('timeline'),
    },
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', overflow: 'hidden' }}>

      {/* ① ホーム画面 */}
      {screen === 'home' && (
        <HomeScreen
          onStart={nav.toInput}
        />
      )}

      {/* ② 入力画面 */}
      {screen === 'input' && (
        <InputScreen
          onBack={nav.back.fromInput}
          onNext={nav.toSimulation}
        />
      )}

      {/* ③ シミュレーション画面 */}
      {screen === 'simulation' && (
        <SimulationScreen
          onBack={nav.back.fromSimulation}
          onFinish={nav.toResult}
        />
      )}

      {/* ④ 結果画面 */}
      {screen === 'result' && (
        <ResultScreen
          onBack={nav.back.fromResult}
          onRestart={nav.toInput}
        />
      )}

      {/* ⑤ アクションページ */}
      {screen === 'action' && (
        <ActionPage
          profileData={state.profileData}
          result={state.resultData}
          onBack={nav.back.fromAction}
        />
      )}

      {/* ⑥ タイムライン（実装中） */}
      {screen === 'timeline' && (
        <PlaceholderScreen
          title="タイムライン"
          icon="🌐"
          onBack={nav.back.fromTimeline}
        />
      )}

      {/* ⑥ ランキング（実装中） */}
      {screen === 'ranking' && (
        <PlaceholderScreen
          title="ランキング"
          icon="🏆"
          onBack={nav.back.fromRanking}
        />
      )}

    </div>
  );
};

// ── エントリーポイント ───────────────────────────────────────────
// AppProvider でアプリ全体をラップし、共通ストアを注入する
export const App = () => (
  <AppProvider>
    <AppRouter />
  </AppProvider>
);
