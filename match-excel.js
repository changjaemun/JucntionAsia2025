// match-excel.js — per-item matching (global standard search)
// 실행: node match-excel.js
// 환경변수(옵션):
//   UPSTAGE_API_KEY=... MAX_STD_PER_ITEM=600 CHUNK_EST=10 STD_NAME_HEADER=픔명

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const readXlsxFile = require('read-excel-file/node');

// =========================
// 설정
// =========================
const BASE_URL = 'https://api.upstage.ai/v1/chat/completions';
const MODEL = 'solar-pro2';

const ESTIMATE_XLSX = path.resolve('./estimate.xlsx');
const STANDARD_XLSX = path.resolve('./standard.xlsx');

const CHUNK_EST = Number(process.env.CHUNK_EST || 5);          // API 호출 시 estimate 품목을 몇 개씩 묶어 보낼지 (표준은 per-item 후보)
const MAX_STD_PER_ITEM = Number(process.env.MAX_STD_PER_ITEM || 120); // 각 품목당 표준 후보 상한
const MIN_STD_PER_ITEM = 80;                                    // 너무 적으면 보완
const MAX_RETRIES = 4;
const RETRY_BASE_MS = 1000;

// =========================
// 프롬프트 (원문 절대 수정 금지)
// =========================
const BASE_PROMPT =
`너는 건설공사 적산 전문가이자 데이터 매칭 엔진이다.

- 목표:
    - 예상견적안 파일의 각 품목명을 표준공사코드 파일의 표준품목명과 규격에 매칭한다.
    - 매칭된 경우 예상견적안의 "재료비"와 표준공사코드의 "표준시장단가(재료비)"를 비교한다.
    - 본 모델은 재료비만 다룬다. 따라서 재료비가 0원인 품목은 출력에서 제외한다.

<입력데이터 설명>

1. 예상견적안 엑셀파일
- 주요 컬럼:
    - 품목명: 외주에서 작성한 자재 명칭 (표기가 표준 엑셀파일의 표준품목명과 다를 수 있음. 예: 기둥밑 무수축 고름모르터, 기둥밑 무수축고름 모르타르 바름)
    - 규격: 자재 규격 (표기가 표준 엑셀파일의 규격과 다를 수 있음. 예: 700x700, 700각)
    - 단위: 수량 단위 (예: EA, ㎥, ㎡ 등)
    - 수량: 수량 값
    - 재료비/노무비/경비/합계별 단가(원)와 금액(원)
    - 비고: 작성자가 참고용으로 기재한 설명
2. 표준 엑셀파일
- 주요 컬럼:
    - 표준공사코드: 국가 표준 공사 코드
    - 표준품목명: 표준화된 공식 자재명칭
    - 규격: 공식 규격
    - 단위: 표준 단위
    - 표준시장단가: 해당 자재의 최신 표준시장단가 - 재료비, 노무비, 경비, 합계
    - 버전: 적용 기준
    - 공사구분: 공종 대분류(예: 토목공사, 건축공사 등)

<매칭 의사결정>

1. 품목명 의미가 같으면 표기가 달라도 동일하게 취급한다.
(예: "흰 벽돌", "하얀 벽돌", "백색벽돌"은 동일 품목으로 본다. “기둥밑 무수축 고름모르터”, “기둥밑 무수축고름 모르타르 바름”은 동일 품목으로 본다.)
2. 규격·단위가 일치하면 매칭 점수를 높이고, 불일치하면 감점하며 사유를 기록한다. 이때 1번과 마찬가지로 규격·단위의 의미가 같으면 표기가 달라도 동일하게 취급한다.
(예: “700x700”, “700각”은 맥락에 따라 동일한 규격으로 볼 수 있다. M3=m3=㎥, M2=m2=㎡, x=×=X=* 등도 동일하게 본다.)
3. 매칭 점수(match_score)는 0~1 사이 확률 값으로 산출한다.
    - 확정: Top-1 후보 점수 ≥ τ_high (=0.85) AND (Top-1 – Top-2) ≥ Δτ (=0.05)
    - 모호: 후보는 있으나 (Top-1 점수 < τ_high OR Top-1 – Top-2 < Δτ)
    - 없음: Top-1 후보 점수 < τ_low (=0.55) OR 후보가 전혀 없음
4. 출력은 반드시 JSON 배열로 한다.
5. 각 품목별로 반드시 다음 필드를 출력한다:
    - input_item: 입력 품목명, 규격, 단위, 외주 재료비
    - decision: 확정 / 모호 / 없음
    - match: 확정된 경우 매칭된 공사구분(std_division), 표준공사코드, 표준품목명, 표준규격, 단위, 표준시장단가(재료비), match_score, 사유
    - candidates: 모호인 경우 Top-3 후보 목록(공사구분, 코드, 품명, 규격, 단위, 표준단가, 점수, 사유)
    - comparison: 외주 재료비 vs 표준 재료비 차이(금액, %) — 확정일 때만
    - note: 없음/모호 사유

<출력>

예상견적안의 각 품목을 표준 DB와 매칭하여 아래 조건에 맞게 JSON으로 출력하라.

예시 입력 품목:

- 품목명: 흰 벽돌
- 규격: 190x90x57
- 단위: EA
- 재료비단가: 350

표준 DB 일부:

- 공사구분: 건축공사, 표준공사코드: M1001, 표준품목명: 백색벽돌 190x90x57, 단위: EA, 표준시장단가(재료비): 360, 버전: 2025H1
- 공사구분: 건축공사, 표준공사코드: M1002, 표준품목명: 적색벽돌 190x90x57, 단위: EA, 표준시장단가(재료비): 340, 버전: 2025H1

출력은 반드시 JSON 배열로 하며, 각 항목에 대해 input_item, decision, match 또는 candidates, comparison, note를 포함해야 한다.

출력 예시:

\`\`\`json
[
  {
    "input_item": {
      "name": "흰 벽돌",
      "spec": "190x90x57",
      "unit": "EA",
      "ext_price": 350
    },
    "decision": "확정",
    "match": {
      "std_division": "건축공사",
      "std_code": "M1001",
      "std_name": "백색벽돌 190x90x57",
      "std_spec": "190x90x57",
      "unit": "EA",
      "std_price": 360,
      "match_score": 0.93,
      "reason": "흰=백색 동의어, 규격·단위 일치"
    },
    "comparison": {
      "gap": -10,
      "gap_ratio": -0.028
    },
    "note": ""
  }
]
\`\`\``;

// =========================
// 엑셀 → 객체 배열
// =========================
async function readAsObjects(xlsxPath) {
  const rows = await readXlsxFile(xlsxPath);
  if (!rows.length) return [];
  const headers = rows[0].map(h => String(h || '').trim());
  return rows.slice(1).map(r => {
    const o = {};
    r.forEach((cell, i) => { o[headers[i]] = cell; });
    return o;
  });
}

// =========================
// 헤더 자동 매핑 + std_name 폴백/ENV
// =========================
const estimateTargets = {
  name: ["name","품목명","품 명","자재명","항목","Item","item","Name","품명","픔명"],
  spec: ["spec","규격","규 격","사양","규격명","Spec","규격/사양","규격(사양)"],
  unit: ["unit","단위","UOM","Unit","단위(개)","단위명"],
  ext_price: ["ext_price","재료비단가(원)","재료비단가","재료비 단가","재료비(단가)","재료비","재료단가","자재단가"]
};

const standardTargets = {
  std_code: [
    "std_code","표준공사코드","공사코드","세부공종코드","세부 공종 코드",
    "표준 코드","코드","STD_CODE","CODE"
  ],
  std_name: [
    "std_name","표준품목명","표준 품목명","표준자재명",
    "세부공종명","세부 공종명","공종명","세부공정명",
    "품목명","품명","품 목 명","자재명","항목명","항 목 명","항목",
    "STD_NAME","NAME","픔명"
  ],
  std_spec: ["std_spec","규격","규 격","규격명","사양","규격/사양","규격(사양)","SPEC"],
  unit: ["unit","단위","UOM","Unit","단위명","U/M","UNITS"],
  std_price: ["std_price","표준시장단가(재료비)","표준시장단가( 재료비 )","표준시장단가-재료비","재료비","STD_PRICE","표준단가(재료비)","표준단가_재료비"],
  version: ["version","버전","Version","적용버전","기준(버전)","ver","VER"],
  std_division: [
    "공사구분", "공종구분", "대공종", "대분류", "공사 분류",
    "Division", "division", "공사구분(대)", "공사구분(중)", "공사구분(소)"
  ]
};

function inferMappingFromRows(rows, candidates) {
  if (!rows.length) return {};
  const columns = Object.keys(rows[0]);
  const colsLower = Object.fromEntries(columns.map(c => [c.toLowerCase(), c]));
  const used = new Set();
  const mapping = {};
  for (const [target, candList] of Object.entries(candidates)) {
    let found = null;
    for (const cand of candList) if (columns.includes(cand) && !used.has(cand)) { found = cand; break; }
    if (!found) for (const cand of candList) { const low = cand.toLowerCase(); if (colsLower[low] && !used.has(colsLower[low])) { found = colsLower[low]; break; } }
    if (!found) {
      for (const col of columns) {
        const lowcol = col.toLowerCase();
        if (candList.some(c=>lowcol.includes(c.toLowerCase())) && !used.has(col)) { found = col; break; }
      }
    }
    if (found) { mapping[target] = found; used.add(found); }
  }
  return mapping;
}

function superFallbackStdName(stdObjs, stdMap) {
  if (!stdObjs.length) return;
  const forced = process.env.STD_NAME_HEADER || process.env.EST_STD_NAME;
  if (forced && Object.keys(stdObjs[0]).includes(forced)) {
    stdMap.std_name = forced;
    console.warn(`[env] std_name을 "${forced}"로 강제 매핑합니다.`);
    return;
  }
  if (stdMap.std_name) return;

  const headers = Object.keys(stdObjs[0] || {});
  const nameRegex = /세부.?공종.?명|공종.?명|표준.?품목.?명|품.?목.?명|자재.?명|항.?목.?명|name|픔명/i;
  let guess = headers.find(h => nameRegex.test(h));

  if (!guess) {
    const isNumericLike = v => {
      if (v === null || v === undefined) return false;
      const s = String(v).replace(/[,\s]/g,'');
      return /^[-+]?\d+(\.\d+)?$/.test(s);
    };
    let best = { h: null, score: -1 };
    const used = new Set([stdMap.std_code, stdMap.std_spec, stdMap.unit, stdMap.std_price].filter(Boolean));
    for (const h of headers) {
      if (used.has(h)) continue;
      const values = stdObjs.map(r => r[h]).slice(0, 200);
      const nonEmpty = values.filter(v => v !== undefined && v !== null && String(v).trim() !== '');
      if (nonEmpty.length < Math.max(10, Math.min(20, values.length * 0.3))) continue;

      const textVals = nonEmpty.filter(v => !isNumericLike(v));
      const uniqueCount = new Set(textVals.map(v => String(v))).size;
      const avgLen = textVals.length ? textVals.reduce((a,v)=>a+String(v).length,0)/textVals.length : 0;
      const nameHint = /벽돌|모르타|콘크리트|강재|철근|타일|보드|도장|방수|배관|전선|케이블|창호|유리|합판|목재|석재|레미콘|몰탈|몰타르|모르타르|바름|도어|창|패널|자재|품|명|재/i
        .test(textVals.slice(0, 50).join(' '));
      const score = (textVals.length / nonEmpty.length) * 3 + uniqueCount * 0.01 + avgLen * 0.02 + (nameHint ? 1 : 0);
      if (score > best.score) best = { h, score };
    }
    if (best.h) guess = best.h;
  }
  if (guess) {
    stdMap.std_name = guess;
    console.warn(`[fallback] std_name을 "${guess}" 컬럼으로 매핑합니다.`);
  } else {
    console.error('standard 헤더 목록:', headers);
  }
}

// =========================
// 정규화
// =========================
function numClean(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).replace(/[, ]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function normalizeEstimate(objs, map) {
  return objs.map(o => ({
    name: o[map.name],
    spec: o[map.spec],
    unit: o[map.unit],
    ext_price: numClean(o[map.ext_price])
  })).filter(r => (r.name || r.spec) && r.ext_price > 0);
}
function normalizeStandard(objs, map) {
  return objs.map(o => ({
    std_code: o[map.std_code],
    std_name: o[map.std_name],
    std_spec: o[map.std_spec],
    unit: o[map.unit],
    std_price: numClean(o[map.std_price]),
    version: map.version ? o[map.version] : '',
    std_division: map.std_division ? o[map.std_division] : ''
  })).filter(r => r.std_code && r.std_name);
}

// =========================
// 토큰/동의어/역색인
// =========================
function norm(s){
  return String(s||'').toLowerCase()
    .replace(/\s+/g,'')
    .replace(/[×x*]/g,'x')
    .replace(/㎥/g,'m3')
    .replace(/㎡/g,'m2')
    .replace(/[^\p{L}\p{N}x]/gu,'');
}
function tokens(s){
  return norm(s).split(/[^a-z0-9가-힣x]+/).filter(t => t && t.length >= 1);
}
const KEY_EXPAND = new Map([
  ['비계', ['비계','시스템비계','강관비계']],
  ['페인트', ['페인트','도장','불소수지','녹막이']],
  ['난간', ['난간','난간대','스틸난간','가드레일']],
  ['모르타르', ['모르타르','몰타르','고름모르터','무수축몰탈','무수축모르타']],
  ['내화', ['내화','내화피복','뿜칠','내화뿜칠']],
  ['크레인', ['크레인','트럭크레인','트럭탑재형크레인']],
  ['보양', ['보양','바탕보호']],
]);
function expandKeywords(rawTokens){
  const set = new Set(rawTokens);
  for (const t of rawTokens){
    for (const [k, arr] of KEY_EXPAND){
      if (t.includes(k) || k.includes(t)) arr.forEach(v=>set.add(v));
    }
  }
  return Array.from(set);
}

function buildStdIndex(stdAll){
  const idx = new Map(); // token -> Set(rowIndex)
  stdAll.forEach((r, i) => {
    const toks = new Set([...tokens(r.std_name), ...tokens(r.std_spec)]);
    toks.forEach(t => {
      if (!idx.has(t)) idx.set(t, new Set());
      idx.get(t).add(i);
    });
  });
  return { idx };
}
function searchStdByTokens(stdAll, stdIndex, qTokens){
  const { idx } = stdIndex;
  const hitSet = new Set();
  qTokens.forEach(t => { if (idx.has(t)) idx.get(t).forEach(i => hitSet.add(i)); });
  return Array.from(hitSet).map(i => stdAll[i]);
}

// =========================
// API 호출 & JSON 추출
// =========================
async function callSolar(userContent){
  let lastErr;
  for (let i=0;i<=MAX_RETRIES;i++){
    try{
      const res = await axios.post(
        BASE_URL,
        { model: MODEL, messages: [{ role: 'user', content: userContent }], temperature: 0.2 },
        { headers: { 'Authorization': `Bearer ${process.env.UPSTAGE_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 60000 }
      );
      return (res.data && res.data.choices && res.data.choices[0].message.content) || '';
    }catch(err){
      lastErr = err;
      const status = err?.response?.status;
      const wait = RETRY_BASE_MS * Math.pow(2, i);
      if (status === 429 || (status >= 500 && status < 600)) {
        console.warn(`재시도 ${i+1}/${MAX_RETRIES}… ${wait}ms 대기 (status=${status})`);
        await new Promise(r=>setTimeout(r, wait));
        continue;
      }
      break;
    }
  }
  throw lastErr || new Error('API 호출 실패');
}
function extractJSONArray(text){
  try { return JSON.parse(text); } catch {}
  const s = text.indexOf('['), e = text.lastIndexOf(']');
  if (s>=0 && e>s) {
    const slice = text.slice(s, e+1);
    try { return JSON.parse(slice); } catch {}
  }
  throw new Error('응답 JSON 파싱 실패');
}

// =========================
// 메인 (per-item 후보 생성)
// =========================
(async () => {
  if (!fs.existsSync(ESTIMATE_XLSX)) throw new Error(`파일 없음: ${ESTIMATE_XLSX}`);
  if (!fs.existsSync(STANDARD_XLSX)) throw new Error(`파일 없음: ${STANDARD_XLSX}`);

  const [estObjs, stdObjs] = await Promise.all([readAsObjects(ESTIMATE_XLSX), readAsObjects(STANDARD_XLSX)]);
  if (!estObjs.length) throw new Error('estimate.xlsx: 데이터가 비어 있습니다.');
  if (!stdObjs.length) throw new Error('standard.xlsx: 데이터가 비어 있습니다.');

  const estMap = inferMappingFromRows(estObjs, estimateTargets);
  const stdMap = inferMappingFromRows(stdObjs, standardTargets);
  superFallbackStdName(stdObjs, stdMap);

  console.log('[Inferred mapping] estimate:', estMap);
  console.log('[Inferred mapping] standard:', stdMap);

  ['name','spec','unit','ext_price'].forEach(k => { if (!estMap[k]) throw new Error(`estimate 매핑 누락: ${k}`); });
  ['std_code','std_name','std_spec','unit','std_price'].forEach(k => { if (!stdMap[k]) throw new Error(`standard 매핑 누락: ${k}`); });

  const estimate = normalizeEstimate(estObjs, estMap);
  const standard = normalizeStandard(stdObjs, stdMap);
  if (!estimate.length) throw new Error('estimate: 재료비>0 조건 후 유효 행 없음');
  if (!standard.length) throw new Error('standard: 유효 항목 없음');

  // 전역 표준 인덱스 (전체 표준 DB 고려)
  const stdIndex = buildStdIndex(standard);
  console.log(`표준 DB 인덱싱 완료: ${standard.length} rows`);

  // 품목별 후보 생성 함수
  function candidatesForItem(item){
    // 1) 쿼리 토큰 생성 + 확장
    let qTokens = [...tokens(item.name), ...tokens(item.spec)].filter(t=>t.length>=2 && !/^\d+$/.test(t));
    qTokens = expandKeywords(qTokens);

    // 2) 역색인 검색
    let cands = searchStdByTokens(standard, stdIndex, qTokens);

    // 3) 단위 일치 우선
    const unit = String(item.unit||'').trim();
    if (unit && cands.length) {
      const filtered = cands.filter(s => String(s.unit||'').trim() === unit);
      if (filtered.length >= MIN_STD_PER_ITEM * 0.6) cands = filtered;
    }

    // 4) 부족/과다 보완: 토큰 점수
    const w = new Map(); qTokens.forEach(t => w.set(t, (w.get(t)||0)+1));
    const scoreOne = (s) => {
      const st = new Set([...tokens(s.std_name), ...tokens(s.std_spec)]);
      let sc = 0;
      st.forEach(t => { if (w.has(t)) sc += w.get(t); });
      if (unit && String(s.unit||'').trim() === unit) sc += 0.5;
      return sc;
    };

    if (cands.length === 0) {
      // 전량에서 점수 계산 후 상위 절단
      const scored = standard.map(s => ({ s, score: scoreOne(s) })).sort((a,b)=>b.score-a.score);
      const nonzero = scored.filter(x => x.score > 0);
      if (nonzero.length >= MIN_STD_PER_ITEM) {
        cands = nonzero.slice(0, MAX_STD_PER_ITEM).map(x=>x.s);
      } else {
        // 편향 방지: 코드 prefix 층화 샘플링
        const byPrefix = new Map();
        for (const x of scored) {
          const code = String(x.s.std_code||'');
          const pref = code.slice(0, Math.min(3, code.length));
          if (!byPrefix.has(pref)) byPrefix.set(pref, []);
          byPrefix.get(pref).push(x.s);
        }
        const perBucket = Math.ceil(MAX_STD_PER_ITEM / Math.max(1, byPrefix.size));
        const stratified = [];
        for (const arr of byPrefix.values()) {
          for (let i=0;i<Math.min(perBucket, arr.length);i++){
            stratified.push(arr[i]);
            if (stratified.length >= MAX_STD_PER_ITEM) break;
          }
          if (stratified.length >= MAX_STD_PER_ITEM) break;
        }
        cands = stratified;
      }
    } else if (cands.length > MAX_STD_PER_ITEM) {
      cands = cands
        .map(s => ({ s, score: scoreOne(s) }))
        .sort((a,b)=>b.score-a.score)
        .slice(0, MAX_STD_PER_ITEM)
        .map(x=>x.s);
    }

    // 디버깅 샘플
    const sample = cands.slice(0,6).map(x => `${x.std_code}:${x.std_name} (${x.unit||''})`);
    console.log(`[cands] "${item.name}" spec="${item.spec}" → ${cands.length}개. sample:`, sample);
    return cands;
  }

  // estimate를 CHUNK_EST개씩 묶되, 각 품목별로 후보는 ‘개별’로 만든 뒤 합쳐 넣기
  const chunks = [];
  for (let i=0;i<estimate.length;i+=CHUNK_EST) chunks.push(estimate.slice(i, i+CHUNK_EST));

  const allResults = [];
  for (let ci=0; ci<chunks.length; ci++){
    const estChunk = chunks[ci];

    // 품목별 후보 생성
    const perItemCandidates = estChunk.map(it => candidatesForItem(it));

    // API 페이로드: estimate_rows는 묶어서, standard_rows는 품목별 후보를 1:1로 전달
    // 모델이 혼동하지 않도록 standard_rows를 {index, candidates[]} 구조로 보냄
    const bundledStd = perItemCandidates.map((list, idx)=>({ index: idx, candidates: list }));

    const userContent =
      BASE_PROMPT +
      '\n\n[estimate_rows]\n' + JSON.stringify(estChunk, null, 2) +
      '\n\n[standard_rows]\n' + JSON.stringify(bundledStd, null, 2);

    console.log(`청크 ${ci+1}/${chunks.length} 호출: estimate ${estChunk.length} / per-item std avg ${(perItemCandidates.reduce((a,c)=>a+c.length,0)/perItemCandidates.length).toFixed(1)}`);

    const raw = await callSolar(userContent);

    let parsed = [];
    try { parsed = extractJSONArray(raw); }
    catch (e) {
      console.warn(`청크 ${ci+1}: JSON 파싱 실패. 원문을 그대로 출력합니다.`);
      console.log(raw);
      continue;
    }
    allResults.push(...parsed);
  }

  console.log('=== FINAL MATCHES(JSON) ===');
  console.log(JSON.stringify(allResults, null, 2));
})().catch(err => {
  console.error('실행 오류:', err?.response?.data || err);
  process.exit(1);
});
