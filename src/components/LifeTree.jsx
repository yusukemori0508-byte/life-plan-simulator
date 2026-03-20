// src/components/LifeTree.jsx
// ライフツリー — 余裕度レベル（1〜4）に連動して見た目と実が変化する
//
// Level対応（gaugeCalc.js と同じ定義）:
//   Level 1: 危険   — 葉が少ない・色がくすむ・幹が細い
//   Level 2: 注意   — やや不安
//   Level 3: 安定   — 健康的な木
//   Level 4: とても安心 — 葉が多く・実がある・生き生き

import React from 'react';

// ─────────────────────────────────────────────────────────────
// レベル別ビジュアル設定
// ─────────────────────────────────────────────────────────────
const CFG = {
  // Level 1 — 危険（くすんだ色、細い幹、葉少なめ）
  1: {
    base:    '#4a5838', mid: '#5a6848', body: '#687258',
    leftOp:  0.28, shadowOp: 0.22,
    hlOp:    0.30, exOp: 0.16,
    ygOp:    0.16,
    fruits:  [],
    scale:   0.58,
    overlay: { fill: '#a05a10', opacity: 0.26 },
  },
  // Level 2 — 注意（やや色が薄い、葉少なめ）
  2: {
    base:    '#3a6040', mid: '#4a7252', body: '#5a8462',
    leftOp:  0.50, shadowOp: 0.20,
    hlOp:    0.44, exOp: 0.30,
    ygOp:    0.32,
    fruits:  [[162, 152, 6.5]],
    scale:   0.74,
    overlay: { fill: '#a05a10', opacity: 0.08 },
  },
  // Level 3 — 安定（健康的な緑）
  3: {
    base:    '#215038', mid: '#2e6c46', body: '#3c8858',
    leftOp:  0.76, shadowOp: 0.32,
    hlOp:    0.62, exOp: 0.46,
    ygOp:    0.56,
    fruits:  [[64, 92, 9], [84, 148, 8.5], [222, 100, 9], [192, 174, 7.5]],
    scale:   0.90,
    overlay: null,
  },
  // Level 4 — とても安心（濃い緑・たくさんの実）
  4: {
    base:    '#1c5030', mid: '#2a7048', body: '#389860',
    leftOp:  0.90, shadowOp: 0.28,
    hlOp:    0.72, exOp: 0.58,
    ygOp:    0.68,
    fruits:  [[64, 92, 10], [84, 148, 9], [108, 58, 7.5], [222, 100, 10], [252, 132, 8.5], [192, 174, 7.5], [162, 152, 6.5], [242, 64, 6]],
    scale:   1.00,
    overlay: null,
  },
};

// ─────────────────────────────────────────────────────────────
// アニメーション CSS
// ─────────────────────────────────────────────────────────────
const TREE_STYLES = `
  @keyframes treeShake {
    0%,100% { transform: rotate(0deg); }
    12%     { transform: rotate(-2.5deg); }
    28%     { transform: rotate(2.5deg); }
    44%     { transform: rotate(-1.8deg); }
    60%     { transform: rotate(1.8deg); }
    76%     { transform: rotate(-0.8deg); }
    88%     { transform: rotate(0.8deg); }
  }
  @keyframes treeGrow {
    0%   { transform: scale(0.90) translateY(8px); opacity: 0.7; }
    60%  { transform: scale(1.04) translateY(-2px); opacity: 1; }
    100% { transform: scale(1.00) translateY(0); opacity: 1; }
  }
  @keytml treeLeafPop {
    0%   { opacity: 0; transform: scale(0.5); }
    60%  { opacity: 1; transform: scale(1.1); }
    100% { opacity: 1; transform: scale(1.0); }
  }
  @keyframes treeShrink {
    0%   { transform: scale(1.0) translateY(0); }
    40%  { transform: scale(0.95) translateY(4px); }
    100% { transform: scale(1.0) translateY(0); }
  }
  .tree-anim-shake  { animation: treeShake  0.55s ease-in-out; transform-origin: center bottom; }
  .tree-anim-grow   { animation: treeGrow   0.75s cubic-bezier(0.34,1.2,0.64,1); }
  .tree-anim-shrink { animation: treeShrink 0.50s ease-out; }
`;

let treeStylesInjected = false;
const injectTreeStyles = () => {
  if (treeStylesInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = TREE_STYLES;
  document.head.appendChild(el);
  treeStylesInjected = true;
};

// ─────────────────────────────────────────────────────────────
// LifeTree
// ─────────────────────────────────────────────────────────────
/**
 * @param {1|2|3|4} level   - 余裕度レベル（gaugeToTreeLevel の戻り値）
 * @param {object}  [style] - 外側 div へ追加するスタイル
 * @param {boolean} [animated] - アニメーション有効（デフォルト true）
 */
export const LifeTree = ({ level = 2, style, animated = true }) => {
  injectTreeStyles();

  const prevLevelRef = React.useRef(level);
  const [animClass, setAnimClass] = React.useState('');

  React.useEffect(() => {
    if (!animated) return;
    const prev = prevLevelRef.current;
    prevLevelRef.current = level;

    if (level === prev) return;

    if (level > prev) {
      // 良化 → グロー
      setAnimClass('tree-anim-grow');
    } else {
      // 悪化 → シェイク
      setAnimClass('tree-anim-shake');
    }

    const t = setTimeout(() => setAnimClass(''), 800);
    return () => clearTimeout(t);
  }, [level, animated]);

  const safeLevel = Math.max(1, Math.min(4, Math.round(level)));
  const c = CFG[safeLevel];

  // スケール変換（cx=155, cy=140 を中心に拡縮）
  const scale = c.scale;
  const tx = 155 * (1 - scale);
  const ty = 140 * (1 - scale);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', ...style }}>
      <svg
        viewBox="0 0 320 268"
        width="100%"
        className={animClass}
        style={{
          display: 'block',
          maxWidth: 340,
          transformOrigin: 'center bottom',
          transition: 'transform 0.5s cubic-bezier(0.34,1.2,0.64,1)',
        }}
        aria-hidden="true"
      >
        <defs>
          {/* 日光（左上から） */}
          <radialGradient id="ltSun" cx="28%" cy="16%" r="62%">
            <stop offset="0%"   stopColor="#fff8a8" stopOpacity="0.55"/>
            <stop offset="100%" stopColor="#c8f090" stopOpacity="0"/>
          </radialGradient>
          {/* 左側の明るい面 */}
          <radialGradient id="ltLeft" cx="30%" cy="44%" r="68%">
            <stop offset="0%"   stopColor="#78d840" stopOpacity={c.leftOp}/>
            <stop offset="100%" stopColor="#48a858" stopOpacity="0"/>
          </radialGradient>
          {/* 幹グラデーション */}
          <linearGradient id="ltTk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#4a2808"/>
            <stop offset="28%"  stopColor="#7a4825"/>
            <stop offset="55%"  stopColor="#a87038"/>
            <stop offset="80%"  stopColor="#be8848"/>
            <stop offset="100%" stopColor="#5c3618"/>
          </linearGradient>
          {/* ソフトブラー */}
          <filter id="ltSoft" x="-18%" y="-18%" width="136%" height="136%">
            <feGaussianBlur stdDeviation="2.2"/>
          </filter>
          {/* 環境光ブラー */}
          <filter id="ltAmb" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="8"/>
          </filter>
        </defs>

        <g transform={`translate(${tx},${ty}) scale(${scale})`}>

          {/* 地面の環境光 */}
          <ellipse cx="155" cy="258" rx="124" ry="20" fill="#082015" opacity="0.14" filter="url(#ltAmb)"/>

          {/* ── 葉冠レイヤー ── */}
          {/* L1: 最も暗い基本シルエット */}
          <path fill={c.base}
            d="M155,16 C183,6 222,12 250,33 C274,51 284,79 282,104
               C280,124 293,140 287,158 C281,175 265,186 247,192
               C228,198 207,200 186,202 C170,203 161,203 155,203
               C149,203 140,203 124,202 C103,200 82,198 63,192
               C45,186 29,175 23,158 C17,140 30,124 28,104
               C26,79 36,51 60,33 C88,12 127,6 155,16 Z"
          />

          {/* L2: ミッドダーク */}
          <path fill={c.mid}
            d="M155,20 C181,11 218,17 244,37 C266,55 276,81 274,105
               C272,123 285,138 279,155 C273,171 258,181 240,187
               C222,193 201,195 182,197 C167,198 159,198 155,198
               C151,198 143,198 128,197 C109,195 88,193 70,187
               C52,181 37,171 31,155 C25,138 38,123 36,105
               C34,81 44,55 66,37 C92,17 129,11 155,20 Z"
          />

          {/* L3: メインボディ */}
          <path fill={c.body}
            d="M155,26 C179,17 212,23 236,42 C258,59 266,83 264,106
               C262,122 273,135 268,150 C263,164 250,173 234,178
               C217,183 198,185 180,186 C168,187 160,187 155,187
               C150,187 142,187 130,186 C112,185 93,183 76,178
               C60,173 47,164 42,150 C37,135 48,122 46,106
               C44,83 52,59 74,42 C98,23 131,17 155,26 Z"
          />

          {/* 左側の日当たり面 */}
          <ellipse cx="110" cy="108" rx="108" ry="88" fill="url(#ltLeft)"/>
          {/* 日光グロー */}
          <ellipse cx="115" cy="64" rx="118" ry="86" fill="url(#ltSun)"/>
          <ellipse cx="98"  cy="44" rx="62"  ry="44" fill="#fffce0" opacity="0.10"/>

          {/* 明るいハイライト */}
          <ellipse cx="88"  cy="70" rx="56" ry="42" fill="#78cc40" opacity={c.hlOp} filter="url(#ltSoft)"/>
          <ellipse cx="68"  cy="52" rx="30" ry="22" fill="#a8e840" opacity={c.exOp} filter="url(#ltSoft)"/>

          {/* 右側シャドウ */}
          <ellipse cx="206" cy="120" rx="96" ry="80" fill="#0e2212" opacity={c.shadowOp}/>

          {/* 黄緑アクセントクラスター */}
          <ellipse cx="78"  cy="64" rx="28" ry="18" fill="#a0e050" opacity={c.ygOp}         transform="rotate(-26 78 64)"  filter="url(#ltSoft)"/>
          <ellipse cx="54"  cy="98" rx="22" ry="14" fill="#8ed845" opacity={c.ygOp * 0.85}  transform="rotate(16 54 98)"   filter="url(#ltSoft)"/>
          <ellipse cx="104" cy="38" rx="26" ry="16" fill="#96e250" opacity={c.ygOp * 0.90}  transform="rotate(-16 104 38)" filter="url(#ltSoft)"/>
          <ellipse cx="150" cy="20" rx="20" ry="13" fill="#a6ea58" opacity={c.ygOp * 0.80}  transform="rotate(-5 150 20)"  filter="url(#ltSoft)"/>
          <ellipse cx="228" cy="54" rx="18" ry="12" fill="#90d848" opacity={c.ygOp * 0.60}  transform="rotate(20 228 54)"  filter="url(#ltSoft)"/>

          {/* 内部光の斑点 */}
          {safeLevel >= 3 && (
            <>
              <ellipse cx="120" cy="88" rx="18" ry="12" fill="#b8f890" opacity="0.18" transform="rotate(-12 120 88)"/>
              <ellipse cx="144" cy="62" rx="14" ry="9"  fill="#c4fca0" opacity="0.16" transform="rotate(8 144 62)"/>
            </>
          )}

          {/* ── 木の実 ── */}
          {c.fruits.map(([fx, fy, fr], i) => (
            <g key={i}>
              <circle cx={fx}           cy={fy}           r={fr}        fill="#E45810"/>
              <circle cx={fx - fr*0.24} cy={fy - fr*0.28} r={fr * 0.36} fill="#FFD890" opacity="0.54"/>
            </g>
          ))}

          {/* ── 枯れオーバーレイ（Level 1〜2） ── */}
          {c.overlay && (
            <ellipse cx="155" cy="110" rx="130" ry="100"
              fill={c.overlay.fill} opacity={c.overlay.opacity}
            />
          )}

          {/* ── 幹・根 ── */}
          <path d="M155,262 Q133,252 115,260" stroke="url(#ltTk)" strokeWidth="9"  fill="none" strokeLinecap="round"/>
          <path d="M155,262 Q177,252 195,260" stroke="url(#ltTk)" strokeWidth="9"  fill="none" strokeLinecap="round"/>
          <path d="M155,262 Q145,256 133,262" stroke="url(#ltTk)" strokeWidth="6"  fill="none" strokeLinecap="round"/>
          <path d="M155,262 Q165,256 177,262" stroke="url(#ltTk)" strokeWidth="6"  fill="none" strokeLinecap="round"/>

          {/* 幹本体 */}
          <path
            d="M138,264 C135,244 132,221 136,198 C139,184 145,171 155,165 C165,171 171,184 174,198 C178,221 175,244 172,264 Z"
            fill="url(#ltTk)"
          />
          {/* 幹ハイライト */}
          <path
            d="M148,264 C145,244 143,221 146,198 C148,186 151,174 155,167 C157,175 157,188 158,204 C160,224 162,244 162,264 Z"
            fill="#b87838" opacity="0.38"
          />
          {/* 幹の影 */}
          <path
            d="M138,264 C135,244 132,221 136,198 C138,186 142,174 147,167 C144,178 142,192 141,208 C140,228 140,248 140,264 Z"
            fill="#2e1004" opacity="0.24"
          />

        </g>
      </svg>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// LifeTreeMini — SimulationScreen の小型表示向け
// ─────────────────────────────────────────────────────────────
export const LifeTreeMini = ({ level = 2, size = 120, animated = true }) => (
  <LifeTree
    level={level}
    animated={animated}
    style={{ width: size, height: size * (268 / 320) }}
  />
);
