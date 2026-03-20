// src/components/FinanceChart.jsx
// 家計推移グラフ（資産・収入・支出）＋ 一覧表
// SVG のみで描画。外部チャートライブラリ不使用。

import React from 'react';

// ── SVG レイアウト定数 ────────────────────────────────────────
const W  = 320, H  = 185;   // 高さを拡大（見やすく）
const PL = 44, PR = 8, PT = 8, PB = 42; // PB: 住宅マーカー年齢ラベル分を確保
const CW = W - PL - PR;
const CH = H - PT - PB;

const TABS = [
  { id: 'assets',  label: '資産' },
  { id: 'income',  label: '収入' },
  { id: 'expense', label: '支出' },
  { id: 'table',   label: '一覧' },
];

// ── ヘルパー ──────────────────────────────────────────────────
const fmtAxis = (v) => {
  const a = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (a >= 10000) return `${s}${(a / 10000).toFixed(1)}億`;
  if (a >= 1000)  return `${s}${(a / 1000).toFixed(1)}千万`;
  if (a >= 100)   return `${s}${Math.round(a / 100)}百万`;
  return `${s}${Math.round(a)}万`;
};

const fmtCell = (v) => {
  const a = Math.abs(Math.round(v));
  const s = v < 0 ? '-' : '';
  if (a >= 10000) return `${s}${(a / 10000).toFixed(1)}億`;
  if (a >= 1000)  return `${s}${(a / 1000).toFixed(1)}千万`;
  return `${s}${a.toLocaleString()}万`;
};

// Y軸のステップ幅を計算（range を maxTicks 以下に分割できる最小のキリよい数）
const niceStep = (range, maxTicks = 5) => {
  if (range <= 0) return 500;
  const raw = range / maxTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * mag >= raw) return m * mag;
  return mag * 10;
};

// Y軸レンジ（assets タブは 0 を必ず含む）
const computeYRange = (values, includeZero) => {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const lo = includeZero ? Math.min(rawMin, 0) : rawMin;
  const hi = Math.max(rawMax, 0);
  if (lo === hi) return { yMin: lo - 500, yMax: hi + 500, step: 500 };
  const step = niceStep(hi - lo);
  return {
    yMin: Math.floor(lo / step) * step,
    yMax: Math.ceil(hi  / step) * step,
    step,
  };
};

// プロフィールから可視化するイベントリストを生成
const buildEvents = (profile) => {
  if (!profile) return [];
  const list = [];
  const add = (age, icon) => { if (age > 0) list.push({ age: Number(age), icon }); };

  if (profile.housingPurchaseAge) add(profile.housingPurchaseAge, '🏠');

  const numC = profile.numChildren || 0;
  const childArr = Array.isArray(profile.childAges) ? profile.childAges : [profile.firstChildAge];
  for (let i = 0; i < numC; i++) {
    const ba = childArr[i] ?? (childArr[0] != null ? childArr[0] + i * (profile.childSpacing || 3) : null);
    if (ba > 0) { add(ba, '👶'); add(ba + 18, '🎓'); }
  }
  if (profile.carOwnership && profile.carFirstAge > 0) {
    const cycle  = profile.carReplaceCycle || 7;
    const retire = profile.retirementAge   || 65;
    for (let a = profile.carFirstAge; a <= retire; a += cycle) add(a, '🚗');
  }

  // 同じ年のアイコンをまとめる
  const byAge = {};
  for (const e of list) byAge[e.age] = (byAge[e.age] || '') + e.icon;
  return Object.entries(byAge)
    .map(([age, icon]) => ({ age: Number(age), icon }))
    .sort((a, b) => a.age - b.age);
};

// ── 折れ線グラフ SVG ──────────────────────────────────────────
const LineChart = ({ data, ageMin, ageMax, retireAge, minAssetAge, tabId, events }) => {
  if (!data || data.length < 2) return null;

  const values = data.map(d => d.value);
  const { yMin, yMax, step } = computeYRange(values, tabId === 'assets');
  if (yMax === yMin) return null;

  const xOf = (age) => PL + ((age - ageMin) / (ageMax - ageMin)) * CW;
  const yOf = (v)   => PT + CH - ((v - yMin) / (yMax - yMin)) * CH;
  const yZero = yOf(0);

  // Y 軸目盛り
  const yTicks = [];
  for (let v = yMin; v <= yMax + step * 0.001; v += step) yTicks.push(Math.round(v));

  // X 軸目盛り（5 年または 10 年刻み）
  const xGap   = (ageMax - ageMin) >= 50 ? 10 : 5;
  const xTicks = [];
  for (let a = Math.ceil(ageMin / xGap) * xGap; a <= ageMax; a += xGap) xTicks.push(a);

  // 折れ線パス
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(d.age).toFixed(1)},${yOf(d.value).toFixed(1)}`)
    .join(' ');

  // 面グラフ（資産タブ: 正区間=緑 / 負区間=赤、その他: 単色）
  const buildArea = (forPos) => {
    const segs = [];
    let seg = null;
    for (let i = 0; i < data.length; i++) {
      const d     = data[i];
      const match = forPos ? d.value >= 0 : d.value < 0;
      if (match) {
        if (!seg) {
          const x0 = i > 0
            ? (() => {
                const p = data[i - 1];
                const r = Math.abs(p.value) / (Math.abs(p.value) + Math.abs(d.value));
                return xOf(p.age) + r * (xOf(d.age) - xOf(p.age));
              })()
            : xOf(d.age);
          seg = { start: [x0, yZero], pts: [] };
        }
        seg.pts.push([xOf(d.age), yOf(d.value)]);
      } else if (seg) {
        const p = data[i - 1];
        const r = Math.abs(p.value) / (Math.abs(p.value) + Math.abs(d.value));
        seg.end = [xOf(p.age) + r * (xOf(d.age) - xOf(p.age)), yZero];
        segs.push(seg); seg = null;
      }
    }
    if (seg) { seg.end = [xOf(data[data.length - 1].age), yZero]; segs.push(seg); }
    return segs.map(s => {
      const pts = [...s.pts, s.end];
      return `M${s.start[0].toFixed(1)},${s.start[1].toFixed(1)} ` +
        pts.map(p => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z';
    }).join(' ');
  };

  const simpleArea = (() => {
    if (tabId === 'assets') return '';
    const f = data[0]; const l = data[data.length - 1];
    return `M${xOf(f.age).toFixed(1)},${yZero.toFixed(1)} ` +
      data.map(d => `L${xOf(d.age).toFixed(1)},${yOf(d.value).toFixed(1)}`).join(' ') +
      ` L${xOf(l.age).toFixed(1)},${yZero.toFixed(1)} Z`;
  })();

  const lineColor = tabId === 'income' ? '#16a34a' : tabId === 'expense' ? '#d97706' : '#2563eb';
  const areaGradId = tabId === 'income' ? 'fc-inc' : tabId === 'expense' ? 'fc-exp' : 'fc-pos';

  // イベントマーカー（住宅購入のみ チャートに表示）
  const visEvents = events.filter(e => e.age >= ageMin && e.age <= ageMax && e.icon.includes('🏠'));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="fc-pos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="fc-neg" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="fc-inc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="fc-exp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d97706" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#d97706" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Y グリッド */}
      {yTicks.map(v => (
        <g key={v}>
          <line
            x1={PL} y1={yOf(v).toFixed(1)} x2={W - PR} y2={yOf(v).toFixed(1)}
            stroke={v === 0 ? '#94a3b8' : '#e2e8f0'}
            strokeWidth={v === 0 ? 0.8 : 0.5}
            strokeDasharray={v !== 0 ? '2,3' : undefined}
          />
          <text
            x={PL - 3} y={yOf(v).toFixed(1)}
            textAnchor="end" dominantBaseline="middle"
            fontSize="7.5" fill={v === 0 ? '#64748b' : '#94a3b8'}
            fontFamily="-apple-system,sans-serif"
          >{fmtAxis(v)}</text>
        </g>
      ))}

      {/* X ラベル */}
      {xTicks.map(a => (
        <text key={a}
          x={xOf(a).toFixed(1)} y={PT + CH + 10}
          textAnchor="middle" fontSize="7.5" fill="#94a3b8"
          fontFamily="-apple-system,sans-serif"
        >{a}</text>
      ))}

      {/* 退職ライン */}
      {retireAge >= ageMin && retireAge <= ageMax && (
        <line
          x1={xOf(retireAge).toFixed(1)} y1={PT}
          x2={xOf(retireAge).toFixed(1)} y2={PT + CH}
          stroke="#2563eb" strokeWidth="1" strokeDasharray="4,3" opacity="0.5"
        />
      )}

      {/* 面塗り */}
      {tabId === 'assets' && (
        <>
          <path d={buildArea(true)}  fill="url(#fc-pos)" />
          <path d={buildArea(false)} fill="url(#fc-neg)" />
        </>
      )}
      {tabId !== 'assets' && simpleArea && (
        <path d={simpleArea} fill={`url(#${areaGradId})`} />
      )}

      {/* 折れ線 */}
      <path
        d={linePath} fill="none" stroke={lineColor}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      />

      {/* 最低資産マーカー */}
      {tabId === 'assets' && minAssetAge != null &&
        minAssetAge >= ageMin && minAssetAge <= ageMax && (() => {
        const row = data.find(d => d.age === minAssetAge);
        if (!row) return null;
        return (
          <circle
            cx={xOf(minAssetAge).toFixed(1)} cy={yOf(row.value).toFixed(1)} r="3.5"
            fill={row.value < 0 ? '#ef4444' : '#f59e0b'}
            stroke="white" strokeWidth="1.2"
          />
        );
      })()}

      {/* 住宅購入マーカー（目立つ縦線 + アイコン + 年齢ラベル） */}
      {visEvents.map(ev => {
        const x = xOf(ev.age);
        if (x < PL || x > W - PR) return null;
        return (
          <g key={`ev-${ev.age}`}>
            {/* 縦の実線（チャート全高・強め） */}
            <line
              x1={x.toFixed(1)} y1={PT}
              x2={x.toFixed(1)} y2={PT + CH}
              stroke="#f97316" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.7"
            />
            {/* 菱形マーカー（大きめ） */}
            <polygon
              points={`${x},${(PT + CH - 7)} ${x + 6},${(PT + CH)} ${x},${(PT + CH + 7)} ${x - 6},${(PT + CH)}`}
              fill="#f97316"
            />
            {/* アイコン */}
            <text x={x.toFixed(1)} y={(PT + CH + 18)} textAnchor="middle" fontSize="10">
              {ev.icon}
            </text>
            {/* 年齢ラベル（太字・大きめ） */}
            <text
              x={x.toFixed(1)} y={(PT + CH + 30)}
              textAnchor="middle" fontSize="8" fill="#f97316" fontWeight="bold"
              fontFamily="-apple-system,sans-serif"
            >
              {ev.age}歳
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ── 一覧表 ───────────────────────────────────────────────────
const TableView = ({ rows, eventsByAge, retireAge, minAssetAge }) => {
  const shown = rows.filter(r =>
    r.age % 5 === 0 ||
    eventsByAge[r.age] ||
    r.age === retireAge ||
    r.age === minAssetAge
  );
  return (
    <div style={{ overflowX: 'auto', marginTop: 4 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 290 }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
            {['歳', '収入', '支出', '資産', 'イベント'].map((h, i) => (
              <th key={h} style={{
                padding: '6px 6px', fontSize: 10, fontWeight: 700, color: '#6b7280',
                textAlign: i === 0 || i === 4 ? 'center' : 'right',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map(r => {
            const isRetire  = r.age === retireAge;
            const isMin     = r.age === minAssetAge;
            const isDanger  = r.totalAssets < 0;
            const bg = isDanger ? '#fef2f2' : isRetire ? '#f0fdf4' : isMin ? '#fffbeb' : 'transparent';
            return (
              <tr key={r.age} style={{ background: bg, borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: isRetire ? 800 : 500, color: isRetire ? '#16a34a' : '#374151', fontSize: 11 }}>
                  {r.age}
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'right', color: '#16a34a', fontSize: 11 }}>
                  {fmtCell(r.totalIncome)}
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'right', color: '#78716c', fontSize: 11 }}>
                  {fmtCell(r.totalExpense)}
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 600, color: isDanger ? '#dc2626' : '#111827', fontSize: 11 }}>
                  {fmtCell(r.totalAssets)}
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'center', fontSize: 12 }}>
                  {eventsByAge[r.age] || ''}{isRetire ? '🎊' : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, textAlign: 'right', paddingRight: 4 }}>
        万円単位
      </div>
    </div>
  );
};

// ── メインコンポーネント ───────────────────────────────────────
export const FinanceChart = ({ rows, rowsNoPension, profile, minAssetInfo, pensionInfo }) => {
  const [tab, setTab]               = React.useState('assets');
  const [showPension, setShowPension] = React.useState(true);

  if (!rows || rows.length === 0) return null;

  // 表示するrows（年金あり/なし切替）
  const displayRows = (tab === 'assets' && !showPension && rowsNoPension)
    ? rowsNoPension
    : rows;

  const ageMin      = rows[0].age;
  const ageMax      = rows[rows.length - 1].age;
  const retireAge   = profile?.retirementAge ?? 65;
  const pensionAge  = pensionInfo?.startAge  ?? 65;
  const minAssetAge = showPension ? (minAssetInfo?.age ?? null) : null;

  const events = React.useMemo(() => buildEvents(profile), [profile]);
  const eventsByAge = React.useMemo(() => {
    const m = {};
    events.forEach(e => { m[e.age] = e.icon; });
    return m;
  }, [events]);

  const getData = (t) => {
    if (t === 'assets')  return displayRows.map(r => ({ age: r.age, value: r.totalAssets  }));
    if (t === 'income')  return rows.map(r => ({ age: r.age, value: r.totalIncome  }));
    if (t === 'expense') return rows.map(r => ({ age: r.age, value: r.totalExpense }));
    return null;
  };

  // 年金による退職後資産差分（最終年）
  const pensionImpact = React.useMemo(() => {
    if (!rowsNoPension || !rows || rows.length === 0) return null;
    const lastWith    = rows[rows.length - 1]?.totalAssets ?? 0;
    const lastWithout = rowsNoPension[rowsNoPension.length - 1]?.totalAssets ?? 0;
    return Math.round(lastWith - lastWithout);
  }, [rows, rowsNoPension]);

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif' }}>

      {/* タブバー */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 10, background: '#f1f5f9', borderRadius: 10, padding: 3 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '6px 2px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background:  tab === t.id ? '#ffffff' : 'transparent',
            color:       tab === t.id ? '#111827' : '#6b7280',
            fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
            boxShadow:   tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.12s',
          }}>{t.label}</button>
        ))}
      </div>

      {tab !== 'table' ? (
        <div style={{
          background: '#ffffff', borderRadius: 12,
          padding: '8px 2px 2px',
          border: '1px solid #f1f5f9',
        }}>
          <LineChart
            data={getData(tab)}
            ageMin={ageMin} ageMax={ageMax}
            retireAge={retireAge}
            minAssetAge={minAssetAge}
            tabId={tab}
            events={events}
          />

          {/* 凡例 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '4px 8px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#6b7280' }}>
              <div style={{ width: 14, height: 2, background: '#2563eb', borderRadius: 1, opacity: 0.5 }} />
              退職
            </div>
            {tab === 'assets' && showPension && minAssetAge != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#6b7280' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', border: '1.5px solid white', boxShadow: '0 0 0 1px #f59e0b' }} />
                最低資産
              </div>
            )}
            {events.some(e => e.icon.includes('🏠') && e.age >= ageMin && e.age <= ageMax) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#f97316' }}>
                <div style={{ width: 8, height: 8, background: '#f97316', transform: 'rotate(45deg)', opacity: 0.85 }} />
                住宅購入
              </div>
            )}
          </div>

          {/* 年金 あり/なし トグル（資産タブのみ表示） */}
          {tab === 'assets' && rowsNoPension && pensionInfo && (
            <div style={{
              margin: '0 8px 8px',
              padding: '8px 12px',
              background: showPension ? '#f0fdf4' : '#f8fafc',
              borderRadius: 10,
              border: `1px solid ${showPension ? '#bbf7d0' : '#e5e7eb'}`,
              transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: showPension ? '#15803d' : '#6b7280' }}>
                    {showPension ? '✅ 年金収入を含む試算' : '⬜ 年金収入を除いた試算'}
                  </div>
                  {showPension && pensionInfo.totalMonthly > 0 && (
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
                      推定 約{pensionInfo.totalMonthly}万円/月
                      {pensionInfo.spouseAnnual > 0 && `（本人+配偶者）`}
                      · {pensionAge}歳〜
                    </div>
                  )}
                  {!showPension && pensionImpact !== null && pensionImpact > 0 && (
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
                      年金あり比較で約+{pensionImpact.toLocaleString()}万の差
                    </div>
                  )}
                </div>
                {/* トグルスイッチ */}
                <button
                  onClick={() => setShowPension(p => !p)}
                  style={{
                    width: 40, height: 22, borderRadius: 999, border: 'none',
                    background: showPension ? '#16a34a' : '#d1d5db',
                    cursor: 'pointer', position: 'relative', flexShrink: 0,
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3,
                    left: showPension ? 21 : 3,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <TableView
          rows={rows}
          eventsByAge={eventsByAge}
          retireAge={retireAge}
          minAssetAge={minAssetAge}
        />
      )}
    </div>
  );
};
