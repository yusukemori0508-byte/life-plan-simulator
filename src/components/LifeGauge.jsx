// src/components/LifeGauge.jsx
// 生活余裕度ゲージ（仕様③）
//
// 仕様:
//   - 0〜100 の値を視覚化
//   - 80〜100: 安心（緑）/ 50〜79: 注意（オレンジ）/ 0〜49: 危険（赤）
//   - 悪化時: 軽く横揺れアニメーション
//   - 良化時: 滑らかに増加するアニメーション
//   - props: gauge (number), prev (number | undefined), compact (bool)

import React from 'react';
import { gaugeToMessage, gaugeToColor, gaugeToStatus } from '../gaugeCalc.js';

// ─────────────────────────────────────────────────────────────
// アニメーション CSS（一度だけグローバルに挿入）
// ─────────────────────────────────────────────────────────────
const GAUGE_STYLES = `
  @keyframes gaugeShake {
    0%,100% { transform: translateX(0); }
    15%     { transform: translateX(-5px); }
    30%     { transform: translateX(5px); }
    45%     { transform: translateX(-4px); }
    60%     { transform: translateX(4px); }
    75%     { transform: translateX(-2px); }
    90%     { transform: translateX(2px); }
  }
  @keyframes gaugeGlow {
    0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
    70%  { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }
  @keyframes gaugePulse {
    0%,100% { opacity: 1; }
    50%     { opacity: 0.7; }
  }
  .gauge-shake { animation: gaugeShake 0.5s ease-in-out; }
  .gauge-up    { transition: width 0.7s cubic-bezier(0.34, 1.2, 0.64, 1); }
  .gauge-down  { transition: width 0.4s ease-out; }
`;

let stylesInjected = false;
const injectStyles = () => {
  if (stylesInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = GAUGE_STYLES;
  document.head.appendChild(el);
  stylesInjected = true;
};

// ─────────────────────────────────────────────────────────────
// ゲージ値 → アーク描画用のパスデータ（SVG 半円）
// ─────────────────────────────────────────────────────────────
const describeArc = (cx, cy, r, startAngle, endAngle) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
};

// ─────────────────────────────────────────────────────────────
// LifeGauge — フル表示（SimulationScreen 用）
// ─────────────────────────────────────────────────────────────
/**
 * @param {number}          gauge    - 現在のゲージ値（0〜100）
 * @param {number}          [prev]   - 前回のゲージ値（差分アニメーション用）
 * @param {boolean}         [compact] - コンパクト表示（InputScreen 上部向け）
 * @param {string}          [label]  - 上部ラベル（デフォルト: "生活余裕度"）
 */
export const LifeGauge = ({ gauge = 50, prev, compact = false, label = '生活安全度' }) => {
  injectStyles();

  const prevRef    = React.useRef(gauge);
  const [anim, setAnim] = React.useState('');

  // 値が変わったときのアニメーション制御
  React.useEffect(() => {
    const direction = gauge > prevRef.current ? 'up' : gauge < prevRef.current ? 'down' : 'same';
    prevRef.current = gauge;

    if (direction === 'down') {
      setAnim('shake');
      const t = setTimeout(() => setAnim(''), 600);
      return () => clearTimeout(t);
    }
    if (direction === 'up') {
      setAnim('up');
      const t = setTimeout(() => setAnim(''), 800);
      return () => clearTimeout(t);
    }
  }, [gauge]);

  const color    = gaugeToColor(gauge);
  const status   = gaugeToStatus(gauge);
  const message  = gaugeToMessage(gauge);
  const clampedG = Math.max(0, Math.min(100, gauge));

  if (compact) {
    return <GaugeCompact gauge={clampedG} color={color} message={message} anim={anim} label={label} />;
  }

  return <GaugeFull gauge={clampedG} color={color} status={status} message={message} anim={anim} label={label} />;
};

// ─────────────────────────────────────────────────────────────
// GaugeFull — 半円メーター + 数字 + ラベル（SimulationScreen 向け）
// ─────────────────────────────────────────────────────────────
const GaugeFull = ({ gauge, color, status, message, anim, label }) => {
  // 半円: -210° 〜 30°（240° の範囲を gauge% で埋める）
  const START_DEG = 150;   // 左端（-210° = 150° from right）
  const RANGE_DEG = 240;
  const cx = 100, cy = 90, r = 72;

  const fillEnd = START_DEG + (gauge / 100) * RANGE_DEG;

  // トラック（薄いグレー）
  const trackPath = describeArc(cx, cy, r, START_DEG, START_DEG + RANGE_DEG);
  // 塗りアーク
  const fillPath  = gauge > 0 ? describeArc(cx, cy, r, START_DEG, fillEnd) : null;

  // 目盛り（5段階）
  const ticks = [0, 25, 50, 75, 100].map((v) => {
    const deg = START_DEG + (v / 100) * RANGE_DEG;
    const rad = (deg * Math.PI) / 180;
    const outer = r + 10;
    const inner = r - 0;
    return {
      x1: cx + inner * Math.cos(rad),
      y1: cy + inner * Math.sin(rad),
      x2: cx + outer * Math.cos(rad),
      y2: cy + outer * Math.sin(rad),
      label: v,
      lx: cx + (outer + 14) * Math.cos(rad),
      ly: cy + (outer + 14) * Math.sin(rad),
    };
  });

  return (
    <div
      className={anim === 'shake' ? 'gauge-shake' : ''}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}
    >
      {/* ラベル */}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.10em', marginBottom: 4 }}>
        {label}
      </div>

      {/* SVG メーター */}
      <svg width={200} height={120} viewBox="0 0 200 120" style={{ overflow: 'visible' }}>
        {/* トラック */}
        <path d={trackPath} fill="none" stroke="#f0f0f0" strokeWidth={14} strokeLinecap="round" />

        {/* 塗り（色付き） */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={color}
            strokeWidth={14}
            strokeLinecap="round"
            className={anim === 'up' ? 'gauge-up' : 'gauge-down'}
            style={{ transition: 'stroke 0.4s ease, stroke-dasharray 0.7s cubic-bezier(0.34,1.2,0.64,1)' }}
          />
        )}

        {/* 目盛り */}
        {ticks.map((t) => (
          <g key={t.label}>
            <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke="#d1d5db" strokeWidth={1.5} strokeLinecap="round" />
          </g>
        ))}

        {/* 中央数値 */}
        <text x={cx} y={cy + 4} textAnchor="middle"
          style={{ fontSize: 32, fontWeight: 900, fill: color, fontFamily: 'inherit' }}>
          {gauge}
        </text>
        <text x={cx} y={cy + 22} textAnchor="middle"
          style={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'inherit' }}>
          / 100
        </text>

        {/* 0・100 ラベル */}
        <text x={ticks[0].lx - 6} y={ticks[0].ly + 4} textAnchor="middle"
          style={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'inherit' }}>0</text>
        <text x={ticks[4].lx + 6} y={ticks[4].ly + 4} textAnchor="middle"
          style={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'inherit' }}>100</text>
      </svg>

      {/* ステータスバッジ + メッセージ */}
      <div style={{ marginTop: -8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{
          padding:      '4px 16px',
          borderRadius: 999,
          background:   status.bg,
          border:       `1.5px solid ${color}30`,
          color,
          fontSize:     13,
          fontWeight:   800,
          letterSpacing: '0.04em',
        }}>
          {status.label}
        </div>
        <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
          {message}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// GaugeCompact — 横長バー（InputScreen / 小スペース向け）
// ─────────────────────────────────────────────────────────────
const GaugeCompact = ({ gauge, color, message, anim, label }) => (
  <div
    className={anim === 'shake' ? 'gauge-shake' : ''}
    style={{
      background:   '#fff',
      borderRadius: 16,
      padding:      '14px 18px',
      border:       `1.5px solid ${color}30`,
      display:      'flex',
      alignItems:   'center',
      gap:          14,
      boxShadow:    `0 2px 12px ${color}18`,
    }}
  >
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </div>
      {/* バー */}
      <div style={{ height: 8, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height:     '100%',
          width:      `${gauge}%`,
          borderRadius: 99,
          background: color,
          transition: 'width 0.6s cubic-bezier(0.34,1.2,0.64,1)',
        }} />
      </div>
      <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 5 }}>{message}</div>
    </div>
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{gauge}</div>
      <div style={{ fontSize: 10, color: '#9ca3af' }}>/ 100</div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// GaugeDelta — イベント選択後の変化量表示（EventCard 向け）
// ─────────────────────────────────────────────────────────────
/**
 * 選択肢の gaugeDelta を視覚化する小コンポーネント
 * @param {number} delta - 正=増加 負=減少
 */
export const GaugeDelta = ({ delta }) => {
  if (delta === 0) return (
    <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700 }}>±0</span>
  );
  const isUp  = delta > 0;
  const color = isUp ? '#22c55e' : '#ef4444';
  return (
    <span style={{
      fontSize:     12,
      fontWeight:   800,
      color,
      background:   `${color}18`,
      padding:      '2px 8px',
      borderRadius: 999,
    }}>
      {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{delta}
    </span>
  );
};

export default LifeGauge;
