// src/components/ActionPage.jsx
// お金改善アクションページ
// ─ 診断結果に応じて次の行動候補を信頼感あるカード形式で表示する
// ─ 特定の商品を断定推奨せず、「次のステップ候補」として情報提供

import React from 'react';

// ─────────────────────────────────────────────────────────────
// アクションカード定義（後から追加するときはここに追記するだけ）
// condition(ctx) → boolean でこのカードを表示するかを制御
// href は後で差し替え可能。クリックは logClick() でイベント記録
// ─────────────────────────────────────────────────────────────
const ACTION_CARDS = [
  {
    id:       'fp',
    icon:     '🏦',
    category: 'ファイナンシャルプランナー',
    title:    '住宅購入や教育費を整理するには',
    body:     '住宅購入、教育費、借入の重なり方を専門家に整理してもらうことで、家計に合った判断がしやすくなる場合があります。',
    btnLabel: '無料で相談する',
    href:     'https://example.com/fp',   // ← 後でURLを差し替えてください
    accentColor: '#2563eb',
    accentBg:    '#eff6ff',
    condition: ({ gauge, hasHousing, hasExistingLoans }) =>
      hasHousing || gauge < 65 || hasExistingLoans,
  },
  {
    id:       'insurance',
    icon:     '🛡️',
    category: '保険の見直し',
    title:    '教育費・住宅リスクに備えるには',
    body:     '住宅購入や子どもの予定がある場合は、保障内容を見直すことで家計の不安を減らせる場合があります。',
    btnLabel: '無料相談する',
    href:     'https://example.com/insurance',   // ← 後でURLを差し替えてください
    accentColor: '#0d9488',
    accentBg:    '#f0fdfa',
    condition: ({ gauge, hasHousing, hasChildren }) =>
      hasHousing || hasChildren || gauge < 65,
  },
  {
    id:       'invest',
    icon:     '📈',
    category: '資産形成',
    title:    '将来資産を育てるには',
    body:     '家計に無理のない範囲で積立を始めると、将来資産の改善につながる可能性があります。',
    btnLabel: '投資を始める',
    href:     'https://example.com/invest',   // ← 後でURLを差し替えてください
    accentColor: '#16a34a',
    accentBg:    '#f0fdf4',
    condition: ({ gauge, monthlyInvestment, isCollapsed }) =>
      monthlyInvestment === 0 && gauge >= 70 && !isCollapsed,
  },
  // ── ここから将来カードを追加できます ──
  // { id: 'nisa', icon: '💹', category: 'NISA活用', title: '...', ... },
  // { id: 'loan', icon: '🏠', category: '住宅ローン比較', title: '...', ... },
  // { id: 'edu',  icon: '🎓', category: '教育費対策', title: '...', ... },
];

// ─────────────────────────────────────────────────────────────
// クリックイベントログ（将来GA等に差し替え可能）
// ─────────────────────────────────────────────────────────────
const logClick = (cardId, href) => {
  // コンソールログ（開発確認用）
  console.log('[ActionPage] card_click', { cardId, href, ts: Date.now() });
  // 将来: window.gtag?.('event', 'action_card_click', { card_id: cardId });
};

// ─────────────────────────────────────────────────────────────
// 単一アクションカード
// ─────────────────────────────────────────────────────────────
const ActionCard = ({ card }) => {
  const handleClick = () => {
    logClick(card.id, card.href);
    window.open(card.href, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{
      background:   '#fff',
      borderRadius: 16,
      boxShadow:    '0 2px 12px rgba(0,0,0,0.07)',
      padding:      '20px 20px 18px',
      display:      'flex',
      flexDirection:'column',
      gap:          12,
    }}>
      {/* カテゴリバッジ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{card.icon}</span>
        <span style={{
          fontSize:     10,
          fontWeight:   700,
          letterSpacing:'0.06em',
          color:        card.accentColor,
          background:   card.accentBg,
          padding:      '3px 9px',
          borderRadius: 999,
        }}>
          {card.category}
        </span>
      </div>

      {/* タイトル */}
      <div style={{
        fontSize:   15,
        fontWeight: 700,
        color:      '#1a2e1a',
        lineHeight: 1.45,
      }}>
        {card.title}
      </div>

      {/* 説明文 */}
      <div style={{
        fontSize:   12,
        color:      '#4b5563',
        lineHeight: 1.75,
      }}>
        {card.body}
      </div>

      {/* CTAボタン */}
      <button
        onClick={handleClick}
        style={{
          marginTop:    2,
          padding:      '12px 20px',
          borderRadius: 999,
          border:       `1.5px solid ${card.accentColor}30`,
          background:   card.accentBg,
          color:        card.accentColor,
          fontSize:     13,
          fontWeight:   700,
          cursor:       'pointer',
          letterSpacing:'0.04em',
          textAlign:    'center',
          transition:   'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        {card.btnLabel} →
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// メイン：ActionPage
// ─────────────────────────────────────────────────────────────
export const ActionPage = ({ profileData, result, onBack }) => {
  const s = result?.safetySummary ?? {};

  // housingType: 明示指定があればそれを使い、なければ housingPurchaseAge から導出
  const housingType =
    profileData?.housingType ??
    (profileData?.housingPurchaseAge ? 'future_purchase' : 'rent');

  // 表示条件を判定するコンテキストを構築
  const ctx = {
    gauge:             s.gauge ?? 50,
    isCollapsed:       s.isCollapsed ?? false,
    hasHousing:        housingType !== 'rent',
    hasChildren:       (profileData?.numChildren ?? 0) > 0,
    hasExistingLoans:  (profileData?.existingLoans ?? []).length > 0,
    monthlyInvestment: profileData?.monthlyInvestment ?? 0,
  };

  // 表示すべきカードをフィルタリング
  const visibleCards = ACTION_CARDS.filter(c => c.condition(ctx));

  return (
    <div style={{
      minHeight:      '100vh',
      background:     'linear-gradient(180deg, #f0fdf4 0%, #f8fafb 120px)',
      paddingBottom:  48,
      fontFamily:     "'Hiragino Sans', 'Noto Sans JP', sans-serif",
    }}>

      {/* ── ヘッダー ── */}
      <div style={{
        position:   'sticky',
        top:        0,
        zIndex:     10,
        background: 'rgba(240,253,244,0.92)',
        backdropFilter: 'blur(8px)',
        padding:    '14px 20px 12px',
        display:    'flex',
        alignItems: 'center',
        gap:        10,
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border:     'none',
            padding:    '4px 8px 4px 2px',
            cursor:     'pointer',
            fontSize:   18,
            color:      '#374151',
            lineHeight: 1,
          }}
        >
          ←
        </button>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#14532d', letterSpacing: '0.02em' }}>
            未来を良くするアクション
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
            診断結果に合わせた次のステップ候補
          </div>
        </div>
      </div>

      {/* ── コンテンツ ── */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 0' }}>

        {/* スコアサマリーバー */}
        <div style={{
          background:   '#fff',
          borderRadius: 14,
          padding:      '14px 18px',
          boxShadow:    '0 2px 10px rgba(0,0,0,0.06)',
          marginBottom: 24,
          display:      'flex',
          alignItems:   'center',
          gap:          14,
        }}>
          <div style={{ fontSize: 28, lineHeight: 1 }}>
            {ctx.gauge >= 70 ? '✅' : ctx.gauge >= 50 ? '⚠️' : '🔴'}
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>
              あなたの家計安全度スコア
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{
                fontSize:   26,
                fontWeight: 900,
                color:      ctx.gauge >= 70 ? '#16a34a' : ctx.gauge >= 50 ? '#d97706' : '#dc2626',
              }}>
                {ctx.gauge}
              </span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>/100</span>
              <span style={{
                fontSize:   10,
                fontWeight: 700,
                color:      ctx.gauge >= 70 ? '#16a34a' : ctx.gauge >= 50 ? '#d97706' : '#dc2626',
                background: ctx.gauge >= 70 ? '#f0fdf4' : ctx.gauge >= 50 ? '#fffbeb' : '#fef2f2',
                padding:    '2px 8px',
                borderRadius: 999,
                marginLeft: 4,
              }}>
                {ctx.gauge >= 85 ? '安全圏' : ctx.gauge >= 70 ? '比較的安全' : ctx.gauge >= 50 ? '慎重判断' : '要見直し'}
              </span>
            </div>
          </div>
        </div>

        {/* カードセクション */}
        {visibleCards.length > 0 ? (
          <>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 14, letterSpacing: '0.04em' }}>
              あなたの診断結果に関連する情報
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {visibleCards.map(card => (
                <ActionCard key={card.id} card={card} />
              ))}
            </div>
          </>
        ) : (
          // 該当カードが0件の場合
          <div style={{
            background:   '#fff',
            borderRadius: 16,
            padding:      '32px 20px',
            textAlign:    'center',
            boxShadow:    '0 2px 10px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#14532d', marginBottom: 8 }}>
              現在の家計は安定しています
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.75 }}>
              今後ライフイベントが増えたときに<br />再度ご確認ください。
            </div>
          </div>
        )}

        {/* 戻るボタン */}
        <button
          onClick={onBack}
          style={{
            marginTop:    28,
            width:        '100%',
            padding:      '13px',
            borderRadius: 999,
            border:       '1.5px solid #d1fae5',
            background:   '#fff',
            color:        '#374151',
            fontSize:     14,
            fontWeight:   600,
            cursor:       'pointer',
          }}
        >
          ← 診断結果に戻る
        </button>

        {/* 免責・注意書き */}
        <div style={{
          marginTop:  28,
          padding:    '14px 16px',
          background: '#f9fafb',
          borderRadius: 12,
          border:     '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.85 }}>
            ※ このページは情報提供を目的としており、特定の金融商品・サービスを推奨するものではありません。<br />
            ※ 表示される情報はシミュレーション結果に基づく参考情報です。<br />
            ※ 資産運用・保険・住宅購入の最終的な判断は、ご自身の責任において行ってください。
          </div>
        </div>

      </div>
    </div>
  );
};
