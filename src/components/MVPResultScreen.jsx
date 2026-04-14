// src/components/MVPResultScreen.jsx
import React from 'react';
import { LifeTree } from './LifeTree.jsx';
import { calcMVP, LEVEL_INFO } from '../mvpCalc.js';

// 背景の雰囲気（レベルで変化）
const BG = {
  1: 'linear-gradient(168deg, #b8e8d4 0%, #d4f4e8 35%, #f0fae8 100%)',
  2: 'linear-gradient(168deg, #c0ecd8 0%, #d8f2e8 35%, #f2faea 100%)',
  3: 'linear-gradient(168deg, #d4e8c0 0%, #e8f0cc 35%, #f4f4e4 100%)',
  4: 'linear-gradient(168deg, #e0d8c4 0%, #ece4d0 35%, #f4ece0 100%)',
};

const fmt = (n) => {
  if (n >= 0) return `+${n.toLocaleString()}万円`;
  return `${n.toLocaleString()}万円`;
};

export const MVPResultScreen = ({ inputs, onBack }) => {
  const result = React.useMemo(() => calcMVP(inputs), [inputs]);
  const info   = LEVEL_INFO[result.level];
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      minHeight:'100vh',
      background: BG[result.level],
      display:'flex', flexDirection:'column',
      alignItems:'center',
      overflow:'hidden',
      position:'relative',
    }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes treeGrow {
          0%   { transform:scale(0.72) translateY(24px); opacity:0; }
          100% { transform:scale(1.00) translateY(0);    opacity:1; }
        }
        @keyframes scoreReveal {
          0%   { opacity:0; transform:scale(0.85); }
          100% { opacity:1; transform:scale(1.00); }
        }
      `}</style>

      {/* ヘッダー */}
      <div style={{
        width:'100%', padding:'18px 20px 0',
        display:'flex', alignItems:'center', gap:12,
        position:'relative', zIndex:5,
      }}>
        <button
          onClick={onBack}
          style={{
            width:38, height:38, borderRadius:'50%',
            border:`2px solid ${info.color}40`,
            background:'rgba(255,255,255,0.75)',
            cursor:'pointer', fontSize:15,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}
        >
          ←
        </button>
        <div style={{ fontSize:13, fontWeight:800, color: info.color, letterSpacing:0.5 }}>
          あなたの未来の木
        </div>
      </div>

      {/* 木イラスト */}
      <div style={{
        width:'100%', maxWidth:360,
        padding:'8px 20px 0',
        animation: revealed ? 'treeGrow 0.75s cubic-bezier(0.34,1.2,0.64,1) both' : 'none',
        opacity: revealed ? undefined : 0,
      }}>
        <LifeTree level={result.level} />
      </div>

      {/* 評価パネル */}
      <div style={{
        background:'rgba(255,255,255,0.90)',
        borderRadius:28,
        margin:'0 16px',
        padding:'28px 24px',
        width:'calc(100% - 32px)',
        maxWidth:420,
        boxShadow:'0 8px 40px rgba(0,0,0,0.08)',
        backdropFilter:'blur(10px)',
        WebkitBackdropFilter:'blur(10px)',
        animation: revealed ? 'fadeUp 0.6s ease 0.5s both' : 'none',
        opacity: revealed ? undefined : 0,
        boxSizing:'border-box',
      }}>
        {/* レベルインジケーター */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: `linear-gradient(135deg, ${info.color}, ${info.color}cc)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 16px ${info.color}40`,
          }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="#fff">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20c9 0 11-10 11-10-.59 1.1-1.59 2.1-3 2.9A8.63 8.63 0 0 0 17 8z" />
            </svg>
          </div>
        </div>

        {/* 評価ラベル */}
        <div style={{
          fontSize:22, fontWeight:900, color: info.color,
          textAlign:'center', marginBottom:20, letterSpacing:'0.01em',
        }}>
          {info.label}
        </div>

        {/* 老後余裕額 */}
        <div style={{
          background: info.bg,
          borderRadius:18, padding:'18px 20px',
          textAlign:'center', marginBottom:20,
          border:`1.5px solid ${info.color}30`,
        }}>
          <div style={{ fontSize:11, color: info.color, fontWeight:700, marginBottom:6, letterSpacing:1.5 }}>
            老後余裕額（推定）
          </div>
          <div style={{
            fontSize:32, fontWeight:900, color: info.color,
            letterSpacing:'0.02em',
            animation: revealed ? 'scoreReveal 0.5s ease 0.8s both' : 'none',
            opacity: revealed ? undefined : 0,
          }}>
            {fmt(result.totalAssets)}
          </div>
          <div style={{ fontSize:10, color:`${info.color}88`, marginTop:4 }}>
            * 65歳時点〜90歳までの概算
          </div>
        </div>

        {/* サブメッセージ */}
        <div style={{
          fontSize:12, color:'#6a8a70', textAlign:'center',
          lineHeight:1.8, marginBottom:24,
        }}>
          {result.level === 1 && 'このままのペースで続ければ、安心した老後を迎えられます。'}
          {result.level === 2 && '着実に積み上げています。少し投資を増やすとさらに安心です。'}
          {result.level === 3 && '支出を少し見直すか、投資を増やすと大きく改善します。'}
          {result.level === 4 && '収支バランスを見直す必要があります。まず支出から確認しましょう。'}
        </div>

        {/* CTAボタン */}
        <button
          onClick={onBack}
          style={{
            width:'100%', padding:'16px',
            borderRadius:24, border:'none',
            background:`linear-gradient(135deg, ${info.color}, ${info.color}cc)`,
            color:'#fff', fontSize:15, fontWeight:900,
            cursor:'pointer', letterSpacing:'0.04em',
            boxShadow:`0 6px 24px ${info.color}40`,
          }}
        >
          もう少し育てる
        </button>
      </div>

      {/* フッター */}
      <div style={{
        padding:'20px 20px 36px',
        fontSize:10, color:'#a0b8a0', textAlign:'center', lineHeight:2,
      }}>
        * 本シミュレーターは概算です。重要な判断は専門家にご相談ください。
      </div>
    </div>
  );
};
