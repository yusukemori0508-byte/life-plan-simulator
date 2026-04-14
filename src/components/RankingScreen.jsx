// src/components/RankingScreen.jsx
// 比較ランキング画面
// バックエンドなしのため、同ライフタイプの仮想ユーザーを生成してスコアを比較する

import React from 'react';
import { useAppStore } from '../store/useAppStore.jsx';
import { calcInitialGauge } from '../gaugeCalc.js';

// ─────────────────────────────────────────────────────────────
// カラー定数
// ─────────────────────────────────────────────────────────────
const C = {
  bg:        '#f4f7f4',
  white:     '#ffffff',
  text:      '#111827',
  textMuted: '#6b7280',
  border:    '#e5e7eb',
  green:     '#16a34a',
  greenBg:   '#f0fdf4',
  greenLight:'#bbf7d0',
  amber:     '#f59e0b',
  amberBg:   '#fffbeb',
  red:       '#ef4444',
  redBg:     '#fef2f2',
  gold:      '#f59e0b',
  silver:    '#9ca3af',
  bronze:    '#b45309',
};

// ─────────────────────────────────────────────────────────────
// タブ定義
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'score',  label: 'スコア順' },
  { id: 'income', label: '年収順'   },
  { id: 'match',  label: '同タイプ' },
];

// ─────────────────────────────────────────────────────────────
// ライフタイプ定義
// ─────────────────────────────────────────────────────────────
const LIFE_TYPE_LABELS = {
  single: '一人暮らし',
  couple: '共働き',
  family: '子育て中',
};

// ─────────────────────────────────────────────────────────────
// 仮想ユーザー名プール
// ─────────────────────────────────────────────────────────────
const NAMES = [
  'さくらさん', 'たけしさん', 'みのりさん', 'こうじさん', 'あいさん',
  'りょうさん', 'なつみさん', 'けんたさん', 'ゆかさん', 'だいすけさん',
  'はるかさん', 'まさとさん', 'えりさん', 'たかしさん', 'のりこさん',
  'しんじさん', 'めぐみさん', 'ともやさん', 'かなさん', 'ひろしさん',
];

// アバター絵文字プール
const AVATARS = ['🌸', '🌿', '🌻', '🍀', '🌺', '🌾', '🌼', '🍃', '🌷', '🌱',
                 '🌲', '🍂', '🎋', '🪴', '🌴', '🌵', '🌾', '🪻', '🌹', '🫧'];

// ─────────────────────────────────────────────────────────────
// 疑似乱数（シード値ベース — 同じ入力で常に同じ結果）
// ─────────────────────────────────────────────────────────────
const seededRand = (seed) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
};

// ─────────────────────────────────────────────────────────────
// 仮想ユーザーを生成してスコア計算
// ─────────────────────────────────────────────────────────────
const generateMockUsers = (profileData) => {
  const rand   = seededRand(42);
  const myAge  = Number(profileData.currentAge ?? 30);
  const myType = profileData.lifeType ?? 'couple';

  // ライフタイプ別のベースパラメータ
  const BASE_PARAMS = {
    single: { incomeRange: [280, 620], expRange: [12, 22], investRange: [1, 5], savingsRange: [50, 300] },
    couple: { incomeRange: [500, 900], expRange: [20, 35], investRange: [3, 10], savingsRange: [100, 500] },
    family: { incomeRange: [550, 950], expRange: [25, 40], investRange: [2, 8],  savingsRange: [80, 400] },
  };
  const types = ['single', 'couple', 'family'];

  const users = NAMES.slice(0, 18).map((name, i) => {
    const lifeType = i < 6 ? myType : types[i % 3]; // 最初の6人は同タイプ
    const base     = BASE_PARAMS[lifeType] ?? BASE_PARAMS.couple;

    const selfIncome      = Math.round(base.incomeRange[0] + rand() * (base.incomeRange[1] - base.incomeRange[0]));
    const spouseIncome    = lifeType !== 'single' ? Math.round(150 + rand() * 250) : 0;
    const monthlyExpense  = Math.round((base.expRange[0] + rand() * (base.expRange[1] - base.expRange[0])) * 10) / 10;
    const monthlyInvest   = Math.round((base.investRange[0] + rand() * (base.investRange[1] - base.investRange[0])) * 10) / 10;
    const currentSavings  = Math.round(base.savingsRange[0] + rand() * (base.savingsRange[1] - base.savingsRange[0]));
    const age             = Math.round(myAge - 5 + rand() * 10);
    const numChildren     = lifeType === 'single' ? 0 : Math.round(rand() * 2);
    const housePurchAge   = rand() > 0.4 ? Math.round(age + 1 + rand() * 8) : null;

    const profile = {
      selfIncome,
      spouseIncome,
      monthlyExpense,
      monthlyInvestment: monthlyInvest,
      currentSavings,
      currentAge: age,
      lifeType,
      numChildren,
      childAges: numChildren > 0 ? [Math.round(age - 3 + rand() * 6)] : [null, null, null, null],
      housingPurchaseAge: housePurchAge,
      propertyPrice: 3500,
      downPayment: 350,
      mortgageRate: 1.0,
      mortgageTerm: 35,
      existingLoans: [],
    };

    const gaugeResult = calcInitialGauge(profile);

    return {
      id:        i,
      name,
      avatar:    AVATARS[i % AVATARS.length],
      age,
      lifeType,
      selfIncome,
      spouseIncome,
      totalIncome: selfIncome + spouseIncome,
      score:       gaugeResult.gauge,
      isMe:        false,
    };
  });

  // 自分を追加
  const myGauge = calcInitialGauge(profileData);
  const me = {
    id:          999,
    name:        profileData.nickname || 'あなた',
    avatar:      '🌳',
    age:         myAge,
    lifeType:    myType,
    selfIncome:  Number(profileData.selfIncome ?? 0),
    spouseIncome:Number(profileData.spouseIncome ?? 0),
    totalIncome: Number(profileData.selfIncome ?? 0) + Number(profileData.spouseIncome ?? 0),
    score:       myGauge.gauge,
    isMe:        true,
  };

  return [...users, me];
};

// ─────────────────────────────────────────────────────────────
// 順位バッジ
// ─────────────────────────────────────────────────────────────
const RankBadge = ({ rank }) => {
  const medals = { 1: { emoji: '🥇', color: C.gold }, 2: { emoji: '🥈', color: C.silver }, 3: { emoji: '🥉', color: C.bronze } };
  const m = medals[rank];
  if (m) {
    return (
      <div style={{ width: 32, flexShrink: 0, textAlign: 'center', fontSize: 22 }}>{m.emoji}</div>
    );
  }
  return (
    <div style={{
      width: 32, flexShrink: 0, textAlign: 'center',
      fontSize: 12, fontWeight: 800, color: C.textMuted,
    }}>
      {rank}位
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// スコアバー
// ─────────────────────────────────────────────────────────────
const ScoreBar = ({ score, isMe }) => {
  const color = score >= 70 ? C.green : score >= 50 ? C.amber : C.red;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <div style={{
          height: 6, flex: 1, background: '#f3f4f6', borderRadius: 99, marginRight: 8, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width:  `${score}%`,
            borderRadius: 99,
            background: isMe
              ? 'linear-gradient(90deg, #34d399, #16a34a)'
              : color === C.green
                ? 'linear-gradient(90deg, #bbf7d0, #22c55e)'
                : color === C.amber
                  ? 'linear-gradient(90deg, #fde68a, #f59e0b)'
                  : 'linear-gradient(90deg, #fecaca, #ef4444)',
            transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
          }} />
        </div>
        <span style={{
          fontSize: 13, fontWeight: 900, color: isMe ? C.green : C.text, minWidth: 28, textAlign: 'right',
        }}>
          {score}
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ユーザーカード行
// ─────────────────────────────────────────────────────────────
const UserRow = ({ user, rank, sortKey }) => {
  const subValue = sortKey === 'income'
    ? `${user.totalIncome.toLocaleString()}万円/年`
    : `${LIFE_TYPE_LABELS[user.lifeType] ?? user.lifeType} ・ ${user.age}歳`;

  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          10,
      padding:      '12px 16px',
      background:   user.isMe ? C.greenBg : C.white,
      borderBottom: `1px solid ${C.border}`,
      borderLeft:   user.isMe ? `3px solid ${C.green}` : '3px solid transparent',
      transition:   'background 0.15s',
    }}>
      <RankBadge rank={rank} />

      {/* アバター */}
      <div style={{
        width:        38,
        height:       38,
        borderRadius: '50%',
        background:   user.isMe ? C.greenLight : '#f3f4f6',
        display:      'flex',
        alignItems:   'center',
        justifyContent:'center',
        fontSize:     20,
        flexShrink:   0,
        border:       user.isMe ? `2px solid ${C.green}` : '2px solid transparent',
      }}>
        {user.avatar}
      </div>

      {/* 名前・属性 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize:   13,
          fontWeight: user.isMe ? 900 : 700,
          color:      user.isMe ? C.green : C.text,
          whiteSpace: 'nowrap',
          overflow:   'hidden',
          textOverflow:'ellipsis',
        }}>
          {user.name} {user.isMe && <span style={{ fontSize: 10, fontWeight: 700, background: C.green, color: '#fff', borderRadius: 999, padding: '1px 6px', marginLeft: 4 }}>YOU</span>}
        </div>
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{subValue}</div>
        <ScoreBar score={user.score} isMe={user.isMe} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// RankingScreen 本体
// ─────────────────────────────────────────────────────────────
export const RankingScreen = ({ onBack }) => {
  const { state, actions } = useAppStore();
  const { profileData, rankingState } = state;
  const activeTab = rankingState?.tab ?? 'score';

  // 仮想ユーザー生成（メモ化）
  const allUsers = React.useMemo(
    () => generateMockUsers(profileData),
    [profileData],
  );

  // タブに応じてソート・フィルタ
  const displayUsers = React.useMemo(() => {
    let list = [...allUsers];

    if (activeTab === 'score') {
      list.sort((a, b) => b.score - a.score);
    } else if (activeTab === 'income') {
      list.sort((a, b) => b.totalIncome - a.totalIncome);
    } else {
      // 'match' → 同タイプのみ・スコア順
      const myType = profileData.lifeType ?? 'couple';
      list = list.filter(u => u.lifeType === myType);
      list.sort((a, b) => b.score - a.score);
    }

    return list;
  }, [allUsers, activeTab, profileData.lifeType]);

  // 自分の順位
  const myRank = displayUsers.findIndex(u => u.isMe) + 1;
  const myUser = displayUsers.find(u => u.isMe);

  React.useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const setTab = (tab) => actions.setRanking({ tab });

  return (
    <div style={{
      minHeight:  '100vh',
      background: C.bg,
      fontFamily: "'Noto Sans JP', -apple-system, 'Apple Color Emoji', sans-serif",
      paddingBottom: 40,
    }}>

      {/* ── ヘッダ ─────────────────────────────────────────── */}
      <div style={{
        background:   C.white,
        borderBottom: `1px solid ${C.border}`,
        padding:      `calc(env(safe-area-inset-top, 16px) + 12px) 20px 0`,
        position:     'sticky',
        top:          0,
        zIndex:       10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button
            onClick={onBack}
            style={{
              border: 'none', background: '#f3f4f6', cursor: 'pointer',
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: C.text, flexShrink: 0,
            }}
          >←</button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>みんなのランキング</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>同世代と比較してみよう</div>
          </div>
        </div>

        {/* タブ */}
        <div style={{ display: 'flex', gap: 0, borderTop: `1px solid ${C.border}` }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              style={{
                flex:           1,
                border:         'none',
                background:     'none',
                cursor:         'pointer',
                padding:        '10px 4px',
                fontSize:       13,
                fontWeight:     activeTab === tab.id ? 800 : 600,
                color:          activeTab === tab.id ? C.green : C.textMuted,
                borderBottom:   activeTab === tab.id ? `2.5px solid ${C.green}` : '2.5px solid transparent',
                transition:     'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 自分の順位サマリー ─────────────────────────────── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background:   `linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)`,
          borderRadius: 20,
          padding:      '16px 20px',
          border:       `1px solid ${C.greenLight}`,
          display:      'flex',
          alignItems:   'center',
          gap:          16,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 36 }}>🌳</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 4 }}>
              {activeTab === 'match'
                ? `${LIFE_TYPE_LABELS[profileData.lifeType ?? 'couple']}の中で`
                : activeTab === 'income' ? '年収ランキング' : '全体スコアランキング'}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: C.green, lineHeight: 1 }}>{myRank}</span>
              <span style={{ fontSize: 14, color: C.textMuted, fontWeight: 600 }}>位 / {displayUsers.length}人中</span>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
              スコア {myUser?.score ?? '-'} {activeTab === 'income' ? `年収 ${(myUser?.totalIncome ?? 0).toLocaleString()}万円` : ''}
            </div>
          </div>
          {/* 上位%バッジ */}
          {myRank > 0 && (
            <div style={{
              textAlign: 'center',
              background: C.white,
              borderRadius: 16,
              padding: '10px 14px',
              border: `1px solid ${C.greenLight}`,
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.green, lineHeight: 1 }}>
                {Math.round((1 - (myRank - 1) / displayUsers.length) * 100)}%
              </div>
              <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, marginTop: 3 }}>上位</div>
            </div>
          )}
        </div>
      </div>

      {/* ── ランキングリスト ───────────────────────────────── */}
      <div style={{
        margin:       '0 16px',
        background:   C.white,
        borderRadius: 20,
        border:       `1px solid ${C.border}`,
        overflow:     'hidden',
      }}>
        {displayUsers.slice(0, 20).map((user, idx) => (
          <UserRow
            key={user.id}
            user={user}
            rank={idx + 1}
            sortKey={activeTab}
          />
        ))}
      </div>

      {/* ── 注記 ──────────────────────────────────────────── */}
      <div style={{
        margin:    '16px 20px 0',
        fontSize:  11,
        color:     C.textMuted,
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        ※ 表示しているランキングは、あなたのプロフィールをもとに生成した<br />
        参考用の比較データです。実際の他ユーザーの情報ではありません。
      </div>

      {/* ── 改善ボタン ────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 0' }}>
        <button
          onClick={() => actions.setScreen('action')}
          style={{
            width:         '100%',
            border:        'none',
            borderRadius:  999,
            padding:       '16px 24px',
            fontSize:      15,
            fontWeight:    900,
            color:         '#fff',
            background:    'linear-gradient(135deg, #50cc78 0%, #16a34a 100%)',
            boxShadow:     '0 8px 24px rgba(22,163,74,0.28)',
            cursor:        'pointer',
            letterSpacing: '0.03em',
          }}
        >
          📈 スコアを改善する
        </button>
      </div>
    </div>
  );
};
