// src/components/PresetScreen.jsx
import React from 'react';
import { PRESETS } from '../constants.js';

// ── ライフステージ別カラー ────────────────────────────
const STAGE = {
  single_20s: { tint: '#e8f9f0', accent: '#4CAF7A', border: '#b0ddc0', badge: '人気',     badgeColor: '#4CAF7A', tags: ['一人暮らし', '資産形成スタート'] },
  couple_30s: { tint: '#e0f4e8', accent: '#38a065', border: '#98ccac', badge: 'おすすめ', badgeColor: '#2d8a55', tags: ['共働き', '住宅購入'] },
  family_30s: { tint: '#d8f0e2', accent: '#2d8a55', border: '#88c0a0', badge: '定番',     badgeColor: '#1a6e3e', tags: ['子育て', '教育費'] },
  couple_50s: { tint: '#fff4e0', accent: '#e8954a', border: '#f0d090', badge: '',         badgeColor: '#d07830', tags: ['老後準備', '資産取崩し'] },
  freelance:  { tint: '#e8f3ff', accent: '#5aaae0', border: '#a0c8f0', badge: 'NEW',      badgeColor: '#4488c8', tags: ['自営業・フリーランス', 'iDeCo活用'] },
  custom:     { tint: '#f4f8f0', accent: '#7a9e7a', border: '#b8d0b4', badge: '',         badgeColor: '#5a7e5a', tags: ['収入・支出を自由設定', 'カスタムプラン'] },
};

// ── CSS アニメーション ────────────────────────────────
const Styles = () => (
  <style>{`
    @keyframes leafRise {
      0%   { transform: translateY(0) translateX(0) rotate(var(--r0)); opacity: 0; }
      8%   { opacity: 0.62; }
      88%  { opacity: 0.48; }
      100% { transform: translateY(-130px) translateX(var(--dx)) rotate(var(--r1)); opacity: 0; }
    }
    @keyframes ring1 {
      0%   { transform: scale(1.00); opacity: 0.42; }
      100% { transform: scale(1.55); opacity: 0; }
    }
    @keyframes ring2 {
      0%   { transform: scale(1.00); opacity: 0.26; }
      100% { transform: scale(1.80); opacity: 0; }
    }
    @keyframes ctaGlow {
      0%, 100% { box-shadow: 0 0 30px rgba(76,175,122,0.38), 0 10px 30px rgba(76,175,122,0.22), inset 0 2px 6px rgba(255,255,255,0.9); }
      50%       { box-shadow: 0 0 55px rgba(76,175,122,0.60), 0 14px 44px rgba(76,175,122,0.34), inset 0 2px 6px rgba(255,255,255,0.9); }
    }
    @keyframes seedBob {
      0%, 100% { transform: translateY(0) scale(1.00); }
      50%       { transform: translateY(-9px) scale(1.04); }
    }
    @keyframes arrowDrop {
      0%, 100% { transform: translateY(0); opacity: 0.75; }
      50%       { transform: translateY(8px); opacity: 1; }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(22px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes panelUp {
      from { opacity: 0; transform: translateY(72px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(20px) scale(0.93); }
      to   { opacity: 1; transform: translateY(0)   scale(1.00); }
    }
    .ps-no-scroll::-webkit-scrollbar { display: none; }
  `}</style>
);

// ── 浮く葉パーティクル ───────────────────────────────
const LEAF_CFG = [
  { left: '7%',  bottom: '18%', '--r0': '-35deg', '--dx': '24px',  '--r1': '20deg',  delay: 0.0, dur: 4.6 },
  { left: '13%', bottom: '36%', '--r0': '28deg',  '--dx': '-18px', '--r1': '-42deg', delay: 1.4, dur: 5.1 },
  { left: '82%', bottom: '24%', '--r0': '42deg',  '--dx': '-24px', '--r1': '12deg',  delay: 0.6, dur: 4.9 },
  { left: '88%', bottom: '44%', '--r0': '-22deg', '--dx': '20px',  '--r1': '-38deg', delay: 2.2, dur: 5.6 },
  { left: '24%', bottom: '54%', '--r0': '52deg',  '--dx': '16px',  '--r1': '-28deg', delay: 1.7, dur: 4.3 },
  { left: '74%', bottom: '50%', '--r0': '-46deg', '--dx': '-22px', '--r1': '32deg',  delay: 0.3, dur: 5.3 },
  { left: '48%', bottom: '74%', '--r0': '30deg',  '--dx': '26px',  '--r1': '-16deg', delay: 2.9, dur: 4.7 },
  { left: '36%', bottom: '30%', '--r0': '-28deg', '--dx': '-14px', '--r1': '52deg',  delay: 3.3, dur: 5.9 },
  { left: '62%', bottom: '34%', '--r0': '56deg',  '--dx': '22px',  '--r1': '-32deg', delay: 1.0, dur: 4.4 },
  { left: '20%', bottom: '60%', '--r0': '-18deg', '--dx': '-28px', '--r1': '45deg',  delay: 0.8, dur: 5.0 },
];

const LeafParticle = ({ style }) => (
  <div style={{ position: 'absolute', pointerEvents: 'none', zIndex: 2, ...style }}>
    <svg width="22" height="12" viewBox="0 0 22 12">
      <ellipse cx="11" cy="6" rx="10" ry="5" fill="#74d8a0" />
    </svg>
  </div>
);

// ── 地面の丘 SVG ─────────────────────────────────────
const Hills = () => (
  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '46%', pointerEvents: 'none', overflow: 'hidden' }}>
    <svg viewBox="0 0 420 130" preserveAspectRatio="xMidYMax meet" width="100%" height="100%">
      <ellipse cx="68"  cy="125" rx="205" ry="54" fill="#a4d880" opacity="0.46" />
      <ellipse cx="362" cy="130" rx="188" ry="50" fill="#9ad078" opacity="0.42" />
      <ellipse cx="38"  cy="134" rx="165" ry="44" fill="#7ec858" opacity="0.56" />
      <ellipse cx="392" cy="136" rx="172" ry="46" fill="#78c050" opacity="0.52" />
      <rect x="0" y="106" width="420" height="28" fill="#8ecc58" opacity="0.78" />
      {/* 野花 */}
      <circle cx="54"  cy="104" r="3.5" fill="#ffd090" opacity="0.68" />
      <circle cx="70"  cy="107" r="2.5" fill="#ffb870" opacity="0.62" />
      <circle cx="362" cy="103" r="3"   fill="#ffd090" opacity="0.66" />
      <circle cx="377" cy="106" r="2"   fill="#ffb870" opacity="0.60" />
      <circle cx="210" cy="105" r="2.5" fill="#ffe090" opacity="0.72" />
      <circle cx="190" cy="108" r="2"   fill="#ffc860" opacity="0.60" />
      <circle cx="230" cy="107" r="2"   fill="#ffc860" opacity="0.58" />
    </svg>
  </div>
);

// ── 木 SVG（ヒーロー縮小時に一緒に縮む） ───────────────
const Tree = ({ compact }) => (
  <div style={{
    position: 'absolute',
    bottom: compact ? '14%' : '9%',
    left: '50%',
    transform: `translateX(-50%) scale(${compact ? 0.62 : 1}) translateY(${compact ? '18px' : '0'})`,
    transition: 'transform 0.70s cubic-bezier(0.34,1.1,0.64,1), bottom 0.70s cubic-bezier(0.34,1.1,0.64,1)',
    pointerEvents: 'none',
    width: 230,
    zIndex: 3,
  }}>
    <svg viewBox="0 0 230 210" width="230" height="210">
      {/* 幹・枝 */}
      <path d="M115,207 L115,130" stroke="#8B6035" strokeWidth="17" fill="none" strokeLinecap="round" />
      <path d="M115,158 Q95,140 74,124"  stroke="#8B6035" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M115,158 Q135,140 156,124" stroke="#8B6035" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M115,143 Q100,126 86,108"  stroke="#8B6035" strokeWidth="7.5" fill="none" strokeLinecap="round" />
      <path d="M115,143 Q130,126 144,108" stroke="#8B6035" strokeWidth="7.5" fill="none" strokeLinecap="round" />
      {/* 根 */}
      <path d="M115,207 Q97,200 80,207"   stroke="#8B6035" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M115,207 Q133,200 150,207"  stroke="#8B6035" strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* 葉（奥→手前） */}
      <circle cx="115" cy="90"  r="64" fill="#226040" />
      <circle cx="70"  cy="110" r="48" fill="#2d7a50" />
      <circle cx="160" cy="108" r="48" fill="#2d7a50" />
      <circle cx="84"  cy="76"  r="44" fill="#3a9862" />
      <circle cx="146" cy="74"  r="44" fill="#3a9862" />
      <circle cx="115" cy="56"  r="53" fill="#4aae78" />
      <circle cx="115" cy="34"  r="38" fill="#60c88c" />
      {/* ハイライト */}
      <circle cx="98"  cy="24" r="19" fill="#92e4b0" opacity="0.66" />
      <circle cx="124" cy="40" r="12" fill="#a8f0c4" opacity="0.55" />
      <circle cx="82"  cy="52" r="9"  fill="#8edea8" opacity="0.44" />
      {/* 木の実 */}
      <circle cx="72"  cy="96"  r="9"  fill="#FF8830" />
      <circle cx="152" cy="90"  r="8"  fill="#FF8830" />
      <circle cx="110" cy="122" r="7"  fill="#FFA94D" />
      <circle cx="130" cy="110" r="5"  fill="#FFC870" opacity="0.90" />
      <circle cx="96"  cy="106" r="4"  fill="#FFD090" opacity="0.80" />
    </svg>
  </div>
);

// ── 種のCTAボタン ────────────────────────────────────
const SproutIcon = () => (
  <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
    <ellipse cx="30" cy="51" rx="15" ry="5.5" fill="#b0d890" opacity="0.52" />
    <path d="M30,49 C30,40 30,31 30,21" stroke="#52b870" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    <path d="M30,37 C23,33 13,31 10,24 C17,23 28,28 30,37" fill="#6FCF97" />
    <path d="M30,28 C37,21 47,18 50,11 C43,14 32,21 30,28" fill="#4ab870" />
    <ellipse cx="30" cy="48" rx="8" ry="4.5" fill="#c49a5a" opacity="0.72" />
  </svg>
);

const SeedCTA = ({ onTap, pressed }) => (
  <div style={{ position: 'relative', width: 195, height: 195, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {/* 外側リング2 */}
    <div style={{
      position: 'absolute', inset: -12, borderRadius: '50%',
      border: '2px solid rgba(76,175,122,0.22)',
      animation: 'ring2 3.6s ease-in-out 1.1s infinite',
    }} />
    {/* 外側リング1 */}
    <div style={{
      position: 'absolute', inset: 0, borderRadius: '50%',
      border: '2px solid rgba(76,175,122,0.36)',
      animation: 'ring1 3.6s ease-in-out 0.0s infinite',
    }} />
    {/* 本体 */}
    <div
      onClick={onTap}
      style={{
        width: 172, height: 172, borderRadius: '50%',
        background: 'linear-gradient(148deg, #ffffff 0%, #f2fdf8 50%, #e2f8ee 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 5, cursor: 'pointer',
        border: '3.5px solid rgba(76,175,122,0.28)',
        animation: pressed ? 'none' : 'ctaGlow 3.6s ease-in-out infinite',
        transform: pressed ? 'scale(0.90)' : 'scale(1)',
        transition: 'transform 0.16s cubic-bezier(0.34,1.56,0.64,1)',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{ animation: 'seedBob 3.6s ease-in-out infinite', lineHeight: 1 }}>
        <SproutIcon />
      </div>
      <div style={{ fontSize: 14, fontWeight: 900, color: '#2d8a55', letterSpacing: 0.4 }}>
        育てはじめる
      </div>
    </div>
  </div>
);

// ── 横スクロール用プリセットカード ──────────────────────
const HCard = ({ preset, stage, onClick, index }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onTouchStart={() => setHover(true)}
      onTouchEnd={() => setTimeout(() => setHover(false), 320)}
      style={{
        flexShrink: 0, width: 158,
        borderRadius: 22, overflow: 'hidden',
        cursor: 'pointer',
        border: `2px solid ${hover ? stage.accent : stage.border}`,
        boxShadow: hover ? `0 14px 38px ${stage.accent}3a` : '0 3px 14px rgba(0,0,0,0.07)',
        transform: hover ? 'translateY(-5px) scale(1.03)' : 'translateY(0) scale(1)',
        transition: 'all 0.20s cubic-bezier(0.34,1.56,0.64,1)',
        background: '#fff',
        animation: `cardIn 0.40s ease ${0.06 + index * 0.07}s both`,
        scrollSnapAlign: 'start',
      }}
    >
      {/* 上部カラーエリア */}
      <div style={{
        height: 112,
        background: `linear-gradient(148deg, ${stage.tint}, ${stage.accent}26)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {stage.badge && (
          <div style={{
            position: 'absolute', top: 9, right: 9,
            background: stage.badgeColor, color: '#fff',
            fontSize: 9, fontWeight: 800, borderRadius: 8, padding: '2px 7px',
          }}>
            {stage.badge}
          </div>
        )}
        <div style={{ fontSize: 52, lineHeight: 1, filter: 'drop-shadow(0 3px 7px rgba(0,0,0,0.12))' }}>
          {preset.icon}
        </div>
      </div>
      {/* 下部テキストエリア */}
      <div style={{ padding: '12px 12px 15px', background: '#fff' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#1a3428', lineHeight: 1.3, marginBottom: 6 }}>
          {preset.label}
        </div>
        <span style={{
          fontSize: 9, color: stage.accent, fontWeight: 700,
          background: `${stage.accent}1a`, borderRadius: 7, padding: '2px 7px',
        }}>
          {stage.tags[0]}
        </span>
      </div>
    </div>
  );
};

// ── メインコンポーネント ──────────────────────────────
export const PresetScreen = ({ onSelect, hasSavedData, onResume, lastSaved }) => {
  const [expanded,    setExpanded]    = React.useState(false);
  const [btnPressed,  setBtnPressed]  = React.useState(false);
  const [cardsReady,  setCardsReady]  = React.useState(false);

  const handleCTA = () => {
    setBtnPressed(true);
    setTimeout(() => {
      setExpanded(true);
      setBtnPressed(false);
      setTimeout(() => setCardsReady(true), 430);
    }, 180);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #a4d4f8 0%, #bce8f8 22%, #caf0e8 58%, #e0f8de 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Styles />

      {/* ── ヒーローエリア ── */}
      <div style={{
        height: expanded ? '44vh' : '100vh',
        minHeight: expanded ? 220 : 520,
        transition: 'height 0.70s cubic-bezier(0.34,1.1,0.64,1)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 地面 */}
        <Hills />
        {/* 木 */}
        <Tree compact={expanded} />

        {/* 浮く葉 */}
        {LEAF_CFG.map((cfg, i) => (
          <LeafParticle key={i} style={{
            left:   cfg.left,
            bottom: cfg.bottom,
            '--r0':  cfg['--r0'],
            '--dx':  cfg['--dx'],
            '--r1':  cfg['--r1'],
            animation: `leafRise ${cfg.dur}s ease-in-out ${cfg.delay}s infinite`,
          }} />
        ))}

        {/* CTA コンテンツ（展開すると消える） */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 22, paddingBottom: '10vh',
          zIndex: 5,
          opacity:   expanded ? 0 : 1,
          transform: expanded ? 'scale(0.86) translateY(-28px)' : 'scale(1) translateY(0)',
          transition: 'opacity 0.36s ease, transform 0.36s ease',
          pointerEvents: expanded ? 'none' : 'auto',
        }}>
          {/* キャッチコピー */}
          <div style={{ textAlign: 'center', animation: 'fadeUp 0.9s ease 0.15s both' }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: '#286848',
              letterSpacing: 2.4, marginBottom: 8,
              textShadow: '0 1px 6px rgba(255,255,255,0.72)',
            }}>
              🌿 Life Plan Simulator
            </div>
            <div style={{
              fontSize: 33, fontWeight: 900, color: '#122a1a',
              lineHeight: 1.18, letterSpacing: '0.01em',
              textShadow: '0 2px 12px rgba(255,255,255,0.60)',
            }}>
              あなたの未来を、<br />育てよう。
            </div>
          </div>

          {/* 種ボタン */}
          <div style={{ animation: 'fadeUp 0.9s ease 0.40s both' }}>
            <SeedCTA onTap={handleCTA} pressed={btnPressed} />
          </div>

          {/* 矢印ヒント */}
          <div style={{
            fontSize: 12, color: '#357050', fontWeight: 600,
            animation: 'arrowDrop 2.3s ease-in-out infinite',
            textShadow: '0 1px 4px rgba(255,255,255,0.7)',
          }}>
            ↓ タップして始める
          </div>
        </div>

        {/* 展開後に表示される小見出し */}
        <div style={{
          position: 'absolute', bottom: 14, left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          opacity:   expanded ? 1 : 0,
          transition: 'opacity 0.40s ease 0.32s',
          zIndex: 5, pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 20, lineHeight: 1 }}>🌿</div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#122a1a',
            letterSpacing: 1.2,
            textShadow: '0 1px 5px rgba(255,255,255,0.75)',
          }}>
            ライフプランシミュレーター
          </div>
        </div>
      </div>

      {/* ── プリセット選択パネル（展開時のみ表示） ── */}
      {expanded && (
        <div style={{
          background: '#F8F5EE',
          borderRadius: '28px 28px 0 0',
          animation: 'panelUp 0.70s cubic-bezier(0.34,1.1,0.64,1) both',
          position: 'relative', zIndex: 10,
          paddingBottom: 64,
        }}>
          {/* ハンドルバー */}
          <div style={{ width: 42, height: 4, borderRadius: 2, background: '#d2c8b6', margin: '14px auto 24px' }} />

          {/* タイトル */}
          <div style={{ textAlign: 'center', padding: '0 16px', marginBottom: 18 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#1a3428', marginBottom: 5, animation: 'fadeUp 0.5s ease 0.2s both', opacity: 0 }}>
              どんな未来を育てる？
            </div>
            <div style={{ fontSize: 12, color: '#8aab98', animation: 'fadeUp 0.5s ease 0.32s both', opacity: 0 }}>
              あなたのライフステージを選ぼう
            </div>
          </div>

          {/* 再開バナー */}
          {hasSavedData && (
            <div style={{
              margin: '0 16px 18px',
              background: '#fffbe8',
              borderRadius: 16, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
              border: '1.5px solid #f0d898',
              boxShadow: '0 3px 14px rgba(255,169,77,0.12)',
              animation: 'fadeUp 0.5s ease 0.38s both', opacity: 0,
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>🌱</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#2F4F3E' }}>前回の続きがあります</div>
                <div style={{ fontSize: 10, color: '#8aab98', marginTop: 2 }}>{lastSaved || '不明'}</div>
              </div>
              <button
                onClick={onResume}
                style={{
                  background: 'linear-gradient(135deg, #FFA94D, #e8854a)',
                  color: '#fff', border: 'none', borderRadius: 14,
                  padding: '7px 12px', fontSize: 11, fontWeight: 800,
                  cursor: 'pointer', flexShrink: 0,
                  boxShadow: '0 3px 10px rgba(255,169,77,0.28)',
                }}
              >
                続きから ›
              </button>
            </div>
          )}

          {/* 横スクロールカード */}
          <div
            className="ps-no-scroll"
            style={{
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: 'x mandatory',
              display: 'flex',
              gap: 12,
              padding: '8px 16px 16px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {PRESETS.map((preset, i) => {
              const stage = STAGE[preset.id] || STAGE.custom;
              return cardsReady ? (
                <HCard
                  key={preset.id}
                  preset={preset}
                  stage={stage}
                  onClick={() => onSelect(preset.data || {}, preset.id)}
                  index={i}
                />
              ) : (
                /* カード読み込み中のプレースホルダー */
                <div key={preset.id} style={{
                  flexShrink: 0, width: 158, height: 185,
                  borderRadius: 22, background: '#ede8e0',
                  scrollSnapAlign: 'start',
                }} />
              );
            })}
            <div style={{ width: 6, flexShrink: 0 }} />
          </div>

          {/* スクロールヒント */}
          {cardsReady && (
            <div style={{
              textAlign: 'center', fontSize: 10, color: '#b8c8b0',
              padding: '2px 0',
              animation: 'fadeUp 0.5s ease 0.6s both', opacity: 0,
            }}>
              ← スワイプして全て見る →
            </div>
          )}

          {/* フッター */}
          <div style={{
            textAlign: 'center', padding: '22px 16px 0',
            color: '#b8c8b0', fontSize: 10, lineHeight: 2,
          }}>
            ※ 本シミュレーターは概算です。重要な判断は専門家にご相談ください。
          </div>
        </div>
      )}
    </div>
  );
};
