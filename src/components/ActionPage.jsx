// src/components/ActionPage.jsx
// 別パターン比較ページ
// ─ 診断結果をベースに、条件を変えた場合のパターンを中立的に案内する
// ─ 「改善を促す」ではなく「別の選択肢を自分で確認できる」情報提供にとどめる

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
    category: 'プランの前提を確認する',
    title:    '住宅・教育費の想定をFPと確認したい場合',
    body:     '住宅価格・頭金・教育費の組み合わせが家計にどう影響するか、専門家の視点で確認できます。シミュレーションの前提整理に活用できます。',
    btnLabel: 'FPに相談してみる',
    href:     'https://example.com/fp',   // ← 後でURLを差し替えてください
    accentColor: '#2563eb',
    accentBg:    '#eff6ff',
    condition: ({ gauge, hasHousing, hasExistingLoans }) =>
      hasHousing || gauge < 65 || hasExistingLoans,
  },
  {
    id:       'insurance',
    icon:     '🛡️',
    category: 'リスクのカバー状況を確認する',
    title:    '保障内容を別パターンで確認したい場合',
    body:     '住宅購入や子どもの予定がある場合、現在の保障と家計のバランスを確認する選択肢のひとつです。',
    btnLabel: '保障内容を確認する',
    href:     'https://example.com/insurance',   // ← 後でURLを差し替えてください
    accentColor: '#0d9488',
    accentBg:    '#f0fdfa',
    condition: ({ gauge, hasHousing, hasChildren }) =>
      hasHousing || hasChildren || gauge < 65,
  },
  {
    id:       'invest',
    icon:     '📈',
    category: '積立パターンを比較する',
    title:    '積立額を変えた場合の違いを確認したい場合',
    body:     '毎月の積立額を少し変えると、退職時の資産にどう影響するかをシミュレーターの入力から試せます。',
    btnLabel: '積立パターンを試す',
    href:     'https://example.com/invest',   // ← 後でURLを差し替えてください
    accentColor: '#16a34a',
    accentBg:    '#f0fdf4',
    condition: ({ gauge, monthlyInvestment, isCollapsed }) =>
      monthlyInvestment === 0 && gauge >= 70 && !isCollapsed,
  },
  // ── ここから将来カードを追加できます ──
  // { id: 'nisa', icon: '💹', category: 'NISA活用', title: '...', ... },
  // { id: 'loan', icon: '🏠', category: '住宅ローン比較', title: '...', ... },
  // { id: 'edu',  icon: '🎓', category: '教育費パターン確認', title: '...', ... },
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
            別パターンで比較する
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
            条件を変えた場合の違いを確認できます
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
              現在の試算における家計安全度
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
              今回の試算結果をもとに確認できるパターン
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
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#14532d', marginBottom: 8 }}>
              現在の条件では安定した試算です
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.75 }}>
              住宅・車・教育費など条件を変えた場合は<br />「条件を変えて再試算」から確認できます。
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
          ← 結果画面に戻る
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
            ※ このページは参考情報の案内を目的としており、特定の金融商品・サービスを推奨するものではありません。<br />
            ※ 表示される内容はシミュレーション結果にもとづく参考例です。<br />
            ※ 住宅購入・資産運用・保険の選択はご自身の状況に合わせてご判断ください。
          </div>
        </div>

      </div>
    </div>
  );
};
