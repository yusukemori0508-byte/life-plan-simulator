// src/components/ResultScreen.jsx
// 結果画面 — MVP 安全判定 4 指標を表示
//
// 表示する 4 指標（MVP）:
//   1. 生活余裕度ゲージ（安全判定スコア）
//   2. 資金ショート年齢（破綻なし or XX歳で枯渇）
//   3. 最低資産年齢 / 最低資産額
//   4. 住宅購入リスク警告（住宅予定がある場合のみ）
//
// 将来拡張スロット（コメントで場所を確保済み）:
//   - 多軸スコアカード
//   - 破綻確率シミュレーション
//   - 改善提案パネル

import React from 'react';
import { useAppStore } from '../store/useAppStore.jsx';
import { runFullSimulation } from '../simulationEngine.js';
import { gaugeToColor, gaugeToGradient } from '../gaugeCalc.js';
import { FinanceChart } from './FinanceChart.jsx';
import { ScenarioComparison } from './ScenarioComparison.jsx';

// ─────────────────────────────────────────────────────────────
// カラー定数
// ─────────────────────────────────────────────────────────────
const C = {
  bg:         '#f4f7f4',
  white:      '#ffffff',
  text:       '#111827',
  textMuted:  '#6b7280',
  border:     '#e5e7eb',
  green:      '#22c55e',
  greenDark:  '#16a34a',
  greenBg:    '#f0fdf4',
  amber:      '#f59e0b',
  amberBg:    '#fffbeb',
  red:        '#ef4444',
  redBg:      '#fef2f2',
  redDark:    '#dc2626',
  teal:       '#0891b2',
  tealBg:     '#ecfeff',
};

// ─────────────────────────────────────────────────────────────
// 数値フォーマット
// ─────────────────────────────────────────────────────────────
const fmtAsset = (n) => {
  if (n == null) return '—';
  const abs = Math.abs(Math.round(n));
  if (abs >= 10000) return `${n < 0 ? '−' : '+'}${(abs / 10000).toFixed(1)}億円`;
  return `${n < 0 ? '−' : '+'}${abs.toLocaleString()}万円`;
};

const fmtAssetAbs = (n) => {
  if (n == null) return '—';
  const abs = Math.abs(Math.round(n));
  return `${abs.toLocaleString()}万円`;
};

// ─────────────────────────────────────────────────────────────
// ゲージバー
// ─────────────────────────────────────────────────────────────
const GaugeBar = ({ gauge, color, gradient }) => (
  <div style={{ width: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: '0.06em' }}>家計安全度</span>
      <span style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{gauge}</span>
    </div>
    <div style={{
      height: 10, borderRadius: 99, background: '#e9ecef', overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width:  `${gauge}%`,
        borderRadius: 99,
        background: gradient,
        transition: 'width 1s cubic-bezier(0.22,1,0.36,1)',
      }} />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textMuted, marginTop: 3 }}>
      <span>0</span><span>高リスク</span><span>要見直し</span><span>慎重</span><span>安全圏</span><span>100</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// セクションカード共通
// ─────────────────────────────────────────────────────────────
const Card = ({ children, style }) => (
  <div style={{
    background:    C.white,
    borderRadius:  20,
    padding:       '20px',
    border:        `1px solid ${C.border}`,
    marginBottom:  12,
    ...style,
  }}>
    {children}
  </div>
);

const CardLabel = ({ children, color = C.textMuted }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
    color, marginBottom: 10, textTransform: 'uppercase',
  }}>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────
// ResultScreen
// ─────────────────────────────────────────────────────────────
export const ResultScreen = ({ onBack, onRestart }) => {
  const { state, actions } = useAppStore();
  const { profileData, selectedChoices, resultData } = state;

  // resultData がストアにあればそれを使い、なければここで計算
  const result = React.useMemo(() => {
    if (resultData && resultData.safetySummary) return resultData;
    return runFullSimulation(profileData, selectedChoices);
  }, [resultData, profileData, selectedChoices]);

  const s       = result.safetySummary;
  const color   = gaugeToColor(s.gauge);
  const gradient = gaugeToGradient(s.gauge);

  const [revealed, setRevealed] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 200);
    return () => clearTimeout(t);
  }, []);

  const handleBack = () => {
    if (typeof onBack === 'function') onBack();
    else actions.setScreen('simulation');
  };
  const handleRestart = () => {
    if (typeof onRestart === 'function') onRestart();
    else actions.setScreen('input');
  };

  return (
    <div style={{
      minHeight:  '100vh',
      background: C.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif',
      paddingBottom: 40,
    }}>
      <style>{`
        @keyframes rsReveal {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rs-card { animation: rsReveal 0.55s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {/* ── ヘッダー ───────────────────────────────────────────── */}
      <div style={{
        position:       'sticky', top: 0, zIndex: 50,
        background:     'rgba(244,247,244,0.97)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom:   `1px solid ${C.border}`,
        padding:        '14px 20px',
        display:        'flex',
        alignItems:     'center',
        gap:            12,
      }}>
        <button onClick={handleBack} style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `1.5px solid ${C.border}`, background: C.white,
          fontSize: 15, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: C.textMuted,
        }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>安全判定レポート</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>シミュレーション完了</div>
        </div>
      </div>

      {/* ── メインコンテンツ ─────────────────────────────────── */}
      <div style={{ padding: '16px', maxWidth: 480, margin: '0 auto' }}>

        {/* ────────────────────────────────────────────────────── */}
        {/* ヒーロー: 家計安全度（2層構造）                        */}
        {/* ────────────────────────────────────────────────────── */}
        <div
          className="rs-card"
          style={{
            background:     `linear-gradient(145deg, ${color}14, ${color}06)`,
            borderRadius:   24,
            padding:        '24px 20px 20px',
            marginBottom:   14,
            border:         `1.5px solid ${color}40`,
            animationDelay: '0.05s',
            opacity:        revealed ? 1 : 0,
            transition:     'opacity 0.5s ease',
          }}
        >
          {/* タイトル */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.10em', marginBottom: 14, textAlign: 'center' }}>
            家計安全度レポート
          </div>

          {/* 2層スコア表示 */}
          {s.baseGauge != null && s.baseGauge !== s.adjustedGauge ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
              {/* ベーススコア */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, marginBottom: 4, letterSpacing: '0.06em' }}>
                  収支ベース
                </div>
                <div style={{ fontSize: 52, fontWeight: 900, color: gaugeToColor(s.baseGauge), lineHeight: 1 }}>
                  {s.baseGauge}
                </div>
              </div>
              {/* 矢印 */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>補正</div>
                <div style={{ fontSize: 18, color: '#ef4444' }}>→</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
                  −{s.dampedTotal}
                </div>
              </div>
              {/* イベント反映後スコア */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, marginBottom: 4, letterSpacing: '0.06em' }}>
                  イベント反映後
                </div>
                <div style={{ fontSize: 52, fontWeight: 900, color, lineHeight: 1 }}>
                  {s.adjustedGauge ?? s.gauge}
                </div>
              </div>
            </div>
          ) : (
            /* 補正なし: シンプル表示 */
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 72, fontWeight: 900, color, lineHeight: 1 }}>
                {s.gauge}
              </div>
            </div>
          )}

          {/* ステータスバッジ + メッセージ */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{
              display:      'inline-block',
              padding:      '4px 16px', borderRadius: 999,
              background:   s.status.bg, color: s.status.color,
              fontSize:     13, fontWeight: 800, letterSpacing: '0.04em',
              border:       `1.5px solid ${s.status.color}40`,
              marginBottom: 8,
            }}>
              {s.status.label}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7, maxWidth: 280, margin: '0 auto' }}>
              {s.message}
            </div>
          </div>

          {/* ゲージバー */}
          <GaugeBar gauge={s.adjustedGauge ?? s.gauge} color={color} gradient={gradient} />

          {/* 補正ブレイクダウン */}
          {s.corrections && s.corrections.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', marginBottom: 8 }}>
                スコア低下の要因
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {s.corrections.map((c) => (
                  <div key={c.key} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '8px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.70)',
                    border: `1px solid ${C.amber}30`,
                  }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>{c.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#78350f' }}>{c.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 900, color: '#ef4444' }}>−{c.pts}点</span>
                      </div>
                      {c.items.length > 0 && (
                        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2, lineHeight: 1.5 }}>
                          {c.items.join('・')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {s.dampedTotal < s.rawTotal && (
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6, textAlign: 'right' }}>
                  ※複数要因の重複減衰を適用（−{s.rawTotal}点 → −{s.dampedTotal}点）
                </div>
              )}
            </div>
          )}

          {/* 資金ショートがある場合の注記 */}
          {(s.adjustedGauge ?? s.gauge) >= 30 && s.isCollapsed && (
            <div style={{
              marginTop: 12, padding: '7px 14px', borderRadius: 10,
              background: C.redBg, border: `1px solid ${C.red}40`,
              fontSize: 11, color: C.redDark, fontWeight: 600,
            }}>
              ⚠️ 上スコアは収支ベースです。下の「資金ショート判定」も必ず確認してください
            </div>
          )}
        </div>

        {/* ────────────────────────────────────────────────────── */}
        {/* カード 1.5: スコアの根拠（explanationReasons）         */}
        {/* ────────────────────────────────────────────────────── */}
        {s.explanationReasons && s.explanationReasons.length > 0 && (
          <Card className="rs-card" style={{ animationDelay: '0.15s', padding: '16px 18px' }}>
            <CardLabel>収支の詳細</CardLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {s.explanationReasons.map((r, i) => {
                const parts    = r.text.split(/—|―/);
                const headline = parts[0]?.trim() ?? r.text;
                const detail   = parts[1]?.trim() ?? null;
                const isSafe   = r.type === 'safe';
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '8px 12px', borderRadius: 10,
                    background: isSafe ? C.greenBg : C.amberBg,
                    border: `1px solid ${isSafe ? C.green + '60' : C.amber + '60'}`,
                  }}>
                    <span style={{ fontSize: 13, flexShrink: 0, marginTop: 2, color: isSafe ? C.greenDark : '#b45309' }}>
                      {isSafe ? '✓' : '!'}
                    </span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.4, color: isSafe ? C.greenDark : '#78350f' }}>
                        {headline}
                      </div>
                      {detail && (
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>{detail}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 10, lineHeight: 1.6 }}>
              ※ 収入は手取り概算（所得税・社会保険控除後）、支出には月1.5万円の臨時支出バッファを含みます
            </div>
          </Card>
        )}

        {/* ────────────────────────────────────────────────────── */}
        {/* カード 2: 資金ショート（破綻安全性）                   */}
        {/* ────────────────────────────────────────────────────── */}
        <Card className="rs-card" style={{ animationDelay: '0.2s' }}>
          <CardLabel>資金ショート判定</CardLabel>

          {!s.isCollapsed ? (
            // 破綻なし
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>✓</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.greenDark }}>
                  破綻リスクなし
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                  {profileData.lifespan ?? 90}歳まで資産はプラスを維持します
                </div>
              </div>
            </div>
          ) : s.isCollapsedBefore ? (
            // 退職前破綻（最も深刻）
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: C.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>⚠</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.redDark }}>
                  {s.collapseAge}歳で資産が枯渇
                </div>
                <div style={{
                  fontSize: 11, color: C.redDark, marginTop: 2,
                  padding: '3px 8px', background: C.redBg,
                  borderRadius: 6, display: 'inline-block',
                  fontWeight: 700,
                }}>
                  退職前に破綻 — 早急な見直しが必要です
                </div>
              </div>
            </div>
          ) : (
            // 老後破綻
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>!</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#b45309' }}>
                  {s.collapseAge}歳で資産が枯渇
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                  老後の資産が途中で尽きます。支出の見直しを検討してください
                </div>
              </div>
            </div>
          )}

          {/* 老後資産（退職時点） */}
          <div style={{
            marginTop:    14,
            padding:      '12px 16px',
            borderRadius: 12,
            background:   '#f8fafb',
            border:       `1px solid ${C.border}`,
            display:      'flex',
            justifyContent: 'space-between',
            alignItems:   'center',
          }}>
            <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>
              退職時（{profileData.retirementAge ?? 65}歳）資産
            </span>
            <span style={{
              fontSize:   18,
              fontWeight: 900,
              color:      s.retirementAsset >= 0 ? C.greenDark : C.redDark,
            }}>
              {fmtAsset(s.retirementAsset)}
            </span>
          </div>
        </Card>

        {/* ────────────────────────────────────────────────────── */}
        {/* 年金サマリーカード                                     */}
        {/* ────────────────────────────────────────────────────── */}
        {result.pensionInfo && result.pensionInfo.totalMonthly > 0 && (
          <Card className="rs-card" style={{ animationDelay: '0.28s' }}>
            <CardLabel>公的年金（試算に含まれています）</CardLabel>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              {/* 本人 */}
              <div style={{
                flex: 1, padding: '10px 12px', borderRadius: 12,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
              }}>
                <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 2, fontWeight: 600 }}>本人の推定年金</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#15803d' }}>
                  約{Math.round(result.pensionInfo.selfAnnual / 12 * 10) / 10}
                  <span style={{ fontSize: 10, fontWeight: 500, color: '#6b7280' }}>万/月</span>
                </div>
                <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>
                  年{result.pensionInfo.selfAnnual}万円
                </div>
              </div>
              {/* 配偶者（いる場合のみ） */}
              {result.pensionInfo.spouseAnnual > 0 ? (
                <div style={{
                  flex: 1, padding: '10px 12px', borderRadius: 12,
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                }}>
                  <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 2, fontWeight: 600 }}>配偶者の推定年金</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#15803d' }}>
                    約{Math.round(result.pensionInfo.spouseAnnual / 12 * 10) / 10}
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#6b7280' }}>万/月</span>
                  </div>
                  <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>
                    年{result.pensionInfo.spouseAnnual}万円
                  </div>
                </div>
              ) : (
                <div style={{
                  flex: 1, padding: '10px 12px', borderRadius: 12,
                  background: '#f8fafc', border: '1px solid #e5e7eb',
                }}>
                  <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 2, fontWeight: 600 }}>世帯合計</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#15803d' }}>
                    約{result.pensionInfo.totalMonthly}
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#6b7280' }}>万/月</span>
                  </div>
                  <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>
                    {result.pensionInfo.startAge}歳〜
                  </div>
                </div>
              )}
            </div>
            <div style={{
              fontSize: 10, color: '#6b7280', lineHeight: 1.7,
              padding: '8px 10px', background: '#fffbeb',
              borderRadius: 8, border: '1px solid #fde68a',
            }}>
              ⚠️ 年金は概算です。実際の受給額はねんきんネット・ねんきん定期便でご確認ください。
              月の生活費（{profileData.monthlyExpense ?? 20}万円）との差分が老後の毎年の取崩し額の目安になります。
            </div>
          </Card>
        )}

        {/* ────────────────────────────────────────────────────── */}
        {/* カード 3: 最低資産年齢 / 最低資産額                   */}
        {/* ────────────────────────────────────────────────────── */}
        <Card className="rs-card" style={{ animationDelay: '0.3s' }}>
          <CardLabel>資産の最低ライン</CardLabel>

          <div style={{ display: 'flex', gap: 12 }}>
            {/* 最低資産年齢 */}
            <div style={{
              flex: 1, padding: '14px 16px', borderRadius: 14,
              background: s.minAssetSeverity === 'danger' ? C.redBg
                        : s.minAssetSeverity === 'warn'   ? C.amberBg
                        : C.greenBg,
              border: `1px solid ${
                s.minAssetSeverity === 'danger' ? C.red + '40'
                : s.minAssetSeverity === 'warn'   ? C.amber + '40'
                : C.green + '40'
              }`,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                color: C.textMuted, marginBottom: 6,
              }}>最低資産になる年齢</div>
              <div style={{
                fontSize: 24, fontWeight: 900,
                color: s.minAssetSeverity === 'danger' ? C.redDark
                     : s.minAssetSeverity === 'warn'   ? '#b45309'
                     : C.greenDark,
                lineHeight: 1,
              }}>
                {s.minAsset.age ?? '—'}<span style={{ fontSize: 12, marginLeft: 2 }}>歳</span>
              </div>
            </div>

            {/* 最低資産額 */}
            <div style={{
              flex: 1, padding: '14px 16px', borderRadius: 14,
              background: s.minAssetSeverity === 'danger' ? C.redBg
                        : s.minAssetSeverity === 'warn'   ? C.amberBg
                        : C.greenBg,
              border: `1px solid ${
                s.minAssetSeverity === 'danger' ? C.red + '40'
                : s.minAssetSeverity === 'warn'   ? C.amber + '40'
                : C.green + '40'
              }`,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                color: C.textMuted, marginBottom: 6,
              }}>そのときの資産残高</div>
              <div style={{
                fontSize: s.minAsset.value != null && Math.abs(s.minAsset.value) >= 10000 ? 16 : 20,
                fontWeight: 900,
                color: s.minAsset.value < 0 ? C.redDark : C.text,
                lineHeight: 1,
                wordBreak: 'break-all',
              }}>
                {s.minAsset.value != null
                  ? (s.minAsset.value < 0
                      ? `−${fmtAssetAbs(s.minAsset.value)}`
                      : fmtAssetAbs(s.minAsset.value))
                  : '—'}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 10, lineHeight: 1.6 }}>
            {s.minAssetSeverity === 'danger' && '資産がマイナスになっています。収入増や支出削減を優先的に検討してください。'}
            {s.minAssetSeverity === 'warn'   && '資産が200万円を下回る時期があります。緊急資金として十分か確認を。'}
            {s.minAssetSeverity === 'ok'     && '資産の谷でも十分な残高があり、緊急支出にも対応できます。'}
          </div>

          {/* 最低資産ラインの注記 */}
          <div style={{
            marginTop:    10,
            paddingTop:   8,
            borderTop:    `1px solid ${C.border}`,
            fontSize:     10,
            color:        C.textMuted,
            lineHeight:   1.7,
          }}>
            この数値には住宅購入諸費用（物件価格の約5%）・年間維持費（固定資産税・修繕積立等）・月1.5万円の臨時支出バッファを反映しています。収入は手取り概算ベースです。税制・市場環境により実際の金額は変動します。
          </div>
        </Card>

        {/* ────────────────────────────────────────────────────── */}
        {/* カード 4: 住宅購入安全チェック（購入予定がある場合のみ） */}
        {/* ────────────────────────────────────────────────────── */}
        {s.housingDetail && (() => {
          const h          = s.housingDetail;
          const hasWarning = s.hasHousingRisk;
          const borderCol  = hasWarning ? `${C.amber}70` : `${C.green}50`;
          const bgCol      = hasWarning ? C.amberBg     : C.greenBg;
          const labelCol   = hasWarning ? '#92400e'     : C.greenDark;

          // 購入時点資産の深刻度
          const purchaseSeverity =
            h.savingsAtPurchase === null   ? 'unknown' :
            h.savingsAtPurchase < 0        ? 'danger'  :
            h.savingsAtPurchase < 200      ? 'warn'    : 'ok';

          // 購入後5年最低資産の深刻度
          const post5Severity =
            h.minAssetPost5 === null  ? 'unknown' :
            h.minAssetPost5 < 0       ? 'danger'  :
            h.minAssetPost5 < 200     ? 'warn'    : 'ok';

          const severityColor = (sev) =>
            sev === 'danger' ? C.redDark :
            sev === 'warn'   ? '#b45309' : C.greenDark;

          const severityBg = (sev) =>
            sev === 'danger' ? C.redBg   :
            sev === 'warn'   ? C.amberBg : C.greenBg;

          return (
            <Card
              className="rs-card"
              style={{ animationDelay: '0.4s', border: `1.5px solid ${borderCol}`, background: bgCol }}
            >
              <CardLabel color={labelCol}>この住宅購入プランの判定（{h.purchaseAge}歳購入予定）</CardLabel>

              {/* ── ローン概要 1行 ── */}
              {h.loanAmount > 0 && (
                <div style={{
                  padding: '10px 14px', borderRadius: 12, marginBottom: 12,
                  background: (() => {
                    const s = h.repaymentBurdenSeverity;
                    return s === 'danger' ? C.redBg : s === 'warn' ? C.amberBg : '#f0fdf4';
                  })(),
                  border: `1px solid ${(() => {
                    const s = h.repaymentBurdenSeverity;
                    return s === 'danger' ? C.red + '50' : s === 'warn' ? C.amber + '50' : C.green + '50';
                  })()}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, marginBottom: 3 }}>
                      借入額 {Math.round(h.loanAmount).toLocaleString()}万円 / {h.mortgageTerm}年 / {h.mortgageRate}%
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: severityColor(h.repaymentBurdenSeverity), lineHeight: 1 }}>
                        {h.monthlyPayment != null ? h.monthlyPayment.toFixed(1) : '—'}
                      </span>
                      <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>万円/月</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, marginBottom: 3 }}>返済負担率</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: severityColor(h.repaymentBurdenSeverity), lineHeight: 1 }}>
                      {h.repaymentBurden != null ? `${Math.round(h.repaymentBurden)}%` : '—'}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: severityColor(h.repaymentBurdenSeverity) }}>
                      {h.repaymentBurdenSeverity === 'danger' ? '重い' :
                       h.repaymentBurdenSeverity === 'warn'   ? '要注意' : '適正'}
                    </div>
                  </div>
                </div>
              )}

              {/* ── 数値サマリー 2列 ── */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>

                {/* 購入年末残高（頭金＋初年度ローン支払い後） */}
                <div style={{
                  flex: 1, padding: '12px 14px', borderRadius: 14,
                  background: severityBg(purchaseSeverity),
                  border: `1px solid ${severityColor(purchaseSeverity)}30`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, marginBottom: 5, letterSpacing: '0.06em' }}>
                    購入年末残高
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: severityColor(purchaseSeverity), lineHeight: 1 }}>
                    {h.savingsAtPurchase !== null
                      ? `${Math.round(h.savingsAtPurchase).toLocaleString()}万`
                      : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>
                    {h.purchaseAge}歳末（頭金・ローン込み）
                  </div>
                </div>

                {/* 購入後5年間の最低資産 */}
                <div style={{
                  flex: 1, padding: '12px 14px', borderRadius: 14,
                  background: severityBg(post5Severity),
                  border: `1px solid ${severityColor(post5Severity)}30`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, marginBottom: 5, letterSpacing: '0.06em' }}>
                    購入後5年の最低資産
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: severityColor(post5Severity), lineHeight: 1 }}>
                    {h.minAssetPost5 !== null
                      ? `${Math.round(h.minAssetPost5).toLocaleString()}万`
                      : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>
                    最も苦しい時期
                  </div>
                </div>
              </div>

              {/* ── 頭金余力チェック ── */}
              <div style={{
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'space-between',
                padding:      '10px 14px',
                borderRadius: 12,
                background:   h.hasDownPayment ? C.greenBg : C.redBg,
                border:       `1px solid ${h.hasDownPayment ? C.green : C.red}30`,
                marginBottom: 10,
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: h.hasDownPayment ? C.greenDark : C.redDark }}>
                    頭金準備水準（物件価格の10%比較）
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    最低目安 {h.downPaymentTarget.toLocaleString()}万円　現在 {h.savings.toLocaleString()}万円
                  </div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>
                    ※購入後の生活余力とは別の指標です
                  </div>
                </div>
                <div style={{
                  fontSize:     13,
                  fontWeight:   800,
                  color:        h.hasDownPayment ? C.greenDark : C.redDark,
                  flexShrink:   0,
                }}>
                  {h.hasDownPayment
                    ? '準備OK'
                    : `${h.downPaymentShortfall.toLocaleString()}万不足`}
                </div>
              </div>

              {/* ── 総合判定バッジ ── */}
              {(() => {
                const isDanger  = h.repaymentBurdenSeverity === 'danger'
                  || (h.minAssetPost5 !== null && h.minAssetPost5 < 0)
                  || (h.savingsAtPurchase !== null && h.savingsAtPurchase < 0);
                const isCaution = !isDanger && (hasWarning
                  || h.repaymentBurdenSeverity === 'warn'
                  || (h.minAssetPost5 !== null && h.minAssetPost5 < 200));
                const label = isDanger ? '危険' : isCaution ? '慎重' : '安全';
                const col   = isDanger ? C.redDark : isCaution ? '#b45309' : C.greenDark;
                const bg    = isDanger ? C.redBg   : isCaution ? C.amberBg : C.greenBg;
                return (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: 10,
                    background: bg, border: `1.5px solid ${col}40`, marginBottom: 10,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>住宅購入 総合判定</span>
                    <span style={{
                      fontSize: 14, fontWeight: 900, color: col,
                      padding: '3px 14px', borderRadius: 999,
                      background: 'rgba(255,255,255,0.6)', border: `1.5px solid ${col}50`,
                    }}>{label}</span>
                  </div>
                );
              })()}

              {/* ── 既存借入との重複チェック ── */}
              {h.existingLoanOverlap && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '9px 12px', borderRadius: 10, marginBottom: 10,
                  background: C.white, border: `1px solid ${C.amber}40`,
                }}>
                  <span style={{ color: C.amber, fontSize: 13, flexShrink: 0, marginTop: 1 }}>!</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#78350f' }}>
                      既存借入と住宅ローンが重複
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                      月 {h.existingLoanOverlap.toFixed(1)}万円の既存返済がある状態でローンが始まります
                    </div>
                  </div>
                </div>
              )}

              {/* ── 教育費イベントとの近接チェック ── */}
              {h.nearbyEducation && h.nearbyEducation.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '9px 12px', borderRadius: 10, marginBottom: 10,
                  background: C.white, border: `1px solid ${C.amber}40`,
                }}>
                  <span style={{ color: C.amber, fontSize: 13, flexShrink: 0, marginTop: 1 }}>!</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#78350f' }}>
                      教育費イベントと購入時期が近接
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                      {h.nearbyEducation.map(e => `${e.label}（${e.age}歳）`).join(' / ')} — 住宅ローン開始と教育費が重なります
                    </div>
                  </div>
                </div>
              )}

              {/* ── 警告リスト（リスクがある項目のみ） ── */}
              {(h.nearbyChildren.length > 0 || h.spouseNotYetReturned) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>

                  {/* 子ども予定近接 */}
                  {h.nearbyChildren.map((child) => (
                    <div key={child.index} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '9px 12px', borderRadius: 10,
                      background: C.white, border: `1px solid ${C.amber}40`,
                    }}>
                      <span style={{ color: C.amber, fontSize: 13, flexShrink: 0, marginTop: 1 }}>!</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#78350f' }}>
                          第{child.index}子の出産予定と住宅購入が近い
                        </div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                          出産予定 {child.birthAge}歳 / 住宅購入 {h.purchaseAge}歳
                          （{Math.abs(child.diff)}年差）
                          {child.diff < 0 ? ' — 出産後すぐにローン開始' : ' — ローン返済中に出産'}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 配偶者復職前 */}
                  {h.spouseNotYetReturned && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '9px 12px', borderRadius: 10,
                      background: C.white, border: `1px solid ${C.amber}40`,
                    }}>
                      <span style={{ color: C.amber, fontSize: 13, flexShrink: 0, marginTop: 1 }}>!</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#78350f' }}>
                          配偶者が復職前にローン開始
                        </div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                          住宅購入 {h.purchaseAge}歳 / 配偶者復職予定 {h.spouseReturnAge}歳
                          — 復職まで世帯収入が少ない状態でローンが始まります
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── フッターメモ ── */}
              {(() => {
                const isDanger = h.repaymentBurdenSeverity === 'danger'
                  || (h.minAssetPost5 !== null && h.minAssetPost5 < 0)
                  || (h.savingsAtPurchase !== null && h.savingsAtPurchase < 0);
                return (
                  <div style={{
                    fontSize: 11, lineHeight: 1.7,
                    padding: '10px 12px', borderRadius: 10,
                    background: isDanger ? C.redBg : hasWarning ? C.amberBg : 'rgba(255,255,255,0.55)',
                    border: `1px solid ${isDanger ? C.red + '40' : hasWarning ? C.amber + '40' : 'transparent'}`,
                    color: isDanger ? C.redDark : hasWarning ? '#92400e' : C.greenDark,
                  }}>
                    {isDanger
                      ? '購入後の生活余力が不足しています。価格・時期・頭金を見直してください。このプランのままでは家計が圧迫され、緊急支出に対応できない可能性があります。'
                      : hasWarning
                        ? 'リスク要因があります。購入時期・物件価格・頭金の再検討をおすすめします。'
                        : '資金的な準備は概ね整っています。購入後も生活余力を確保しながら進めましょう。'}
                  </div>
                );
              })()}

              {/* ── 試算の前提注記 ── */}
              <div style={{
                marginTop: 10, fontSize: 10, color: '#6b7280',
                lineHeight: 1.7, padding: '8px 10px',
                background: '#f8fafc', borderRadius: 8,
                border: '1px solid #e5e7eb',
              }}>
                📋 この試算では、<strong>住宅購入後は家賃を0</strong>として、
                代わりに月返済額・管理費・固定資産税・維持費を支出に反映しています。
                購入前は現在の住居費（家賃）を支出に含めて計算しています。
              </div>
            </Card>
          );
        })()}

        {/* ────────────────────────────────────────────────────── */}
        {/* 家計推移グラフ                                         */}
        {/* ────────────────────────────────────────────────────── */}
        <Card className="rs-card" style={{ animationDelay: '0.45s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <CardLabel style={{ marginBottom: 0 }}>家計推移</CardLabel>
            {result.pensionInfo && result.pensionInfo.totalMonthly > 0 && (
              <div style={{
                fontSize: 10, fontWeight: 700, color: '#15803d',
                background: '#dcfce7', padding: '3px 8px', borderRadius: 999,
                letterSpacing: '0.03em',
              }}>
                年金込み試算
              </div>
            )}
          </div>
          <FinanceChart
            rows={result.rows}
            rowsNoPension={result.rowsNoPension}
            profile={profileData}
            minAssetInfo={result.minAsset}
            pensionInfo={result.pensionInfo}
          />
        </Card>

        {/* ────────────────────────────────────────────────────── */}
        {/* 住宅購入プラン比較                                     */}
        {/* ────────────────────────────────────────────────────── */}
        <Card className="rs-card" style={{ animationDelay: '0.50s' }}>
          <CardLabel>住宅購入プラン比較</CardLabel>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12, lineHeight: 1.6 }}>
            購入時期・頭金・価格を変えると家計がどう変わるかを確認できます。
          </div>
          <ScenarioComparison
            profileData={profileData}
            selectedChoices={selectedChoices}
          />
        </Card>

        {/* ── フッターボタン ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>

          {/* アクションページへのボタン */}
          <button
            onClick={() => actions.setScreen('action')}
            style={{
              width:        '100%',
              padding:      '16px 24px',
              borderRadius: 999,
              border:       'none',
              background:   'linear-gradient(135deg, #0d9488, #0f766e)',
              color:        '#fff',
              fontSize:     15,
              fontWeight:   700,
              letterSpacing:'0.05em',
              cursor:       'pointer',
              boxShadow:    '0 6px 20px rgba(13,148,136,0.28)',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              gap:          8,
            }}
          >
            <span style={{ fontSize: 18 }}>💡</span>
            <span>未来を良くするアクションを見る</span>
          </button>

          {/* 主CTA: 条件を変えて再試算 */}
          <button
            onClick={handleRestart}
            style={{
              width:        '100%',
              padding:      '17px 24px',
              borderRadius: 999,
              border:       'none',
              background:   'linear-gradient(135deg, #22c55e, #16a34a)',
              color:        '#fff',
              fontSize:     16,
              fontWeight:   700,
              letterSpacing:'0.08em',
              cursor:       'pointer',
              boxShadow:    '0 8px 24px rgba(34,197,94,0.25)',
            }}
          >
            条件を変えて再試算
          </button>

          {/* サブ: シミュレーションに戻る */}
          <button
            onClick={handleBack}
            style={{
              width:        '100%',
              padding:      '13px 24px 11px',
              borderRadius: 999,
              border:       `1.5px solid ${C.border}`,
              background:   C.white,
              color:        C.text,
              fontSize:     14,
              fontWeight:   600,
              cursor:       'pointer',
              lineHeight:   1,
            }}
          >
            <div>シミュレーションに戻る</div>
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 400, marginTop: 3 }}>
              イベント選択の続きに戻ります
            </div>
          </button>

          {/* テキストリンク: 最初からやり直す */}
          <button
            onClick={() => { actions.fullReset(); actions.setScreen('home'); }}
            style={{
              width:      '100%',
              padding:    '8px',
              border:     'none',
              background: 'none',
              color:      C.textMuted,
              fontSize:   12,
              fontWeight: 500,
              cursor:     'pointer',
              textDecoration: 'underline',
            }}
          >
            最初からやり直す
          </button>
        </div>

        {/* 注意書き */}
        <div style={{
          marginTop:  20,
          fontSize:   10,
          color:      '#aabcaa',
          textAlign:  'center',
          lineHeight: 1.8,
        }}>
          ※ 本シミュレーターは概算です。重要な資産判断・住宅購入は専門家にご相談ください。
        </div>

      </div>
    </div>
  );
};
