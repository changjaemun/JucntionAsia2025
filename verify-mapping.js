// verify-mapping.js
// 목적: estimate.xlsx / standard.xlsx를 자동 점검하여
//  - 헤더 기반 매핑 추론
//  - 핵심 필드 채움 비율(빈칸율)
//  - 문제 요약 및 개선 가이드
//  - 필요시 샘플 문제 행 출력
//
// 실행 예:
//   node verify-mapping.js --samples 10
//   ESTIMATE=./estimate.xlsx STANDARD=./standard.xlsx node verify-mapping.js

const path = require('path');
const fs = require('fs');
const readXlsxFile = require('read-excel-file/node');

// ---------- 설정 ----------
const ESTIMATE_XLSX = process.env.ESTIMATE || path.resolve('./estimate.xlsx');
const STANDARD_XLSX = process.env.STANDARD || path.resolve('./standard.xlsx');
const SAMPLES = Number((process.argv.find(a => a.startsWith('--samples=')) || '').split('=')[1] || (process.argv.includes('--samples') ? 10 : 0));
const WARN_THRESH = { // 경고 임계치(빈칸 비율)
  estimate: { name: 0.2, spec: 0.4, unit: 0.2, ext_price: 0.05 },
  standard: { std_code: 0.05, std_name: 0.1, std_spec: 0.15, unit: 0.1, std_price: 0.05 }
};

// ---------- 후보 키워드 ----------
const estimateTargets = {
  name: ["name","품목명","품 명","자재명","항목","item","name","품명", "픔명"],
  spec: ["spec","규격","규 격","사양","규격명","규격/사양","규격(사양)"],
  unit: ["unit","단위","uom","단위명"],
  ext_price: ["ext_price","재료비단가(원)","재료비단가","재료비 단가","재료비(단가)","재료비","재료단가","자재단가"]
};
const standardTargets = {
  std_code: ["std_code","표준공사코드","공사코드","세부공종코드","코드","code"],
  std_name: [
    "std_name","표준품목명","표준 품목명","표준자재명",
    "세부공종명","공종명","세부공정명","품목명","품명","자재명","항목명","name", "픔명"
  ],
  std_spec: ["std_spec","규격","규 격","규격명","사양","규격/사양","규격(사양)","spec"],
  unit: ["unit","단위","uom","단위명"],
  std_price: ["std_price","표준시장단가(재료비)","표준시장단가-재료비","재료비","표준단가(재료비)","price"],
  version: ["version","버전","적용버전","기준(버전)","ver"]
};

// ---------- 유틸 ----------
async function readAsRows(xlsxPath) {
  const rows = await readXlsxFile(xlsxPath);
  const headers = rows[0]?.map(h => String(h||'').trim()) || [];
  const objRows = rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h,i)=>o[h] = r[i]);
    return o;
  });
  return { headers, rows: objRows };
}

function inferMapping(headers, targets) {
  const cols = headers;
  const lower = Object.fromEntries(cols.map(c => [c.toLowerCase(), c]));
  const used = new Set();
  const mapping = {};
  for (const [to, cands] of Object.entries(targets)) {
    let found = null;
    // exact
    for (const cand of cands) if (cols.includes(cand) && !used.has(cand)) { found = cand; break; }
    // ci
    if (!found) for (const cand of cands) { const k = lower[cand.toLowerCase()]; if (k && !used.has(k)) { found = k; break; } }
    // substring
    if (!found) {
      for (const col of cols) {
        const low = col.toLowerCase();
        if (cands.some(c => low.includes(c.toLowerCase())) && !used.has(col)) { found = col; break;}
      }
    }
    if (found) { mapping[to] = found; used.add(found); }
  }
  return mapping;
}

function numClean(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).replace(/[, ]/g,'');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function normalizeEstimate(rows, map) {
  const out = rows.map(r => ({
    name: r[map.name],
    spec: r[map.spec],
    unit: r[map.unit],
    ext_price: numClean(r[map.ext_price])
  })).filter(r => (r.name || r.spec) && r.ext_price > 0);
  return out;
}

function normalizeStandard(rows, map) {
  const out = rows.map(r => ({
    std_code: r[map.std_code],
    std_name: r[map.std_name],
    std_spec: r[map.std_spec],
    unit: r[map.unit],
    std_price: numClean(r[map.std_price]),
    version: map.version ? r[map.version] : ''
  })).filter(r => r.std_code && (r.std_name || r.std_spec)); // 최소 기준
  return out;
}

function blankRatio(arr, key) {
  const total = arr.length;
  if (!total) return 1;
  const blank = arr.filter(x => {
    const v = x[key];
    return v === null || v === undefined || String(v).trim() === '';
  }).length;
  return blank / total;
}

function printSection(title) {
  console.log('\n' + '='.repeat(12));
  console.log(title);
  console.log('='.repeat(12));
}

function printTable(obj, label) {
  console.log(`\n[${label}]`);
  const keys = Object.keys(obj);
  if (!keys.length) return console.log('(empty)');
  const width = Math.max(...keys.map(k=>k.length), 10);
  keys.forEach(k => console.log(`${k.padEnd(width)} : ${JSON.stringify(obj[k])}`));
}

// ---------- 메인 ----------
(async () => {
  if (!fs.existsSync(ESTIMATE_XLSX)) { console.error('파일 없음:', ESTIMATE_XLSX); process.exit(2); }
  if (!fs.existsSync(STANDARD_XLSX)) { console.error('파일 없음:', STANDARD_XLSX); process.exit(2); }

  const [est, std] = await Promise.all([readAsRows(ESTIMATE_XLSX), readAsRows(STANDARD_XLSX)]);

  printSection('Headers');
  console.log('estimate headers:', est.headers);
  console.log('standard headers:', std.headers);

  const estMap = inferMapping(est.headers, estimateTargets);
  const stdMap = inferMapping(std.headers, standardTargets);

  printTable(estMap, 'inferred mapping: estimate');
  printTable(stdMap, 'inferred mapping: standard');

  // std_name 슈퍼 폴백
  if (!stdMap.std_name) {
    const nameHeader = std.headers.find(h => /세부.?공종.?명|공종.?명|표준.?품목.?명|품.?목.?명|자재.?명|항.?목.?명|name/i.test(h));
    if (nameHeader) {
      stdMap.std_name = nameHeader;
      console.warn(`[fallback] std_name → "${nameHeader}"`);
    }
  }

  // 필수 매핑 검증
  const estRequired = ['name','spec','unit','ext_price'];
  const stdRequired = ['std_code','std_spec','unit','std_price']; // std_name은 폴백 허용(없으면 spec만으로 매칭 시도)
  const missEst = estRequired.filter(k => !estMap[k]);
  const missStd = stdRequired.filter(k => !stdMap[k]);

  if (missEst.length || missStd.length) {
    printSection('Mapping Errors');
    if (missEst.length) console.error('estimate 매핑 누락:', missEst);
    if (missStd.length) console.error('standard 매핑 누락:', missStd);
    process.exit(3);
  }

  // 정규화
  const estNorm = normalizeEstimate(est.rows, estMap);
  const stdNorm = normalizeStandard(std.rows, stdMap);

  printSection('Basic Stats');
  console.log(`estimate rows (raw / normalized>0원): ${est.rows.length} / ${estNorm.length}`);
  console.log(`standard rows (raw / normalized):     ${std.rows.length} / ${stdNorm.length}`);

  // 필드별 빈칸율
  const estBlank = {
    name: blankRatio(estNorm, 'name'),
    spec: blankRatio(estNorm, 'spec'),
    unit: blankRatio(estNorm, 'unit'),
    ext_price: blankRatio(estNorm, 'ext_price') // 숫자 0만 제거했으므로 여긴 보통 0
  };
  const stdBlank = {
    std_code: blankRatio(stdNorm, 'std_code'),
    std_name: blankRatio(stdNorm, 'std_name'),
    std_spec: blankRatio(stdNorm, 'std_spec'),
    unit: blankRatio(stdNorm, 'unit'),
    std_price: blankRatio(stdNorm, 'std_price')
  };

  printTable(estBlank, 'blank ratio: estimate (0~1)');
  printTable(stdBlank, 'blank ratio: standard (0~1)');

  // 경고/에러 판단
  const warns = [];
  for (const [k, thr] of Object.entries(WARN_THRESH.estimate)) {
    if (estBlank[k] > thr) warns.push(`estimate.${k} 빈칸율 ${estBlank[k].toFixed(3)} > ${thr} (매칭 실패 위험)`);
  }
  for (const [k, thr] of Object.entries(WARN_THRESH.standard)) {
    if (stdBlank[k] > thr) warns.push(`standard.${k} 빈칸율 ${stdBlank[k].toFixed(3)} > ${thr} (매칭 근거 부족)`);
  }

  if (warns.length) {
    printSection('Warnings');
    warns.forEach(w => console.warn('⚠️', w));
  }

  // 샘플 문제 행 출력
  if (SAMPLES > 0) {
    const take = (arr, key) => arr.filter(r => !r[key] || String(r[key]).trim()==='').slice(0, SAMPLES);

    const estEmptySpec = take(estNorm, 'spec');
    const stdEmptyName = take(stdNorm, 'std_name');
    const stdEmptySpec = take(stdNorm, 'std_spec');

    printSection(`Samples (first ${SAMPLES})`);
    console.log(`→ estimate: spec empty (${estEmptySpec.length})`);
    if (estEmptySpec.length) console.log(JSON.stringify(estEmptySpec, null, 2));

    console.log(`→ standard: std_name empty (${stdEmptyName.length})`);
    if (stdEmptyName.length) console.log(JSON.stringify(stdEmptyName, null, 2));

    console.log(`→ standard: std_spec empty (${stdEmptySpec.length})`);
    if (stdEmptySpec.length) console.log(JSON.stringify(stdEmptySpec, null, 2));
  }

  // 개선 가이드
  printSection('Recommendations');
  const recs = [];
  if (estBlank.spec > WARN_THRESH.estimate.spec) recs.push('- estimate 규격(spec) 채움률을 높이세요. 규격이 비면 품명만으로는 매칭이 모호합니다.');
  if (stdBlank.std_name > WARN_THRESH.standard.std_name) recs.push('- standard 품명(std_name) 열명을 "세부공종명/품명/표준품목명" 등으로 통일하거나 매핑 후보에 해당 열을 추가하세요.');
  if (stdBlank.std_spec > WARN_THRESH.standard.std_spec) recs.push('- standard 규격(std_spec) 공백 비율이 높습니다. 규격 표기를 보강하세요.');
  if (recs.length === 0) recs.push('- 매핑 및 데이터 품질 양호. 다음 단계(LLM 매칭)로 진행해도 됩니다.');
  console.log(recs.join('\n'));

  // 종료 코드: 경고 있으면 0, 매핑 실패면 3로 이미 종료, 정상은 0
  process.exit(0);
})().catch(err => {
  console.error('진단 실패:', err);
  process.exit(1);
});
