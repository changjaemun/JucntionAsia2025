// 전역 변수
let selectedFile = null;
let standardData = null;

// Solar Pro 2 API 설정
const SOLAR_PRO2_API_KEY = 'up_nwLaix3qQAGCvJXPcqFwABGboTKq2'; // 실제 API 키로 교체 필요
const SOLAR_PRO2_ENDPOINT = 'https://api.upstage.ai/v1/chat/completions';

// 설정
const CHUNK_EST = 5;          // API 호출 시 estimate 품목을 몇 개씩 묶어 보낼지
const MAX_STD_PER_ITEM = 120; // 각 품목당 표준 후보 상한
const MIN_STD_PER_ITEM = 80;  // 너무 적으면 보완
const MAX_RETRIES = 4;
const RETRY_BASE_MS = 1000;

// 프롬프트 (match-excel.js와 동일)
const BASE_PROMPT = `너는 건설공사 적산 전문가이자 데이터 매칭 엔진이다.

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
단, 품목명 의미가 충분히 유사하지 않은 경우에는 규격이 완전히 일치하더라도 높은 점수를 부여하지 않는다.
3. 매칭 점수(match_score)는 0~1 사이 확률 값으로 산출한다.
    - 확정: Top-1 후보 점수 ≥ τ_high (=0.90) AND (Top-1 – Top-2) ≥ Δτ (=0.08)
    - 모호: 후보는 있으나 (Top-1 점수 < τ_high OR Top-1 – Top-2 < Δτ)
    - 없음: Top-1 후보 점수 < τ_low (=0.60) OR 후보가 전혀 없음
4. 출력은 반드시 JSON 배열로 한다.
5. 각 품목별로 반드시 다음 필드를 출력한다:
    - input_item: 입력 품목명, 규격, 단위, 외주 재료비
    - decision: 확정 / 모호 / 없음
    - match: 확정된 경우 매칭된 공사구분(std_division), 표준공사코드, 표준품목명, 표준규격, 단위, 표준시장단가(재료비), match_score, 사유
    - candidates: 모호인 경우 Top-3 후보 목록(공사구분, 코드, 품명, 규격, 단위, 표준단가, 점수, 사유)
    - comparison: 외주 재료비 vs 표준 재료비 차이(금액, %) — 확정일 때만
    - note: 없음/모호 사유

매칭 사유(reason)는 사람이 읽을 수 있는 자연어 설명으로 작성하며, 수식이나 임계값 표기를 그대로 사용하지 않는다.
예: "품명은 의미상 동일(흰=백색), 규격·단위도 정확히 일치" / "품명은 유사하지만 규격 차이가 있어 확정 불가"

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

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    initializeUploadArea();
    initializeFileInput();
    loadStandardData();
});

// 업로드 영역 초기화
function initializeUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    
    // 드래그 앤 드롭 이벤트
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    
    // 클릭 이벤트
    uploadArea.addEventListener('click', function() {
        document.getElementById('fileInput').click();
    });
}

// 파일 입력 초기화
function initializeFileInput() {
    const fileInput = document.getElementById('fileInput');
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

// 파일 선택 처리
function handleFileSelect(file) {
    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showAlert('파일 크기는 10MB 이하여야 합니다.', 'danger');
        return;
    }
    
    selectedFile = file;
    displayFileInfo(file);
    document.getElementById('uploadBtn').style.display = 'inline-block';
}

// 파일 정보 표시
function displayFileInfo(file) {
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.style.display = 'block';
}

// 파일 크기 포맷팅
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 파일 제거
function removeFile() {
    selectedFile = null;
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('uploadBtn').style.display = 'none';
    document.getElementById('fileInput').value = '';
}

// 표준 데이터 로드
async function loadStandardData() {
    try {
        const response = await fetch('standard.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        
        // XLSX 라이브러리로 파싱
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
            throw new Error('표준 데이터가 충분하지 않습니다.');
        }
        
        const headers = jsonData[0].map(h => String(h || '').trim());
        const rows = jsonData.slice(1).map(r => {
            const o = {};
            r.forEach((cell, i) => { o[headers[i]] = cell; });
            return o;
        });
        
        standardData = normalizeStandard(rows);
        console.log('표준 데이터 로드 완료:', standardData.length, '행');
        
    } catch (error) {
        console.error('표준 데이터 로드 실패:', error);
        showAlert('표준 데이터 로드에 실패했습니다.', 'danger');
    }
}

// 헤더 자동 매핑 (match-excel.js와 동일)
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
    std_division: ["std_division","공사구분","공종구분","공종","구분","DIVISION"],
    version: ["version","버전","Version","적용버전","기준(버전)","ver","VER"]
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

// 정규화 (match-excel.js와 동일)
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

function superFallbackStdName(stdObjs, stdMap) {
    if (stdMap.std_name) return stdMap.std_name;
    
    console.warn('표준 품목명 컬럼을 찾지 못해 휴리스틱 분석을 시작합니다...');
    
    const headers = Object.keys(stdObjs[0] || {});
    if (!headers.length) return null;
    
    function isNumericLike(v) {
        if (v === null || v === undefined) return false;
        const s = String(v).replace(/[,\s]/g,'');
        return !isNaN(s) && !isNaN(parseFloat(s));
    }
    
    const used = new Set([stdMap.std_code, stdMap.std_spec, stdMap.unit, stdMap.std_price].filter(Boolean));
    const candidates = [];
    
    for (const h of headers) {
        if (used.has(h)) continue;
        const values = stdObjs.map(r => r[h]).slice(0, 200);
        const nonEmpty = values.filter(v => v !== undefined && v !== null && String(v).trim() !== '');
        if (nonEmpty.length < 10) continue;
        
        const textVals = nonEmpty.filter(v => !isNumericLike(v));
        const uniqueCount = new Set(textVals.map(v => String(v))).size;
        const avgLen = textVals.length ? textVals.reduce((a,v)=>a+String(v).length,0)/textVals.length : 0;
        
        const nameHint = /품목|품명|명칭|name|item/i.test(h);
        const score = (textVals.length / nonEmpty.length) * 3 + uniqueCount * 0.01 + avgLen * 0.02 + (nameHint ? 1 : 0);
        
        candidates.push({ header: h, score, sample: textVals.slice(0,3) });
    }
    
    candidates.sort((a,b) => b.score - a.score);
    if (candidates.length > 0) {
        const best = candidates[0];
        console.log(`휴리스틱으로 선택된 표준 품목명 컬럼: ${best.header} (점수: ${best.score.toFixed(2)})`);
        console.log('샘플:', best.sample);
        return best.header;
    }
    
    return null;
}

function normalizeStandard(objs) {
    const map = inferMappingFromRows(objs, standardTargets);
    
    // 품목명을 찾지 못한 경우 고급 휴리스틱 사용
    if (!map.std_name) {
        map.std_name = superFallbackStdName(objs, map);
    }
    
    return objs.map(o => ({
        std_code: o[map.std_code],
        std_name: o[map.std_name],
        std_spec: o[map.std_spec],
        unit: o[map.unit],
        std_price: numClean(o[map.std_price]),
        std_division: map.std_division ? o[map.std_division] : '',
        version: map.version ? o[map.version] : ''
    })).filter(r => r.std_code && r.std_name);
}

// 토큰/동의어/역색인 (match-excel.js와 동일)
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

// API 호출 & JSON 추출
async function callSolar(userContent){
    // API 키가 설정되지 않은 경우 시뮬레이션 모드
    if (!SOLAR_PRO2_API_KEY || SOLAR_PRO2_API_KEY === 'YOUR_ACTUAL_UPSTAGE_API_KEY_HERE') {
        console.warn('API 키가 설정되지 않음. 시뮬레이션 모드로 실행합니다.');
        return await simulateApiResponse(userContent);
    }
    
    let lastErr;
    for (let i=0;i<=MAX_RETRIES;i++){
        try{
            const res = await fetch(SOLAR_PRO2_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SOLAR_PRO2_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'solar-pro2',
                    messages: [{ role: 'user', content: userContent }],
                    temperature: 0.2,
                    max_tokens: 4000
                })
            });
            
            if (!res.ok) {
                throw new Error(`API 호출 실패: ${res.status}`);
            }
            
            const data = await res.json();
            return (data && data.choices && data.choices[0].message.content) || '';
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

// API 시뮬레이션 함수
async function simulateApiResponse(userContent) {
    // userContent에서 estimate 데이터 추출
    const estimateMatch = userContent.match(/\[estimate_rows\]\s*(\[[\s\S]*?\])/);
    if (!estimateMatch) {
        throw new Error('시뮬레이션: estimate 데이터를 찾을 수 없습니다.');
    }
    
    let estimateData;
    try {
        estimateData = JSON.parse(estimateMatch[1]);
    } catch (e) {
        throw new Error('시뮬레이션: estimate 데이터 파싱 실패');
    }
    
    // 시뮬레이션 결과 생성
    const simulatedResults = estimateData.map((item, index) => {
        const decisions = ['확정', '모호', '없음'];
        const decision = decisions[index % 3];
        
        const result = {
            input_item: {
                name: item.name,
                spec: item.spec,
                unit: item.unit,
                ext_price: item.ext_price
            },
            decision: decision
        };
        
        if (decision === '확정') {
            result.match = {
                std_division: '건축공사',
                std_code: `M${String(1000 + index).padStart(4, '0')}`,
                std_name: `표준${item.name}`,
                std_spec: item.spec,
                unit: item.unit,
                std_price: Math.round(item.ext_price * (0.9 + Math.random() * 0.2)),
                match_score: 0.88 + Math.random() * 0.1,
                reason: '시뮬레이션 매칭'
            };
            result.comparison = {
                gap: result.match.std_price - item.ext_price,
                gap_ratio: (result.match.std_price - item.ext_price) / item.ext_price
            };
            result.note = '';
        } else if (decision === '모호') {
            result.candidates = [
                {
                    std_division: '건축공사',
                    std_code: `M${String(2000 + index).padStart(4, '0')}`,
                    std_name: `후보1_${item.name}`,
                    std_spec: item.spec,
                    unit: item.unit,
                    std_price: Math.round(item.ext_price * 1.1),
                    match_score: 0.75,
                    reason: '유사 품목'
                },
                {
                    std_division: '토목공사',
                    std_code: `M${String(2100 + index).padStart(4, '0')}`,
                    std_name: `후보2_${item.name}`,
                    std_spec: item.spec,
                    unit: item.unit,
                    std_price: Math.round(item.ext_price * 0.9),
                    match_score: 0.70,
                    reason: '규격 차이'
                }
            ];
            result.note = '여러 후보가 존재하여 수동 검토 필요';
        } else {
            result.note = '표준공사코드에서 매칭되는 항목을 찾을 수 없음';
        }
        
        return result;
    });
    
    // 1-2초 대기 (실제 API 호출을 시뮬레이션)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    return JSON.stringify(simulatedResults, null, 2);
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

// 품목별 후보 생성 함수 (match-excel.js와 동일)
function candidatesForItem(item, standard, stdIndex){
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

    return cands;
}

// 파일 처리 (표준공사코드 매칭) - match-excel.js 로직 적용
async function processFile() {
    if (!selectedFile) {
        showAlert('파일을 선택해주세요.', 'warning');
        return;
    }
    
    if (!standardData || standardData.length === 0) {
        showAlert('표준 데이터가 로드되지 않았습니다.', 'danger');
        return;
    }
    
    try {
        // 진행률 표시
        showProgress();
        
        // 파일을 Excel로 읽기
        updateProgress(20, '파일 읽는 중...');
        const estimateData = await readExcelFile(selectedFile);
        
        if (!estimateData || estimateData.length === 0) {
            throw new Error('유효한 데이터가 없습니다.');
        }
        
        // 표준 인덱스 생성
        updateProgress(40, '표준 데이터 인덱싱 중...');
        const stdIndex = buildStdIndex(standardData);
        console.log(`표준 DB 인덱싱 완료: ${standardData.length} rows`);
        
        // 품목별 후보 생성
        updateProgress(60, '매칭 후보 생성 중...');
        const perItemCandidates = estimateData.map(it => candidatesForItem(it, standardData, stdIndex));
        
        // API 호출 (청킹) - match-excel.js와 동일한 방식
        updateProgress(80, 'Solar Pro 2 API 호출 중...');
        
        const allResults = [];
        const chunks = [];
        for (let i=0;i<estimateData.length;i+=CHUNK_EST) chunks.push(estimateData.slice(i, i+CHUNK_EST));
        
        for (let ci=0; ci<chunks.length; ci++){
            const estChunk = chunks[ci];

            // 품목별 후보 생성
            const chunkCandidates = estChunk.map(it => candidatesForItem(it, standardData, stdIndex));

            // API 페이로드: estimate_rows는 묶어서, standard_rows는 품목별 후보를 1:1로 전달
            const bundledStd = chunkCandidates.map((list, idx)=>({ index: idx, candidates: list }));

            const userContent = BASE_PROMPT +
                '\n\n[estimate_rows]\n' + JSON.stringify(estChunk, null, 2) +
                '\n\n[standard_rows]\n' + JSON.stringify(bundledStd, null, 2);

            console.log(`청크 ${ci+1}/${chunks.length} 호출: estimate ${estChunk.length} / per-item std avg ${(chunkCandidates.reduce((a,c)=>a+c.length,0)/chunkCandidates.length).toFixed(1)}`);

            const raw = await callSolar(userContent);

            let parsed = [];
            try { parsed = extractJSONArray(raw); }
            catch (e) {
                console.warn(`청크 ${ci+1}: JSON 파싱 실패. 원문을 그대로 출력합니다.`);
                console.log(raw);
                // 파싱 실패 시 빈 결과 생성
                parsed = estChunk.map(item => ({
                    input_item: {
                        name: item.name,
                        spec: item.spec,
                        unit: item.unit,
                        ext_price: item.ext_price
                    },
                    decision: "없음",
                    note: "API 응답 파싱 실패"
                }));
            }
            allResults.push(...parsed);
            
            // 진행률 업데이트
            const progress = 80 + (10 * (ci + 1) / chunks.length);
            updateProgress(progress, `청크 ${ci + 1}/${chunks.length} 완료`);
        }
        
        // 결과 처리
        updateProgress(90, '결과 처리 중...');
        
        // 결과 저장
        updateProgress(100, '완료');
        localStorage.setItem('fileData', JSON.stringify({
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            fileText: JSON.stringify(estimateData, null, 2)
        }));
        localStorage.setItem('apiResult', JSON.stringify({
            success: true,
            message: 'Solar Pro 2 API 처리 완료 (표준공사코드 매칭)',
            data: allResults,
            originalContent: JSON.stringify(estimateData, null, 2),
            fileName: selectedFile.name
        }));
        
        // 대시보드로 자동 이동
        setTimeout(() => {
            switchTab('dashboard');
        }, 500);
        
    } catch (error) {
        console.error('파일 처리 오류:', error);
        hideProgress();
        showAlert('파일 처리 중 오류가 발생했습니다: ' + error.message, 'danger');
    }
}

// Excel 파일 읽기
async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonData.length < 2) {
                    reject(new Error('Excel 파일에 데이터가 충분하지 않습니다.'));
                    return;
                }
                
                const headers = jsonData[0].map(h => String(h || '').trim());
                console.log('원본 헤더:', headers);
                
                // 빈 헤더 필터링
                const validHeaders = headers.filter((h, i) => h && h.length > 0);
                const validIndices = headers.map((h, i) => h && h.length > 0 ? i : -1).filter(i => i !== -1);
                console.log('유효한 헤더:', validHeaders);
                
                const rows = jsonData.slice(1).map(r => {
                    const o = {};
                    validIndices.forEach((originalIndex, newIndex) => {
                        o[validHeaders[newIndex]] = r[originalIndex];
                    });
                    return o;
                });
                
                const estMap = inferMappingFromRows(rows, estimateTargets);
                console.log('추론된 매핑:', estMap);
                
                // 필수 필드 검증
                ['name','spec','unit','ext_price'].forEach(k => { 
                    if (!estMap[k]) throw new Error(`필수 필드 매핑 누락: ${k} (사용 가능한 컬럼: ${validHeaders.join(', ')})`); 
                });
                
                const estimate = normalizeEstimate(rows, estMap);
                if (!estimate.length) {
                    reject(new Error('재료비가 0원인 품목만 있거나 유효한 데이터가 없습니다.'));
                    return;
                }
                
                resolve(estimate);
                
            } catch (error) {
                reject(new Error('Excel 파일 파싱에 실패했습니다: ' + error.message));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('파일 읽기에 실패했습니다.'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// 진행률 표시
function showProgress() {
    document.getElementById('progressContainer').style.display = 'block';
    document.getElementById('uploadBtn').disabled = true;
}

// 진행률 업데이트
function updateProgress(percent, text) {
    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('progressText').textContent = text;
}

// 진행률 숨기기
function hideProgress() {
    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('uploadBtn').disabled = false;
}

// 알림 표시
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // 5초 후 자동 제거
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}
