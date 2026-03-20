// src/constants.js

export const MIN_AGE = 18;
export const MAX_AGE = 100;

// ────────────────────────────────────────────────
// シナリオ定義
// ────────────────────────────────────────────────
export const SCENARIOS = {
  pessimistic: {
    key: 'pessimistic',
    label: '悲観',
    generalReturn: 0.01,
    nisaReturn: 0.02,
    idecoReturn: 0.015,
    inflation: 0.020,
    incomeGrowthMul: 0.5,
    color: '#ef4444',
    bg: '#fef2f2',
  },
  standard: {
    key: 'standard',
    label: '標準',
    generalReturn: 0.03,
    nisaReturn: 0.05,
    idecoReturn: 0.04,
    inflation: 0.015,
    incomeGrowthMul: 1.0,
    color: '#2563eb',
    bg: '#eff6ff',
  },
  optimistic: {
    key: 'optimistic',
    label: '楽観',
    generalReturn: 0.05,
    nisaReturn: 0.07,
    idecoReturn: 0.06,
    inflation: 0.010,
    incomeGrowthMul: 1.5,
    color: '#059669',
    bg: '#f0fdf4',
  },
};

// ────────────────────────────────────────────────
// 教育費（年間、万円）
// ────────────────────────────────────────────────
export const EDUCATION_ANNUAL_COST = {
  // [公立, 私立]
  nursery:     [18, 30],   // 保育園・幼稚園
  elementary:  [32, 166],  // 小学校
  juniorHigh:  [48, 140],  // 中学校
  highSchool:  [45, 100],  // 高校
  university:  [54, 130],  // 大学
};

// 子どもの年齢 → 学校種別マッピング
export const AGE_TO_SCHOOL = (age) => {
  if (age < 0)  return null;
  if (age <= 5)  return 'nursery';
  if (age <= 11) return 'elementary';
  if (age <= 14) return 'juniorHigh';
  if (age <= 17) return 'highSchool';
  if (age <= 21) return 'university';
  return null;
};

// 教育プリセット
export const EDUCATION_PRESETS = [
  {
    id: 'public',
    label: 'オール公立',
    icon: '🏫',
    description: '全て公立',
    type: 'public',
    totalEstimate: 800,
    settings: { nursery: 'public', elementary: 'public', juniorHigh: 'public', highSchool: 'public', university: 'public' },
  },
  {
    id: 'private',
    label: 'オール私立',
    icon: '🎓',
    description: '全て私立',
    type: 'private',
    totalEstimate: 2500,
    settings: { nursery: 'private', elementary: 'private', juniorHigh: 'private', highSchool: 'private', university: 'private' },
  },
  {
    id: 'mix_pub',
    label: '公立中心',
    icon: '📚',
    description: '大学のみ私立',
    type: 'mix',
    totalEstimate: 1200,
    settings: { nursery: 'public', elementary: 'public', juniorHigh: 'public', highSchool: 'public', university: 'private' },
  },
  {
    id: 'mix_pri',
    label: '私立中心',
    icon: '🏛️',
    description: '中学から私立',
    type: 'mix',
    totalEstimate: 1800,
    settings: { nursery: 'public', elementary: 'public', juniorHigh: 'private', highSchool: 'private', university: 'private' },
  },
];

// ────────────────────────────────────────────────
// NISA
// ────────────────────────────────────────────────
export const NISA_LIMITS = {
  annualMax: 360,      // 万円/年
  lifetimeMax: 1800,   // 万円（生涯投資枠）
};

// ────────────────────────────────────────────────
// iDeCo 月額上限（万円）
// ────────────────────────────────────────────────
export const IDECO_MONTHLY_LIMITS = {
  employee:     2.3,
  selfEmployed: 6.8,
};

// ────────────────────────────────────────────────
// 住宅ローン
// ────────────────────────────────────────────────
export const MORTGAGE = {
  defaultRate: 1.0,   // %
  defaultTerm: 35,    // 年
};

// ────────────────────────────────────────────────
// 年金
// ────────────────────────────────────────────────
export const PENSION = {
  receiveStartAge: 65,
  basicAnnual: 78,          // 国民年金（満額）万円/年
  kousei_rate: 0.005481,    // 厚生年金計算係数
};

// ────────────────────────────────────────────────
// 税率ブラケット（所得税）
// ────────────────────────────────────────────────
export const TAX_BRACKETS = [
  { min: 0,      max: 195,   rate: 0.05,  deduction: 0 },
  { min: 195,    max: 330,   rate: 0.10,  deduction: 9.75 },
  { min: 330,    max: 695,   rate: 0.20,  deduction: 42.75 },
  { min: 695,    max: 900,   rate: 0.23,  deduction: 63.6 },
  { min: 900,    max: 1800,  rate: 0.33,  deduction: 153.6 },
  { min: 1800,   max: 4000,  rate: 0.40,  deduction: 279.6 },
  { min: 4000,   max: Infinity, rate: 0.45, deduction: 479.6 },
];

export const idecoTaxRateOptions = [
  { value: 0,    label: '0%（課税所得なし）' },
  { value: 0.05, label: '5%（195万円以下）' },
  { value: 0.10, label: '10%（195〜330万円）' },
  { value: 0.20, label: '20%（330〜695万円）' },
  { value: 0.23, label: '23%（695〜900万円）' },
  { value: 0.33, label: '33%（900〜1800万円）' },
  { value: 0.40, label: '40%（1800〜4000万円）' },
  { value: 0.45, label: '45%（4000万円超）' },
];

export const idecoReceiveTaxRateOptions = [
  { value: 0,    label: '0%（退職所得控除内）' },
  { value: 0.05, label: '5%' },
  { value: 0.10, label: '10%' },
  { value: 0.15, label: '15%' },
  { value: 0.20, label: '20%' },
];

// ────────────────────────────────────────────────
// ライフイベントテンプレート
// ────────────────────────────────────────────────
export const LIFE_EVENT_TEMPLATES = [
  { id: 'wedding',      label: '結婚式',         icon: '💍', defaultAge: 30, defaultCost: 300 },
  { id: 'childbirth',   label: '出産費用',        icon: '👶', defaultAge: 31, defaultCost: 50  },
  { id: 'car',          label: '車購入',          icon: '🚗', defaultAge: 35, defaultCost: 200 },
  { id: 'travel',       label: '海外旅行',        icon: '✈️', defaultAge: 40, defaultCost: 50  },
  { id: 'reform',       label: '住宅リフォーム',  icon: '🛠️', defaultAge: 50, defaultCost: 300 },
  { id: 'parents',      label: '親の介護・費用',  icon: '🏥', defaultAge: 55, defaultCost: 200 },
  { id: 'college',      label: '子ども進学費用',  icon: '🎓', defaultAge: 45, defaultCost: 100 },
  { id: 'retire_trip',  label: '退職記念旅行',    icon: '🌏', defaultAge: 65, defaultCost: 100 },
  { id: 'funeral',      label: '葬儀・相続関連',  icon: '⛪', defaultAge: 70, defaultCost: 200 },
  { id: 'hobby',        label: '趣味・習い事',    icon: '🎸', defaultAge: 40, defaultCost: 50  },
  { id: 'pet',          label: 'ペット関連費用',  icon: '🐕', defaultAge: 35, defaultCost: 50  },
  { id: 'anniversary',  label: '記念イベント',    icon: '🎉', defaultAge: 50, defaultCost: 30  },
];

// ────────────────────────────────────────────────
// プリセット
// ────────────────────────────────────────────────
export const PRESETS = [
  {
    id: 'single_20s',
    label: '一人暮らし・20代',
    icon: '👤',
    description: '独身・社会人スタート',
    color: '#6366f1',
    bg: '#eef2ff',
    data: {
      currentAge: 25, retirementAge: 65, lifespan: 90,
      hasSpouse: false, children: [],
      selfIncome: 350, isSelfEmployed: false, incomeGrowthRate: 1.5,
      housingType: 'rent', monthlyRent: 8,
      monthlyExpense: 18, retireMonthlyExpense: 15,
      emergencyFund: 60, currentCash: 100, currentInvestment: 0, currentNisa: 0, currentIdeco: 0,
      nisaMonthly: 3, nisaCumContrib: 0, generalInvestMonthly: 0,
      idecoMonthly: 1.2, idecoTaxRate: 0.10, idecoReceiveTaxRate: 0,
      lifeEvents: [],
    },
  },
  {
    id: 'couple_30s',
    label: '共働き夫婦・30代',
    icon: '👫',
    description: '子なし・マンション購入検討',
    color: '#0891b2',
    bg: '#ecfeff',
    data: {
      currentAge: 32, retirementAge: 65, lifespan: 90,
      hasSpouse: true, spouseAge: 30, spouseIncome: 350, spouseIsWorking: true,
      spouseReturnToWorkAge: 35, spouseReturnToWorkIncome: 250,
      children: [],
      selfIncome: 550, isSelfEmployed: false, incomeGrowthRate: 1.5,
      housingType: 'future_purchase', purchaseAge: 35,
      propertyPrice: 5000, downPayment: 800, mortgageRate: 0.7, mortgageTerm: 35,
      monthlyExpense: 28, retireMonthlyExpense: 22,
      emergencyFund: 150, currentCash: 500, currentInvestment: 0, currentNisa: 100, currentIdeco: 0,
      nisaMonthly: 10, nisaCumContrib: 100, generalInvestMonthly: 0,
      idecoMonthly: 2.3, idecoTaxRate: 0.20, idecoReceiveTaxRate: 0,
      lifeEvents: [{ id: 'ev1', age: 34, label: '結婚式', cost: 300, icon: '💍' }],
    },
  },
  {
    id: 'family_30s',
    label: '子育て世帯・30代',
    icon: '👨‍👩‍👧',
    description: '子ども2人・教育費を考慮',
    color: '#16a34a',
    bg: '#f0fdf4',
    data: {
      currentAge: 35, retirementAge: 65, lifespan: 90,
      hasSpouse: true, spouseAge: 33, spouseIncome: 0, spouseIsWorking: false,
      spouseReturnToWorkAge: 38, spouseReturnToWorkIncome: 200,
      children: [
        { id: 'c1', currentAge: 5, educationPreset: 'mix_pub' },
        { id: 'c2', currentAge: 2, educationPreset: 'mix_pub' },
      ],
      selfIncome: 600, isSelfEmployed: false, incomeGrowthRate: 1.0,
      housingType: 'own',
      propertyPrice: 4500, downPayment: 500, mortgageRate: 1.0, mortgageTerm: 35,
      monthlyExpense: 35, retireMonthlyExpense: 25,
      emergencyFund: 200, currentCash: 600, currentInvestment: 0, currentNisa: 200, currentIdeco: 50,
      nisaMonthly: 5, nisaCumContrib: 200, generalInvestMonthly: 0,
      idecoMonthly: 2.3, idecoTaxRate: 0.20, idecoReceiveTaxRate: 0,
      lifeEvents: [],
    },
  },
  {
    id: 'couple_50s',
    label: '老後準備・50代',
    icon: '👴👵',
    description: '子ども独立・老後を見据える',
    color: '#d97706',
    bg: '#fffbeb',
    data: {
      currentAge: 52, retirementAge: 65, lifespan: 90,
      hasSpouse: true, spouseAge: 50, spouseIncome: 200, spouseIsWorking: true,
      spouseReturnToWorkAge: 60, spouseReturnToWorkIncome: 100,
      children: [],
      selfIncome: 700, isSelfEmployed: false, incomeGrowthRate: 0.5,
      housingType: 'own',
      propertyPrice: 4000, downPayment: 1000, mortgageRate: 1.5, mortgageTerm: 20,
      monthlyExpense: 30, retireMonthlyExpense: 25,
      emergencyFund: 300, currentCash: 1500, currentInvestment: 500, currentNisa: 300, currentIdeco: 200,
      nisaMonthly: 10, nisaCumContrib: 300, generalInvestMonthly: 5,
      idecoMonthly: 2.3, idecoTaxRate: 0.23, idecoReceiveTaxRate: 0.10,
      lifeEvents: [{ id: 'ev1', age: 60, label: '住宅リフォーム', cost: 300, icon: '🛠️' }],
    },
  },
  {
    id: 'freelance',
    label: 'フリーランス',
    icon: '💻',
    description: '自営業・国民年金・iDeCo活用',
    color: '#7c3aed',
    bg: '#f5f3ff',
    data: {
      currentAge: 30, retirementAge: 65, lifespan: 90,
      hasSpouse: false, children: [],
      selfIncome: 500, isSelfEmployed: true, incomeGrowthRate: 2.0,
      housingType: 'rent', monthlyRent: 10,
      monthlyExpense: 22, retireMonthlyExpense: 18,
      emergencyFund: 150, currentCash: 300, currentInvestment: 50, currentNisa: 50, currentIdeco: 30,
      nisaMonthly: 5, nisaCumContrib: 50, generalInvestMonthly: 0,
      idecoMonthly: 6.8, idecoTaxRate: 0.20, idecoReceiveTaxRate: 0,
      lifeEvents: [],
    },
  },
  {
    id: 'custom',
    label: 'カスタム',
    icon: '✏️',
    description: '自分で全て入力する',
    color: '#475569',
    bg: '#f8fafc',
    data: {},
  },
];

// ────────────────────────────────────────────────
// ステップ定義
// ────────────────────────────────────────────────
export const STEPS = [
  { id: 'basic',   index: 0, label: '基本',   icon: '👤', title: '基本情報',   description: '年齢・退職・寿命' },
  { id: 'family',  index: 1, label: '家族',   icon: '👨‍👩‍👧', title: '家族情報',   description: '配偶者・子ども' },
  { id: 'income',  index: 2, label: '収入',   icon: '💼', title: '収入情報',   description: '年収・iDeCo' },
  { id: 'housing', index: 3, label: '住居',   icon: '🏠', title: '住居情報',   description: '賃貸・購入・ローン' },
  { id: 'expense', index: 4, label: '支出',   icon: '💰', title: '生活費・資産', description: '支出・現在資産' },
  { id: 'nisa',    index: 5, label: 'NISA',   icon: '💹', title: 'NISA・投資',  description: '積立・生涯枠' },
  { id: 'events',  index: 6, label: 'イベント', icon: '📌', title: 'ライフイベント', description: '一時的な支出' },
  { id: 'result',  index: 7, label: '結果',   icon: '📊', title: 'シミュレーション結果', description: '' },
];

// ────────────────────────────────────────────────
// 結果タブ
// ────────────────────────────────────────────────
export const RESULT_TABS = [
  { id: 'summary',   label: 'サマリー', icon: '📋' },
  { id: 'assets',    label: '資産推移', icon: '💹' },
  { id: 'cashflow',  label: '収支推移', icon: '💰' },
  { id: 'education', label: '教育費',   icon: '🎓' },
  { id: 'detail',    label: '詳細表',   icon: '📄' },
  { id: 'scenario',  label: 'シナリオ', icon: '🔀' },
  { id: 'advice',    label: '改善提案', icon: '💡' },
];

// ────────────────────────────────────────────────
// カラーパレット
// ────────────────────────────────────────────────
export const COLORS = {
  primary:      '#4CAF7A',   // ナチュラルグリーン
  primaryLight: '#6FCF97',   // 若葉グリーン
  primaryDark:  '#2d7a52',   // 深い森
  secondary:    '#FFA94D',   // 木の実オレンジ
  accent:       '#7CC7FF',   // 空色アクセント
  success:      '#6FCF97',   // 若葉
  warning:      '#FFA94D',   // アンバー
  danger:       '#E05555',
  text:         '#2F4F3E',   // ダークグリーンテキスト
  textMuted:    '#6b8878',   // ミュートグリーン
  border:       '#d0e8cc',   // 淡いグリーンボーダー
  bgLight:      '#EEF6EC',   // 薄いグリーンアイボリー
  bgWhite:      '#F6F8F2',   // アイボリー（仕様: #F6F8F2）
  // チャート用（自然色）
  chart: {
    cash:       '#6FCF97',   // 若葉グリーン
    investment: '#4CAF7A',   // ナチュラルグリーン
    nisa:       '#FFA94D',   // 木の実オレンジ
    ideco:      '#FFD090',   // 薄いアンバー
    income:     '#7CC7FF',   // 空色
    expense:    '#FF8B70',   // テラコッタ
    cashflow:   '#2F4F3E',   // ダークグリーン
  },
};

// ────────────────────────────────────────────────
// バリデーションルール
// ────────────────────────────────────────────────
export const VALIDATION_RULES = {
  retirementAge: { min: 40, max: 80 },
  lifespan:      { min: 60, max: MAX_AGE },
  mortgageRatio: { warnAt: 5, dangerAt: 7 },
  retireExpenseRatio: { warnAt: 1.5 },
};

// ────────────────────────────────────────────────
// localStorage キー
// ────────────────────────────────────────────────
export const STORAGE_KEYS = {
  formData:    'lifePlan_formData',
  currentStep: 'lifePlan_currentStep',
  lastSaved:   'lifePlan_lastSaved',
};

// ────────────────────────────────────────────────
// デフォルトフォーム
// ────────────────────────────────────────────────
export const DEFAULT_FORM = {
  // 基本
  currentAge:    30,
  retirementAge: 65,
  lifespan:      90,
  // 家族
  hasSpouse:              false,
  spouseAge:              28,
  spouseIncome:           300,
  spouseIsWorking:        true,
  spouseReturnToWorkAge:  35,
  spouseReturnToWorkIncome: 200,
  children:               [],
  // 収入
  selfIncome:         400,
  isSelfEmployed:     false,
  incomeGrowthRate:   1.0,
  idecoMonthly:       0,
  idecoTaxRate:       0.20,
  idecoReceiveTaxRate:0,
  // 住居
  housingType:    'rent',
  monthlyRent:    8,
  propertyPrice:  4000,
  downPayment:    400,
  mortgageRate:   1.0,
  mortgageTerm:   35,
  purchaseAge:    35,
  // 支出・資産
  monthlyExpense:       20,
  retireMonthlyExpense: 15,
  emergencyFund:        100,
  currentCash:          200,
  currentInvestment:    0,
  currentNisa:          0,
  currentIdeco:         0,
  // NISA
  nisaMonthly:          3,
  nisaCumContrib:       0,
  generalInvestMonthly: 0,
  // イベント
  lifeEvents: [],
};

// ────────────────────────────────────────────────
// 診断レベル
// ────────────────────────────────────────────────
export const DIAGNOSIS_LEVELS = {
  critical: { label: '要注意',   color: '#E05555', bg: '#fff0f0', border: '#ffd0d0', icon: '🍂' },
  warning:  { label: '注意',     color: '#e8854a', bg: '#fff5eb', border: '#f5d8a8', icon: '⚠️' },
  caution:  { label: 'やや注意', color: '#5a9fd4', bg: '#eef5ff', border: '#b8d8f5', icon: '🌱' },
  good:     { label: '良好',     color: '#4CAF7A', bg: '#edfaf4', border: '#b8e8cf', icon: '🌿' },
  great:    { label: '優秀',     color: '#2d7a52', bg: '#e0f5e8', border: '#a0d8ba', icon: '🌳' },
};

// チャートデフォルト
export const CHART_DEFAULTS = {
  margin: { top: 8, right: 8, left: 0, bottom: 0 },
};
