// src/components/HomeScreen.jsx
// ホーム画面 — 感情の入口
// 絵本風の大きな木の背景 + ライフタイプ選択 → Input 画面へ進む

import React from 'react';
import { useAppStore } from '../store/useAppStore.jsx';
import { DEFAULT_PROFILE } from '../store/useAppStore.jsx';

// ─────────────────────────────────────────────────────────────
// ピッカーカード用 SVG アイコン（絵文字代替）
// ─────────────────────────────────────────────────────────────
const PICKER_ICON_PATHS = {
  single: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  couple: "M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  family: "M4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm.5 2H3c-.83 0-1.5.67-1.5 1.5v1c0 .28.22.5.5.5h4v-1c0-.72.23-1.38.59-1.95-.36-.03-.72-.05-1.09-.05zM12 11c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.5 2h-3c-1.1 0-2 .9-2 2v1h7v-1c0-1.1-.9-2-2-2zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm.5 2h-1.5c-.37 0-.73.02-1.09.05.36.57.59 1.23.59 1.95v1h4c.28 0 .5-.22.5-.5v-1c0-.83-.67-1.5-1.5-1.5z",
};

// ─────────────────────────────────────────────────────────────
// ライフタイプ定義（デフォルトプロフィール差分）
// ─────────────────────────────────────────────────────────────
const LIFE_TYPES = [
  {
    id:      'single',
    label:   '一人暮らし',
    iconKey: 'single',
    sub:     'じぶんペースで',
    color:   '#6366f1',
    profile: {
      lifeType:          'single',
      selfIncome:        null,
      spouseIncome:      0,
      monthlyExpense:    null,
      monthlyInvestment: null,
      currentSavings:    null,
      numChildren:       0,
      firstChildAge:     null,
      housingPurchaseAge: null,
    },
  },
  {
    id:      'couple',
    label:   '共働き',
    iconKey: 'couple',
    sub:     'ふたりで歩む',
    color:   '#0891b2',
    profile: {
      lifeType:          'couple',
      selfIncome:        null,
      spouseIncome:      null,
      monthlyExpense:    null,
      monthlyInvestment: null,
      currentSavings:    null,
      numChildren:       1,
      firstChildAge:     33,
      housingPurchaseAge: null,
    },
  },
  {
    id:      'family',
    label:   '子育て中',
    iconKey: 'family',
    sub:     '家族の木を育む',
    color:   '#16a34a',
    profile: {
      lifeType:          'family',
      selfIncome:        null,
      spouseIncome:      null,
      monthlyExpense:    null,
      monthlyInvestment: null,
      currentSavings:    null,
      numChildren:       2,
      firstChildAge:     31,
      housingPurchaseAge: null,
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

  // 前回の保存データをlocalStorageから読み込み
  const [savedPlan, setSavedPlan] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem('miraiTreeLastResult') ?? 'null');
    } catch { return null; }
  });

  const handleViewLastPlan = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('miraiTreeLastResult') ?? 'null');
      if (!saved) return;
      actions.restoreSession({
        profileData:     saved.profileData,
        selectedChoices: saved.selectedChoices,
        resultData:      saved.resultData,
      });
    } catch (_) {}
  };

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
      {/*
        122% サイズ計算（375×812 preview）:
          画像幅 457px / 高さ推定 732px → 縦余白 80px
          Y=56%: 上44px・下36px の呼吸感
        iPhone 17 Pro (430×932):
          画像幅 525px / 高さ推定 839px → 縦余白 93px
          Y=56%: 上52px・下41px — ノッチ下に空が見える構図
      */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
        backgroundImage:    "url('/hero-tree2.jpg')",
        backgroundSize:     'cover',
        backgroundPosition: '54% 60%',
        backgroundRepeat:   'no-repeat',
        filter:             'saturate(1.15) brightness(0.97) contrast(1.03)',
      }} />

      {/* ── 上部オーバーレイ（ステータスバー可読性 + 空の繋ぎ） ── */}
      {/*
        旧: 青空グラデーション(62%) + 黒グラデーション(30%) が重なって過剰に暗かった
        新: 1枚に統合。ステータスバー直下は黒20%、空エリアは薄い青でなじませる
      */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1, pointerEvents: 'none',
        height: 'calc(160px + env(safe-area-inset-top, 0px))',
        background: [
          'linear-gradient(180deg,',
          'rgba(0,0,0,0.20)    0%,',    /* ステータスバー文字を読みやすく */
          'rgba(20,40,80,0.10) 30%,',   /* 空の色みをわずかに深める */
          'rgba(0,0,0,0.00)   100%)',
        ].join(''),
      }} />

      {/* ── 下部ビネット（ボタンが背景に消えないよう濃くする） ── */}
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
        /*
          Dynamic Island (59px) or ステータスバー (44px) の下から 42px の余白
          → 実機iPhone 17 Pro: 59+42=101px, preview: 44+42=86px
        */
        paddingTop:   'calc(env(safe-area-inset-top, 44px) + 42px)',
        paddingLeft:  '24px',
        paddingRight: '24px',
        zIndex:    10,
        animation: 'hsFadeDown 0.8s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {/* ブランド名 — +4pt (21→25px) で最終仕上げ */}
        <div style={{
          fontSize:      25,
          fontWeight:    800,
          color:         'rgba(255,255,255,0.96)',
          letterSpacing: '0.42em',
          marginBottom:  20,            /* キャッチコピーとの間隔を広げる */
          textTransform: 'uppercase',
          textShadow:    '0 1px 6px rgba(0,0,0,0.55), 0 2px 20px rgba(0,0,0,0.40)',
        }}>
          Mirai Tree
        </div>
        {/* キャッチコピー */}
        <div style={{
          fontSize:      'clamp(28px, 7.2vw, 42px)',
          fontWeight:    900,
          color:         '#fff',
          lineHeight:    1.25,
          letterSpacing: '0.01em',
          textShadow:    '0 2px 8px rgba(0,0,0,0.50), 0 4px 24px rgba(0,0,0,0.35)',
        }}>
          あなたの未来を、<br />育てよう。
        </div>
      </div>

      {/* ── はじめるボタン（ピッカー非表示時） ──────────────── */}
      {!showPicker && (
        <div style={{
          position:       'absolute',
          bottom:         'calc(8% + env(safe-area-inset-bottom, 20px))',
          left:           0,
          right:          0,
          zIndex:         20,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            14,
        }}>
          <button
            className="hs-cta-btn"
            onClick={() => setShowPicker(true)}
            style={{
              width:        96,
              height:       96,
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

          {/* 補助テキスト（ボタン下） */}
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

          {/* 前回の続きから */}
          {savedPlan && (
            <button
              onClick={handleViewLastPlan}
              style={{
                padding:       '10px 24px',
                borderRadius:  999,
                border:        '1.5px solid rgba(255,255,255,0.70)',
                background:    'rgba(255,255,255,0.18)',
                fontSize:      13,
                fontWeight:    700,
                color:         'rgba(255,255,255,0.95)',
                cursor:        'pointer',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                textShadow:    '0 1px 4px rgba(0,0,0,0.30)',
                letterSpacing: '0.03em',
              }}
            >
              前回の続きから →
            </button>
          )}
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
            padding:             '18px 20px calc(56px + env(safe-area-inset-bottom, 0px))',
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
              あなたのライフスタイルは？
            </div>

            {/* ライフタイプカード 3択 */}
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap:                 16,
              marginBottom:        20,
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
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                      <svg width={32} height={32} viewBox="0 0 24 24"
                        fill={active ? lt.color : '#5a8060'}>
                        <path d={PICKER_ICON_PATHS[lt.iconKey]} />
                      </svg>
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
              このタイプで始める
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
