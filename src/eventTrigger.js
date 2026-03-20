// src/eventTrigger.js
// 予定年齢トリガー型イベント判定ロジック（仕様⑤）
//
// 設計思想:
//   - イベントは「固定年齢」ではなく「ユーザーが入力した予定年齢」に達したときに発火
//   - 同一イベントは1度しか発火しない（triggeredIds で管理）
//   - 子どもイベントは numChildren / firstChildAge から動的に生成
//   - ランダムイベントは呼び出し側でシード管理（再現性のため）

import { EVENT_DEFS, RANDOM_EVENT_POOL } from './eventData.js';

// ─────────────────────────────────────────────────────────────
// 特定年齢で発火すべきイベントを返す
// ─────────────────────────────────────────────────────────────
/**
 * @param {number}   age          - 現在のシミュレーション年齢
 * @param {object}   profile      - ユーザープロフィール
 * @param {string[]} triggeredIds - 発火済みイベントIDリスト
 * @returns {object[]}            - 発火すべきイベント定義の配列（順序保証）
 */
export const getEventsForAge = (age, profile, triggeredIds = []) => {
  const events = [];

  const tryAdd = (def) => {
    if (def && !triggeredIds.includes(def.id)) {
      events.push(def);
    }
  };

  // ── 住宅購入 ────────────────────────────────────────────────
  if (profile.housingPurchaseAge !== null &&
      profile.housingPurchaseAge !== undefined &&
      age === Number(profile.housingPurchaseAge)) {
    tryAdd(EVENT_DEFS.housing);
  }

  // ── 車購入（買替周期型） ────────────────────────────────────
  // carOwnership=true の場合、carFirstAge + n*carReplaceCycle ごとにイベント発火
  if (profile.carOwnership) {
    const carFirstAge    = Number(profile.carFirstAge ?? 0);
    const carReplaceCycle = Number(profile.carReplaceCycle ?? 7);
    if (carFirstAge > 0 && carReplaceCycle > 0) {
      let buyAge = carFirstAge;
      while (buyAge <= (profile.retirementAge ?? 65)) {
        if (age === buyAge) {
          const nthBuy = Math.round((buyAge - carFirstAge) / carReplaceCycle);
          const eventId = `car_${buyAge}`;
          if (!triggeredIds.includes(eventId)) {
            events.push({
              ...EVENT_DEFS.car,
              id:    eventId,
              title: nthBuy === 0 ? '車の購入タイミングです' : `車の買替タイミングです（${carReplaceCycle}年ごと）`,
            });
          }
        }
        buyAge += carReplaceCycle;
      }
    }
  }

  // ── 転職 ────────────────────────────────────────────────────
  if (profile.jobChangeAge !== null &&
      profile.jobChangeAge !== undefined &&
      age === Number(profile.jobChangeAge)) {
    tryAdd(EVENT_DEFS.jobChange);
  }

  // ── 子ども誕生 + 教育マイルストーン ────────────────────────
  // childAges[i] = 親が何歳のときに第(i+1)子が生まれたか
  // 教育マイルストーン（誕生からの年数）:
  //   +1: 保育園入園, +6: 小学校入学, +12: 中学入学, +15: 高校入学, +18: 大学入学
  const numChildren = Number(profile.numChildren ?? 0);
  const childAgesArr = Array.isArray(profile.childAges)
    ? profile.childAges
    : [profile.firstChildAge ?? null, null, null, null];

  const EDU_MILESTONES = [
    { key: 'nursery',    offset: 1,  defId: 'edu_nursery' },
    { key: 'elementary', offset: 6,  defId: 'edu_elementary' },
    { key: 'junior_high',offset: 12, defId: 'edu_junior_high' },
    { key: 'high_school',offset: 15, defId: 'edu_high_school' },
    { key: 'university', offset: 18, defId: 'edu_university' },
  ];

  if (numChildren > 0) {
    for (let i = 0; i < numChildren; i++) {
      const birthAge = childAgesArr[i];
      if (birthAge === null || birthAge === undefined) continue;
      const bAge = Number(birthAge);

      // 誕生イベント
      const birthEventId = `child_${i}`;
      if (age === bAge && !triggeredIds.includes(birthEventId)) {
        const ordinal = ['第1子', '第2子', '第3子', '第4子'][i] ?? `第${i + 1}子`;
        events.push({
          ...EVENT_DEFS.child_0,
          id:    birthEventId,
          title: `${ordinal}が誕生します`,
        });
      }

      // 教育マイルストーンイベント
      for (const milestone of EDU_MILESTONES) {
        const milestoneAge = bAge + milestone.offset;
        const eventId      = `edu_${i}_${milestone.key}`;

        if (age === milestoneAge && !triggeredIds.includes(eventId)) {
          const ordinal = ['第1子', '第2子', '第3子', '第4子'][i] ?? `第${i + 1}子`;
          const def = EVENT_DEFS[milestone.defId];
          if (def) {
            events.push({
              ...def,
              id:    eventId,
              title: `${ordinal}が${def.baseTitle ?? def.title}`,
            });
          }
        }
      }
    }
  }

  return events;
};

// ─────────────────────────────────────────────────────────────
// ランダムイベントを抽選（シードベース・再現可能）
// ─────────────────────────────────────────────────────────────
/**
 * 簡易シード乱数（LCG）- 同じシードなら毎回同じ結果
 * @param {number} seed
 * @returns {() => number} 0〜1 の乱数を返す関数
 */
const makePRNG = (seed) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
};

/**
 * 特定年齢にランダムイベントが発生するか判定
 * @param {number}   age
 * @param {object}   profile
 * @param {string[]} triggeredIds
 * @returns {object | null} 発生するイベント or null
 */
export const getRandomEventForAge = (age, profile, triggeredIds = []) => {
  // シード = currentAge(開始時) × age の組み合わせ → 再現性
  const seed = (profile.currentAge ?? 30) * 10000 + age;
  const rand = makePRNG(seed);

  for (const { eventId, probability } of RANDOM_EVENT_POOL) {
    if (triggeredIds.includes(eventId)) continue;
    if (rand() < probability) {
      return EVENT_DEFS[eventId] ?? null;
    }
  }
  return null;
};

// ─────────────────────────────────────────────────────────────
// プロフィール全体からイベントタイムラインを構築
// ─────────────────────────────────────────────────────────────
/**
 * シミュレーション開始前に「いつどのイベントが来るか」を俯瞰するためのリスト
 * ランダムイベントは含まない（確定イベントのみ）
 *
 * @param {object} profile
 * @returns {Array<{ age: number, event: object }>}
 */
export const buildEventTimeline = (profile) => {
  const endAge  = profile.retirementAge ?? 65;
  const results = [];

  for (let age = profile.currentAge; age <= endAge; age++) {
    const ageEvents = getEventsForAge(age, profile, []);
    ageEvents.forEach((ev) => results.push({ age, event: ev }));
  }

  return results;
};

// ─────────────────────────────────────────────────────────────
// 次のイベントを取得（SimulationScreen で「次のイベント」表示に使用）
// ─────────────────────────────────────────────────────────────
/**
 * @param {number}   currentAge
 * @param {object}   profile
 * @param {string[]} triggeredIds
 * @returns {{ age: number, event: object } | null}
 */
export const getNextEvent = (currentAge, profile, triggeredIds = []) => {
  const endAge = profile.retirementAge ?? 65;

  for (let age = currentAge; age <= endAge; age++) {
    const events = getEventsForAge(age, profile, triggeredIds);
    if (events.length > 0) {
      return { age, event: events[0] };
    }
  }

  return null;  // 確定イベントなし → シミュレーション終了可能
};

// ─────────────────────────────────────────────────────────────
// イベントを処理して次の状態を返すヘルパー
// ─────────────────────────────────────────────────────────────
/**
 * SimulationScreen の選択処理に使用
 *
 * @param {object} state    - 現在のシミュレーション状態
 * @param {object} event    - 処理対象のイベント定義
 * @param {object} choice   - 選ばれた選択肢
 * @param {number} age      - 選択時の年齢
 * @returns {{
 *   triggeredIds: string[],
 *   selectedChoices: object[],
 *   gaugeLog: { age, delta, from, to }
 * }}
 */
export const processEventChoice = (state, event, choice, age) => {
  const triggeredIds = [...state.triggeredIds, event.id];

  const selectedChoices = [
    ...state.selectedChoices,
    {
      eventId:    event.id,
      choiceId:   choice.id,
      label:      choice.label,
      gaugeDelta: choice.gaugeDelta,
      age,
    },
  ];

  return { triggeredIds, selectedChoices };
};
