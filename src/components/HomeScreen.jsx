// src/components/HomeScreen.jsx
// ホーム画面 — 感情の入口
// 絵本風の大きな木の背景 + ライフタイプ選択 → Input 画面へ進む

import React from 'react';
import { useAppStore } from '../store/useAppStore.jsx';
import { DEFAULT_PROFILE } from '../store/useAppStore.jsx';

// ─────────────────────────────────────────────────────────────
// ライフタイプ定義（デフォルトプロフィール差分）
// ─────────────────────────────────────────────────────────────
const LIFE_TYPES = [
  {
    id:      'single',
    label:   '一人暮らし',
    icon:    '🌱',
    sub:     'じぶんペースで',
    color:   '#6366f1',
    profile: {
      lifeType:          'single',
      selfIncome:        380,
      spouseIncome:      0,
      monthlyExpense:    16,
      monthlyInvestment: 2,
      currentSavings:    80,
      numChildren:       0,
      firstChildAge:     null,
      housingPurchaseAge: null,
    },
  },
  {
    id:      'couple',
    label:   '共働き',
    icon:    '🌿',
    sub:     'ふたりで育てる',
    color:   '#0891b2',
    profile: {
      lifeType:          'couple',
      selfIncome:        500,
      spouseIncome:      300,
      monthlyExpense:    26,
      monthlyInvestment: 5,
      currentSavings:    200,
      numChildren:       1,
      firstChildAge:     33,
      housingPurchaseAge: 35,
    },
  },
  {
    id:      'family',
    label:   '子育て中',
    icon:    '🍃',
    sub:     '家族の木を育む',
    color:   '#16a34a',
    profile: {
      lifeType:          'family',
      selfIncome:        550,
      spouseIncome:      200,
      monthlyExpense:    30,
      monthlyInvestment: 3,
      currentSavings:    150,
      numChildren:       2,
      firstChildAge:     31,
      housingPurchaseAge: 33,
    },
  },
];

// ─────────────────────────────────────────────────────────────
// HomeScreen
// ─────────────────────────────────────────────────────────────
export const HomeScreen = ({ onStart }) => {
  const { actions } = useAppStore();
  const [showPicker, setShowPicker] = React.useState(false);
  const [lifeType,   setLifeType]   = React.useState('couple');

  const selected = LIFE_TYPES.find((lt) => lt.id === lifeType) ?? LIFE_TYPES[1];

  // ライフタイプ確定 → プロフィールをストアに書き込んで画面遷移
  const handleConfirm = () => {
    // デフォルトプロフィールに選択したライフタイプの差分をマージ
    actions.setProfile({ ...DEFAULT_PROFILE, ...selected.profile });
    // 画面遷移（onStart コールバックと setScreen の両方を呼ぶ）
    actions.setScreen('input');
    if (typeof onStart === 'function') onStart();
  };

  return (
    <div className="hs-root" style={{
      width:    '100%',
      height:   '100vh',      /* fallback — CSSクラスで dvh に上書き */
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        /* dvh: ブラウザUIを除く実際の表示領域に合わせる（iOS Safari対応） */
        :root { --app-height: 100vh; }
        @supports (height: 100dvh) { :root { --app-height: 100dvh; } }
        .hs-root { height: var(--app-height) !important; }

        @keyframes hsFadeDown {
          from { opacity: 0; transform: translateY(-18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hsFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hsPickerUp {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hsPulse {
          0%,100% {
            box-shadow: 0 8px 32px rgba(0,0,0,0.30),
                        0 0 0 0   rgba(80,200,120,0.40),
                        inset 0 1px 0 rgba(255,255,255,0.20);
          }
          50% {
            box-shadow: 0 12px 40px rgba(0,0,0,0.35),
                        0 0 0 16px rgba(80,200,120,0),
                        inset 0 1px 0 rgba(255,255,255,0.20);
          }
        }
        .hs-cta-btn {
          animation: hsFadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.4s both,
                     hsPulse 2.6s ease-in-out 1.4s infinite;
        }
        .hs-cta-btn:active { transform: scale(0.93) !important; }
        .hs-type-btn {
          transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1),
                      box-shadow 0.18s ease;
        }
        .hs-type-btn:active { transform: scale(0.96) !important; }
        .hs-confirm-btn:active { transform: scale(0.97); }
      `}</style>

      {/* ── 背景画像 ──────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage:    "url('/hero-tree2.jpg')",
        backgroundSize:     '135%',
        backgroundPosition: '53% 45%',
        backgroundRepeat:   'no-repeat',
        filter:             'saturate(1.18) brightness(0.96) contrast(1.04)',
      }} />

      {/* ── 青空グラデーションオーバーレイ ───────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: [
          'linear-gradient(180deg,',
          'rgba(80,130,190,0.18) 0%,',
          'rgba(100,150,200,0.08) 22%,',
          'rgba(255,255,255,0.00) 46%,',
          'rgba(60,100,70,0.04) 70%,',
          'rgba(30,60,40,0.12) 100%)',
        ].join(''),
      }} />

      {/* ── 下部ビネット（ボタンが白背景に消えないよう濃くする） ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'linear-gradient(to bottom,'
          + 'rgba(0,0,0,0.00) 65%,'
          + 'rgba(160,185,90,0.18) 82%,'
          + 'rgba(140,170,75,0.35) 93%,'
          + 'rgba(120,155,60,0.50) 100%)',
      }} />

      {/* ── タイトル ─────────────────────────────────────────── */}
      <div style={{
        position:  'absolute',
        top: 0, left: 0, right: 0,
        textAlign: 'center',
        padding:   '72px 24px 0',
        zIndex:    10,
        animation: 'hsFadeDown 0.8s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        <div style={{
          fontSize:      11,
          fontWeight:    800,
          color:         'rgba(255,255,255,0.92)',
          letterSpacing: '0.30em',
          marginBottom:  10,
          textTransform: 'uppercase',
          textShadow:    '0 1px 8px rgba(0,0,0,0.35)',
        }}>
          Life Plan Simulator
        </div>
        <div style={{
          fontSize:      'clamp(26px, 5.6vw, 38px)',
          fontWeight:    900,
          color:         '#fff',
          lineHeight:    1.22,
          letterSpacing: '0.01em',
          textShadow:    '0 1px 10px rgba(0,0,0,0.28)',
        }}>
          あなたの未来を、<br />育てよう。
        </div>
      </div>

      {/* ── はじめるボタン（ピッカー非表示時） ──────────────── */}
      {!showPicker && (
        <div style={{
          position:       'absolute',
          bottom:         'calc(13% + env(safe-area-inset-bottom, 16px))',
          left:           0,
          right:          0,
          zIndex:         20,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            14,
        }}>
          {/* 補助テキスト */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize:    13,
              fontWeight:  700,
              color:       'rgba(255,255,255,0.95)',
              textShadow:  '0 1px 6px rgba(0,0,0,0.40)',
              letterSpacing: '0.04em',
              marginBottom: 4,
            }}>
              3分で診断
            </div>
            <div style={{
              fontSize:    11,
              fontWeight:  600,
              color:       'rgba(255,255,255,0.80)',
              textShadow:  '0 1px 4px rgba(0,0,0,0.35)',
              letterSpacing: '0.02em',
            }}>
              住宅購入・教育費・老後を一気にチェック
            </div>
          </div>

          <button
            className="hs-cta-btn"
            onClick={() => setShowPicker(true)}
            style={{
              width:        90,
              height:       90,
              borderRadius: '50%',
              border:       '3px solid rgba(255,255,255,0.90)',
              background:   'rgba(255,255,255,0.55)',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
              boxShadow:    '0 4px 20px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.70)',
              cursor:       'pointer',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              padding:      0,
              margin:       '0 auto',
            }}
          >
            <span style={{
              fontSize:    14,
              fontWeight:  900,
              color:       '#ffffff',
              letterSpacing: '0.06em',
              textShadow:  '0 1px 8px rgba(0,0,0,0.45)',
              display:     'block',
              textAlign:   'center',
              width:       '100%',
            }}>はじめる</span>
          </button>
        </div>
      )}

      {/* ── ライフタイプピッカー ──────────────────────────────── */}
      {showPicker && (
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          zIndex:   30,
          animation: 'hsPickerUp 0.48s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          {/* 背景タップで閉じる */}
          <div
            onClick={() => setShowPicker(false)}
            style={{ position: 'fixed', inset: 0, zIndex: -1 }}
          />

          <div style={{
            background:          'rgba(250,248,242,0.96)',
            backdropFilter:      'blur(18px)',
            WebkitBackdropFilter:'blur(18px)',
            borderRadius:        '28px 28px 0 0',
            border:              '1px solid rgba(255,255,255,0.65)',
            boxShadow:           '0 -10px 48px rgba(0,0,0,0.14)',
            padding:             '10px 20px calc(32px + env(safe-area-inset-bottom, 0px))',
          }}>
            {/* ドラッグハンドル */}
            <div style={{
              width:        40,
              height:       4,
              borderRadius: 2,
              background:   'rgba(100,130,100,0.28)',
              margin:       '12px auto 20px',
            }} />

            {/* ピッカータイトル */}
            <div style={{
              textAlign:     'center',
              fontSize:      13,
              fontWeight:    800,
              color:         '#5a8060',
              letterSpacing: '0.08em',
              marginBottom:  16,
            }}>
              🍃 あなたのライフスタイルは？
            </div>

            {/* ライフタイプカード 3択 */}
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap:                 10,
              marginBottom:        18,
            }}>
              {LIFE_TYPES.map((lt) => {
                const active = lifeType === lt.id;
                return (
                  <button
                    key={lt.id}
                    className="hs-type-btn"
                    onClick={() => setLifeType(lt.id)}
                    style={{
                      borderRadius: 20,
                      border: active
                        ? `2.5px solid ${lt.color}`
                        : '1.5px solid rgba(160,200,160,0.55)',
                      background: active
                        ? 'linear-gradient(145deg, #e2f8eb, #cdf0dc)'
                        : 'rgba(255,255,255,0.78)',
                      padding:    '16px 8px 14px',
                      cursor:     'pointer',
                      transform:  active ? 'scale(1.05) translateY(-2px)' : 'scale(1)',
                      boxShadow:  active
                        ? '0 8px 22px rgba(58,152,96,0.22)'
                        : '0 2px 10px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 7 }}>
                      {lt.icon}
                    </div>
                    <div style={{
                      fontSize:   13,
                      fontWeight: 900,
                      color:      active ? '#1b4a28' : '#2e4a32',
                      lineHeight: 1.2,
                      marginBottom: 4,
                    }}>
                      {lt.label}
                    </div>
                    <div style={{
                      fontSize:   10,
                      fontWeight: 600,
                      color:      active ? '#4a8a5a' : 'rgba(80,110,80,0.65)',
                      lineHeight: 1.3,
                    }}>
                      {lt.sub}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 決定ボタン */}
            <button
              className="hs-confirm-btn"
              onClick={handleConfirm}
              style={{
                width:         '100%',
                border:        'none',
                borderRadius:  999,
                padding:       '18px 24px',
                fontSize:      17,
                fontWeight:    900,
                color:         '#fff',
                background:    'linear-gradient(135deg, #50cc78 0%, #2d9650 100%)',
                boxShadow:     '0 12px 28px rgba(47,150,88,0.32)',
                cursor:        'pointer',
                letterSpacing: '0.03em',
                transition:    'transform 0.12s ease',
              }}
            >
              🌿 このタイプで始める
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
