// src/eventData.js
// ライフイベント定義（仕様⑥⑦）
// 各選択肢に gaugeDelta を持たせ、選択 → 即時ゲージ反映

// ─────────────────────────────────────────────────────────────
// イベント定義マップ
// id        : 一意識別子（eventTrigger.js と対応）
// icon      : 絵文字アイコン
// title     : カードタイトル
// description: サブテキスト
// category  : 'housing' | 'family' | 'career' | 'life' | 'risk'
// choices[] :
//   id         : 選択肢ID
//   label      : ボタン表示テキスト
//   sub        : 補足（金額・効果）
//   gaugeDelta : ゲージ増減（clamp 0〜100 は呼び出し側で実施）
//   incomeBoost: 年収変動（万円/年、正＝増加 負＝減少）
//   costOnce   : 一時費用（万円、シミュレーション反映用）
// ─────────────────────────────────────────────────────────────

export const EVENT_DEFS = {

  // ── 住宅購入 ────────────────────────────────────────────────
  housing: {
    id: 'housing',
    icon: '🏠',
    title: '住宅購入のタイミングです',
    description: '夢のマイホーム。どうする？',
    category: 'housing',
    choices: [
      {
        id: 'expensive',
        label: '高価格住宅を購入',
        sub: '7,000万円前後',
        gaugeDelta: -18,
        costOnce: 7000,
        incomeBoost: 0,
      },
      {
        id: 'mid',
        label: '中価格住宅を購入',
        sub: '4,500万円前後',
        gaugeDelta: -10,
        costOnce: 4500,
        incomeBoost: 0,
      },
      {
        id: 'skip',
        label: '賃貸を継続する',
        sub: 'まだ様子を見る',
        gaugeDelta: 0,
        costOnce: 0,
        incomeBoost: 0,
      },
    ],
  },

  // ── 第1子誕生 ────────────────────────────────────────────────
  child_0: {
    id: 'child_0',
    icon: '👶',
    title: '第1子が誕生します',
    description: 'おめでとうございます！教育プランを選んでください。',
    category: 'family',
    choices: [
      {
        id: 'public',
        label: 'オール公立で育てる',
        sub: '総費用〜800万円',
        gaugeDelta: -8,
        costOnce: 0,
        eduPlan: 'public',
      },
      {
        id: 'mixed',
        label: '公立中心・大学は私立',
        sub: '総費用〜1,200万円',
        gaugeDelta: -12,
        costOnce: 0,
        eduPlan: 'mix_pub',
      },
      {
        id: 'private',
        label: '私立中心で育てる',
        sub: '総費用〜2,500万円',
        gaugeDelta: -18,
        costOnce: 0,
        eduPlan: 'mix_pri',
      },
    ],
  },

  // ── 第2子誕生（追加質問）───────────────────────────────────
  child_add: {
    id: 'child_add',
    icon: '👶',
    title: 'もう1人、考えていますか？',
    description: '2人目の選択が将来の家計に影響します。',
    category: 'family',
    choices: [
      {
        id: 'add',
        label: 'もう1人産む',
        sub: '家族が増える',
        gaugeDelta: -12,
        costOnce: 0,
      },
      {
        id: 'delay',
        label: '3年後に延期',
        sub: 'もう少し様子を見る',
        gaugeDelta: -4,
        costOnce: 0,
      },
      {
        id: 'skip',
        label: '1人で十分',
        sub: 'このまま進む',
        gaugeDelta: 0,
        costOnce: 0,
      },
    ],
  },

  // ── 車購入 ──────────────────────────────────────────────────
  car: {
    id: 'car',
    icon: '🚗',
    title: '車の購入タイミングです',
    description: 'マイカーを持ちますか？',
    category: 'life',
    choices: [
      {
        id: 'new',
        label: '新車を購入',
        sub: '〜300万円',
        gaugeDelta: -8,
        costOnce: 300,
        incomeBoost: 0,
      },
      {
        id: 'used',
        label: '中古車を購入',
        sub: '〜100万円',
        gaugeDelta: -4,
        costOnce: 100,
        incomeBoost: 0,
      },
      {
        id: 'skip',
        label: '今は見送る',
        sub: 'カーシェア活用',
        gaugeDelta: 0,
        costOnce: 0,
        incomeBoost: 0,
      },
    ],
  },

  // ── 転職 ────────────────────────────────────────────────────
  jobChange: {
    id: 'jobChange',
    icon: '💼',
    title: '転職のタイミングです',
    description: 'キャリアの分岐点。どう動く？',
    category: 'career',
    choices: [
      {
        id: 'up',
        label: '年収アップ転職',
        sub: '+100万円/年',
        gaugeDelta: +12,
        costOnce: 0,
        incomeBoost: 100,
      },
      {
        id: 'stay',
        label: '現職にとどまる',
        sub: '安定を選ぶ',
        gaugeDelta: 0,
        costOnce: 0,
        incomeBoost: 0,
      },
      {
        id: 'down',
        label: '年収ダウン転職',
        sub: '−80万円/年',
        gaugeDelta: -10,
        costOnce: 0,
        incomeBoost: -80,
      },
    ],
  },

  // ── 副業チャンス ─────────────────────────────────────────────
  sideBusiness: {
    id: 'sideBusiness',
    icon: '💡',
    title: '副業チャンスが来ました',
    description: '月5万円ほどの副収入が見込めます。',
    category: 'career',
    choices: [
      {
        id: 'start',
        label: '副業を始める',
        sub: '+60万円/年',
        gaugeDelta: +8,
        costOnce: 0,
        incomeBoost: 60,
      },
      {
        id: 'skip',
        label: '今は見送る',
        sub: '本業に集中',
        gaugeDelta: 0,
        costOnce: 0,
        incomeBoost: 0,
      },
    ],
  },

  // ── 病気・ケガ ───────────────────────────────────────────────
  illness: {
    id: 'illness',
    icon: '🏥',
    title: '体調を崩しました',
    description: '突然の医療費。どう対応しますか？',
    category: 'risk',
    choices: [
      {
        id: 'full',
        label: '入院・手術する',
        sub: '〜100万円',
        gaugeDelta: -8,
        costOnce: 100,
        incomeBoost: 0,
      },
      {
        id: 'minor',
        label: '通院でケアする',
        sub: '〜20万円',
        gaugeDelta: -3,
        costOnce: 20,
        incomeBoost: 0,
      },
    ],
  },

  // ── 相続・贈与 ───────────────────────────────────────────────
  inheritance: {
    id: 'inheritance',
    icon: '💰',
    title: '親から相続がありました',
    description: '思いがけない資産をどう使う？',
    category: 'life',
    choices: [
      {
        id: 'invest',
        label: '全額投資に回す',
        sub: '+500万円運用',
        gaugeDelta: +10,
        costOnce: -500,   // 負値 = 資産増加
        incomeBoost: 0,
      },
      {
        id: 'repay',
        label: 'ローン繰上返済',
        sub: '利子を節約',
        gaugeDelta: +7,
        costOnce: -500,
        incomeBoost: 0,
      },
      {
        id: 'spend',
        label: '生活を豊かにする',
        sub: '今を楽しむ',
        gaugeDelta: +3,
        costOnce: -300,
        incomeBoost: 0,
      },
    ],
  },

  // ── 保育園・幼稚園入園 ─────────────────────────────────────
  edu_nursery: {
    id:          'edu_nursery',
    icon:        '🧒',
    baseTitle:   '保育園・幼稚園',
    title:       '保育園・幼稚園に入ります',
    description: '保育施設をどうしますか？',
    category:    'family',
    choices: [
      {
        id:         'public_nursery',
        label:      '認可保育所（公立）',
        sub:        '年間〜20万円',
        gaugeDelta: -3,
        costOnce:   0,
      },
      {
        id:         'private_nursery',
        label:      '認可外・私立幼稚園',
        sub:        '年間〜60万円',
        gaugeDelta: -7,
        costOnce:   0,
      },
    ],
  },

  // ── 小学校入学 ────────────────────────────────────────────
  edu_elementary: {
    id:          'edu_elementary',
    icon:        '📚',
    baseTitle:   '小学校入学',
    title:       '小学校に入学します',
    description: '教育方針を選んでください。',
    category:    'family',
    choices: [
      {
        id:         'public',
        label:      '公立小学校',
        sub:        '年間〜30万円',
        gaugeDelta: -4,
        costOnce:   0,
      },
      {
        id:         'private',
        label:      '私立小学校',
        sub:        '年間〜100万円',
        gaugeDelta: -11,
        costOnce:   0,
      },
    ],
  },

  // ── 中学校入学 ────────────────────────────────────────────
  edu_junior_high: {
    id:          'edu_junior_high',
    icon:        '🏫',
    baseTitle:   '中学校入学',
    title:       '中学校に入学します',
    description: '公立・私立どちらにしますか？',
    category:    'family',
    choices: [
      {
        id:         'public',
        label:      '公立中学校',
        sub:        '年間〜40万円',
        gaugeDelta: -5,
        costOnce:   0,
      },
      {
        id:         'private',
        label:      '私立中学校',
        sub:        '年間〜130万円',
        gaugeDelta: -13,
        costOnce:   0,
      },
    ],
  },

  // ── 高校入学 ──────────────────────────────────────────────
  edu_high_school: {
    id:          'edu_high_school',
    icon:        '🎒',
    baseTitle:   '高校入学',
    title:       '高校に入学します',
    description: '公立・私立どちらにしますか？',
    category:    'family',
    choices: [
      {
        id:         'public',
        label:      '公立高校',
        sub:        '年間〜50万円',
        gaugeDelta: -5,
        costOnce:   0,
      },
      {
        id:         'private',
        label:      '私立高校',
        sub:        '年間〜110万円',
        gaugeDelta: -11,
        costOnce:   0,
      },
    ],
  },

  // ── 大学入学 ──────────────────────────────────────────────
  edu_university: {
    id:          'edu_university',
    icon:        '🎓',
    baseTitle:   '大学入学',
    title:       '大学に入学します',
    description: '進学先を選んでください。',
    category:    'family',
    choices: [
      {
        id:         'national',
        label:      '国公立大学',
        sub:        '4年間〜250万円',
        gaugeDelta: -8,
        costOnce:   250,
      },
      {
        id:         'private',
        label:      '私立大学（文系）',
        sub:        '4年間〜400万円',
        gaugeDelta: -14,
        costOnce:   400,
      },
      {
        id:         'private_sci',
        label:      '私立大学（理系・医系）',
        sub:        '4年間〜600万円以上',
        gaugeDelta: -20,
        costOnce:   600,
      },
    ],
  },

  // ── 投資機会 ─────────────────────────────────────────────────
  investOpportunity: {
    id: 'investOpportunity',
    icon: '📈',
    title: '投資の見直し時期です',
    description: '積立額を変えてみませんか？',
    category: 'career',
    choices: [
      {
        id: 'increase',
        label: '月1万円増やす',
        sub: '年12万円追加',
        gaugeDelta: -5,   // 今の余裕は減るが将来は増える
        costOnce: 0,
        monthlyInvestBoost: 1,
      },
      {
        id: 'stay',
        label: '現状維持',
        sub: 'このまま続ける',
        gaugeDelta: 0,
        costOnce: 0,
        monthlyInvestBoost: 0,
      },
      {
        id: 'decrease',
        label: '月1万円減らす',
        sub: '生活費に充てる',
        gaugeDelta: +4,
        costOnce: 0,
        monthlyInvestBoost: -1,
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// イベントカテゴリ → ラベル・カラー
// ─────────────────────────────────────────────────────────────
export const CATEGORY_META = {
  housing: { label: '住宅',   color: '#0ea5e9', bg: '#f0f9ff' },
  family:  { label: '家族',   color: '#ec4899', bg: '#fdf2f8' },
  career:  { label: 'キャリア', color: '#8b5cf6', bg: '#f5f3ff' },
  life:    { label: 'ライフ',  color: '#f59e0b', bg: '#fffbeb' },
  risk:    { label: 'リスク',  color: '#ef4444', bg: '#fef2f2' },
};

// ─────────────────────────────────────────────────────────────
// ランダムイベントプール（年齢指定なしで確率発生）
// ─────────────────────────────────────────────────────────────
export const RANDOM_EVENT_POOL = [
  { eventId: 'sideBusiness',      probability: 0.20 },  // 20%/年
  { eventId: 'illness',           probability: 0.10 },  // 10%/年
  { eventId: 'inheritance',       probability: 0.05 },  // 5%/年
  { eventId: 'investOpportunity', probability: 0.15 },  // 15%/年
];

// イベントIDリスト（store / trigger で利用）
export const EVENT_IDS = Object.keys(EVENT_DEFS);
