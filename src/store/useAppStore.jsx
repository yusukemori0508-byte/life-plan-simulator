// src/store/useAppStore.jsx
// 共通ストア（React Context + useReducer）
//
// 全画面で共有する状態を一元管理する。
// 各画面コンポーネントは useAppStore() で state と actions を受け取る。

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from 'react';
import { gaugeToTreeLevel } from '../gaugeCalc.js';

// ─────────────────────────────────────────────────────────────
// デフォルトプロフィール（入力フォームの初期値）
// ─────────────────────────────────────────────────────────────
export const DEFAULT_PROFILE = {
  // ── 基本 ─────────────────────────────────────────────────
  currentAge:  30,
  region:      'other',    // 'tokyo' | 'osaka' | 'nagoya' | 'other'
  lifeType:    'couple',   // 'single' | 'couple' | 'family'
  nickname:    '',

  // ── 収入 ─────────────────────────────────────────────────
  selfIncome:        450,  // 万円/年
  incomeGrowthRate:  1.5,  // %/年
  spouseIncome:      300,  // 万円/年（0 = 配偶者なし）
  spouseReturnAge:   35,   // 配偶者が復職する年齢（配偶者の年齢基準）

  // ── 支出 ─────────────────────────────────────────────────
  monthlyExpense:  20,     // 万円/月
  educationPlan:   'public', // 'public' | 'mix_pub' | 'mix_pri' | 'private'

  // ── 資産 ─────────────────────────────────────────────────
  currentSavings:      150,  // 万円
  monthlyInvestment:     3,  // 万円/月
  investmentReturn:      5,  // %/年

  // ── ライフイベント（予定年齢トリガー） ──────────────────
  numChildren:         0,    // 0 | 1 | 2 | 3 | 4
  // childAges[i] = 親が何歳のときに第(i+1)子が生まれたか
  //   値 < currentAge  → すでに生まれている（子の現在年齢 = currentAge - childAges[i]）
  //   値 >= currentAge → これから生まれる（予定年齢）
  //   null             → 未設定
  childAges:        [null, null, null, null],
  firstChildAge:    null,    // 後方互換 — childAges[0] と同値
  housingPurchaseAge: 35,    // null = 予定なし
  // ── 車（買替周期型） ─────────────────────────────────────
  carOwnership:    false,   // 車を保有するか
  carFirstAge:     null,    // 最初の購入予定年齢（null = 未設定）
  carReplaceCycle: 7,       // 買替周期（年）
  carPrice:        250,     // 1台あたりの費用（万円）
  carPaymentType:  'cash',  // 'cash' | 'loan'

  jobChangeAge:     null,    // null = 予定なし

  // ── 既存借入・固定返済 ────────────────────────────────────
  // [{ id, type, label, monthlyPayment, endAge }]
  existingLoans: [],

  // ── 住宅ローン詳細 ─────────────────────────────────────
  propertyPrice:    3500,    // 万円（想定住宅価格）
  downPayment:       350,    // 万円（頭金）
  mortgageRate:      1.0,    // %/年（金利）
  mortgageTerm:       35,    // 年（借入年数）
  mortgageType:  'variable', // 'fixed' | 'variable'
  bonusRepayment:  false,    // ボーナス返済あり
  bonusRepaymentAmount: 20,  // ボーナス返済額（万円/年）

  // ── simulation.js 互換フィールド ─────────────────────────
  retirementAge:  65,
  lifespan:       90,

  // ── 子どもの年齢差（第2子以降のデフォルト間隔） ──────────
  childSpacing:   3,

  // ── 転職の方向性 ─────────────────────────────────────────
  jobChangeDirection: 'up',   // 'up' | 'down' | 'same'

  // ── 住宅スタイル ─────────────────────────────────────────
  housingStyle:  'mansion',   // 'mansion' | 'kodate'

  // ── 住宅維持費詳細（購入後の年間/月額コスト） ────────────
  managementFee: 2.5,   // 管理費・修繕積立（万円/月、マンションのみ）
  propertyTax:   15,    // 固定資産税（万円/年）
  parkingFee:    0,     // 駐車場代（万円/月）
  miscCostRate:  5,     // 購入諸費用率（%、登記・仲介・税など）

  // ── 支出カテゴリ（万円/月） ───────────────────────────────
  expHousing:       8,    // 家賃・住居費（住宅ローン以外）
  expUtilities:     2,    // 光熱費
  expCommunication: 1,    // 通信費
  expInsurance:     1.5,  // 保険料
  expFood:          5,    // 食費
  expDaily:         1,    // 日用品
  expSocial:        1,    // 交際費
  expEntertainment: 1,    // 娯楽・趣味
  expClothing:      1,    // 衣服・美容
  expChildcare:     0,    // 保育・教育（月次費用）
  expCarMaint:      0,    // 車維持費
  expMedical:       0.5,  // 医療費
  expAnnualExtra:   20,   // 年間臨時支出（万円/年：慶弔・家電等）
};

// ─────────────────────────────────────────────────────────────
// 初期状態
// ─────────────────────────────────────────────────────────────
const INITIAL_STATE = {
  // ── ナビゲーション ──────────────────────────────────────
  //   'home' | 'input' | 'simulation' | 'result' | 'timeline' | 'ranking'
  screen: 'home',

  // ── ユーザープロフィール ────────────────────────────────
  profileData: DEFAULT_PROFILE,

  // ── 生活余裕度ゲージ（0〜100） ─────────────────────────
  currentGauge: 50,

  // ── 木レベル（ゲージから自動導出）─────────────────────
  treeLevel: 2,

  // ── シミュレーション進行 ────────────────────────────────
  simCurrentAge:   null,   // 現在シミュレーション中の年齢
  triggeredEvents: [],     // 発火済みイベントID[]
  selectedChoices: [],     // [{ eventId, choiceId, label, gaugeDelta, age }]
  pendingEvent:    null,   // 現在表示中のイベント定義（null = なし）

  // ゲージ変化ログ（アニメーション判定・グラフ用）
  gaugeLog: [],            // [{ age, from, delta, to }]

  // ── 結果 ────────────────────────────────────────────────
  resultData: null,        // { rows, summary, improvements }

  // ── タイムライン ────────────────────────────────────────
  timelineData: [],        // 投稿カード[]

  // ── ランキング ──────────────────────────────────────────
  rankingState: {
    tab:      'match',     // 'match' | 'score' | 'income'
    category: 'all',       // 'all' | 'follow' | 'sameAge' | 'monthly'
  },
};

// ─────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────
const reducer = (state, action) => {
  switch (action.type) {

    // ── 画面遷移 ─────────────────────────────────────────
    case 'SET_SCREEN':
      return { ...state, screen: action.payload };

    // ── プロフィール更新（部分マージ） ───────────────────
    case 'SET_PROFILE':
      return {
        ...state,
        profileData: { ...state.profileData, ...action.payload },
      };

    // ── ゲージ絶対値セット ───────────────────────────────
    case 'SET_GAUGE': {
      const gauge = Math.max(0, Math.min(100, action.payload));
      return {
        ...state,
        currentGauge: gauge,
        treeLevel:    gaugeToTreeLevel(gauge),
      };
    }

    // ── ゲージ差分適用 ───────────────────────────────────
    case 'DELTA_GAUGE': {
      const from  = state.currentGauge;
      const to    = Math.max(0, Math.min(100, from + action.payload));
      const entry = {
        age:   state.simCurrentAge ?? state.profileData.currentAge,
        from,
        delta: action.payload,
        to,
      };
      return {
        ...state,
        currentGauge: to,
        treeLevel:    gaugeToTreeLevel(to),
        gaugeLog:     [...state.gaugeLog, entry],
      };
    }

    // ── シミュレーション年齢 ─────────────────────────────
    case 'SET_SIM_AGE':
      return { ...state, simCurrentAge: action.payload };

    // ── 発火済みイベント追加 ─────────────────────────────
    case 'ADD_TRIGGERED_EVENT':
      return {
        ...state,
        triggeredEvents: [...state.triggeredEvents, action.payload],
        pendingEvent:    null,
      };

    // ── 表示中イベントをセット ───────────────────────────
    case 'SET_PENDING_EVENT':
      return { ...state, pendingEvent: action.payload };

    // ── 選択肢を記録 ────────────────────────────────────
    case 'ADD_SELECTED_CHOICE':
      return {
        ...state,
        selectedChoices: [...state.selectedChoices, action.payload],
      };

    // ── 結果データ ───────────────────────────────────────
    case 'SET_RESULT':
      return { ...state, resultData: action.payload };

    // ── タイムラインデータ ───────────────────────────────
    case 'SET_TIMELINE':
      return { ...state, timelineData: action.payload };

    // ── ランキング表示設定 ───────────────────────────────
    case 'SET_RANKING_STATE':
      return {
        ...state,
        rankingState: { ...state.rankingState, ...action.payload },
      };

    // ── シミュレーション全体リセット ─────────────────────
    case 'RESET_SIMULATION':
      return {
        ...state,
        simCurrentAge:   state.profileData.currentAge,
        triggeredEvents: [],
        selectedChoices: [],
        pendingEvent:    null,
        gaugeLog:        [],
        resultData:      null,
      };

    // ── 完全リセット（最初からやり直し） ─────────────────
    case 'FULL_RESET':
      return INITIAL_STATE;

    default:
      return state;
  }
};

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────
const AppContext = createContext(null);

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // ── Actions（useCallback でメモ化・dispatch ラッパー） ──
  const setScreen = useCallback(
    (s) => dispatch({ type: 'SET_SCREEN', payload: s }), []);

  const setProfile = useCallback(
    (p) => dispatch({ type: 'SET_PROFILE', payload: p }), []);

  const setGauge = useCallback(
    (v) => dispatch({ type: 'SET_GAUGE', payload: v }), []);

  const deltaGauge = useCallback(
    (d) => dispatch({ type: 'DELTA_GAUGE', payload: d }), []);

  const setSimAge = useCallback(
    (a) => dispatch({ type: 'SET_SIM_AGE', payload: a }), []);

  const triggerEvent = useCallback(
    (id) => dispatch({ type: 'ADD_TRIGGERED_EVENT', payload: id }), []);

  const setPendingEvent = useCallback(
    (e) => dispatch({ type: 'SET_PENDING_EVENT', payload: e }), []);

  const selectChoice = useCallback(
    (c) => dispatch({ type: 'ADD_SELECTED_CHOICE', payload: c }), []);

  const setResult = useCallback(
    (r) => dispatch({ type: 'SET_RESULT', payload: r }), []);

  const setTimeline = useCallback(
    (t) => dispatch({ type: 'SET_TIMELINE', payload: t }), []);

  const setRanking = useCallback(
    (r) => dispatch({ type: 'SET_RANKING_STATE', payload: r }), []);

  const resetSimulation = useCallback(
    () => dispatch({ type: 'RESET_SIMULATION' }), []);

  const fullReset = useCallback(
    () => dispatch({ type: 'FULL_RESET' }), []);

  // ── actions オブジェクトをメモ化（不要な再レンダー防止） ─
  const actions = useMemo(() => ({
    setScreen,
    setProfile,
    setGauge,
    deltaGauge,
    setSimAge,
    triggerEvent,
    setPendingEvent,
    selectChoice,
    setResult,
    setTimeline,
    setRanking,
    resetSimulation,
    fullReset,
  }), [
    setScreen, setProfile, setGauge, deltaGauge, setSimAge,
    triggerEvent, setPendingEvent, selectChoice, setResult,
    setTimeline, setRanking, resetSimulation, fullReset,
  ]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────
export const useAppStore = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used inside <AppProvider>');
  return ctx;
};

// ─────────────────────────────────────────────────────────────
// 派生セレクター（state から頻用する値を取り出すヘルパー）
// ─────────────────────────────────────────────────────────────

/** 現在のゲージ色を返す（70 / 50 境界） */
export const selectGaugeColor = (state) => {
  const g = state.currentGauge;
  if (g >= 70) return '#16a34a';
  if (g >= 50) return '#f59e0b';
  return '#ef4444';
};

/** ゲージのステータスラベルを返す（5ゾーン: 85/70/50/30） */
export const selectGaugeStatus = (state) => {
  const g = state.currentGauge;
  if (g >= 85) return '安全圏';
  if (g >= 70) return '比較的安全';
  if (g >= 50) return '慎重判断';
  if (g >= 30) return '要見直し';
  return '高リスク';
};

/** 未発火の確定イベント数（バッジ表示用） */
export const selectPendingEventCount = (state) => {
  // eventTrigger は副作用なしでカウントだけ取れるよう後から追加可
  return state.pendingEvent ? 1 : 0;
};
