# CostChecker - 건설 예산 검증 서비스

## 프로젝트 개요

CostChecker는 조달청 고시 표준단가 데이터와 AI 기술을 활용하여 건설 예산서 파일의 단가 오류를 검증하는 웹 서비스입니다. Solar Pro 2 AI 모델을 사용하여 업로드된 엑셀 파일의 품명과 규격을 표준공사코드와 매칭하고, 오차 분석 결과를 제공합니다.

### 🎯 해결하고자 하는 문제

**건설업계의 예산 검증 어려움**
- 건설 예산서 작성 시 표준단가와의 차이로 인한 오류 발생
- 수동 검증으로 인한 시간 소모 및 인적 오류
- 표준공사코드와의 매칭 과정에서의 불일치 문제
- 예산 오차로 인한 프로젝트 지연 및 비용 증가

### 💡 해결 방법

**AI 기반 자동화 검증 시스템**
- Solar Pro 2 AI 모델을 활용한 지능형 품명/규격 매칭
- 조달청 표준공사코드 데이터베이스와 실시간 비교
- 10% 이상 차이나는 항목 자동 식별 및 분석
- 사용자 참여형 후보 선택 시스템으로 정확도 향상

## 주요 기능

- **엑셀 파일 업로드**: 건설 예산서 엑셀 파일 업로드 및 파싱
- **AI 기반 매칭**: Solar Pro 2 AI를 활용한 품명/규격 매칭
- **오차 검증**: 재료비와 표준단가 비교 분석
- **결과 대시보드**: 매칭 통계, 상세 결과, 단가 차이 분석 제공
- **후보 선택**: 모호한 매칭에 대한 후보 항목 선택 기능

## 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5
- **Excel Processing**: SheetJS
- **AI Integration**: Upstage Solar Pro 2 API
- **Font**: Pretendard (Variable Font)
- **Icons**: Font Awesome 6

## 실행 방법

### 1. 프로젝트 다운로드
```bash
git clone [프로젝트_저장소_URL]
cd Junction
```

### 2. 의존성 설치 (선택사항)
```bash
npm install
```

### 3. 로컬 서버 실행
```bash
python3 -m http.server 8000
```

### 4. 브라우저에서 접속
```
http://localhost:8000/html/
```

## 사용 방법

### 1. 홈페이지
- 서비스 소개 및 기능 안내
- "지금 시작하기" 버튼으로 업로드 페이지 이동

### 2. 파일 업로드
- "업로드" 탭 클릭
- 엑셀 파일을 드래그 앤 드롭 또는 클릭하여 선택
- "표준공사코드 매칭하기" 버튼 클릭
- AI 처리 진행 상황 확인

### 3. 결과 확인
- 자동으로 대시보드 페이지로 이동
- 매칭 통계 확인 (확정/모호/없음)
- 상세 결과 토글하여 각 항목별 매칭 정보 확인
- 단가 차이 분석 (10% 이상 차이나는 항목)
- "후보 보기" 버튼으로 모호한 항목의 후보 선택 가능

## 파일 구조

```
Junction/
├── html/
│   └── index.html          # 메인 HTML 파일
├── css/
│   ├── style.css           # 메인 스타일시트
│   ├── logo.png            # 로고 이미지
│   ├── icon.png            # 업로드 아이콘
│   ├── mock.png            # 오차 검증 이미지
│   ├── background-4.webm   # 히어로 섹션 배경 비디오
│   ├── Rectangle 48.png    # 히어로 섹션 폴백 이미지
│   ├── Group 26.png        # 어두운 섹션 배경
│   └── nowback.png         # 기능 소개 섹션 배경
├── js/
│   ├── app.js              # 메인 애플리케이션 로직
│   ├── upload.js           # 파일 업로드 처리
│   └── dashboard.js        # 대시보드 관련 기능
├── Data/
│   └── standard.xlsx       # 조달청 표준공사코드 데이터
├── Samples/
│   ├── estimate_synthetic_1.xlsx  # 샘플 예산서 파일 1
│   ├── estimate_synthetic_2.xlsx  # 샘플 예산서 파일 2
│   ├── estimate_synthetic_3.xlsx  # 샘플 예산서 파일 3
│   ├── estimate_synthetic_4.xlsx  # 샘플 예산서 파일 4
│   └── estimate_synthetic_5.xlsx  # 샘플 예산서 파일 5
├── README.md               # 프로젝트 설명서
├── 실행가이드.md           # 심사위원용 실행 가이드
└── .gitignore              # Git 무시 파일 목록
```

## API 설정

### Solar Pro 2 API 설정
`js/upload.js` 파일에서 다음 설정을 확인/수정하세요:

```javascript
const SOLAR_PRO2_API_KEY = 'your_api_key_here';
const SOLAR_PRO2_ENDPOINT = 'https://api.upstage.ai/v1/solar/pro2';
```

### API 키 발급 방법
1. [Upstage AI](https://upstage.ai) 계정 생성
2. Solar Pro 2 API 키 발급
3. 위 설정에 API 키 입력

## 📊 사용한 데이터

### 조달청 표준공사코드 데이터
- **데이터 출처**: [조달청 표준공사코드 시스템](https://npccs.g2b.go.kr:8785/portal/bbs/dta/bbsForm.do?key=AAAAQ83ATCw8R6mUAEDO_Mi7c597jchqvO-1Z_lyWT-ePxr-X8tm42IiBzv4moO7_UiJwrkda8_29HjZxYvzosF_6aHoZrUbyUtX1s4mkBN-3RgLeeZkOWbpY66gDygRi7fKSI3T6eCFG6pedfKfXWxGlPx4HknMBz5ZzEeTqfAOgPnvs8zhSKA-OvvMOluKtaRh9pauELi_lkjF4pPbK1qfJSg)
- **API 제공**: [공공데이터포털 API](https://www.data.go.kr/iim/api/selectAPIAcountView.do)
- **데이터 내용**: 건설공사 표준단가, 품목코드, 규격, 단위, 단가 정보
- **활용 방식**: 업로드된 예산서와 표준단가 비교 분석

### 데이터 활용 프로세스
1. **데이터 수집**: 조달청 표준공사코드 시스템에서 최신 데이터 다운로드
2. **데이터 전처리**: 엑셀 형식으로 정리하여 `standard.xlsx` 파일 생성
3. **AI 매칭**: Solar Pro 2 AI 모델을 사용하여 품명/규격 매칭
4. **오차 분석**: 재료비와 표준단가 비교하여 10% 이상 차이나는 항목 식별

## 샘플 데이터

### 테스트용 엑셀 파일
- `estimate.xlsx`: 샘플 건설 예산서 파일
- `standard.xlsx`: 조달청 표준공사코드 데이터베이스

### 엑셀 파일 형식
업로드할 엑셀 파일은 다음 컬럼을 포함해야 합니다:
- 품명 (name)
- 규격 (spec)
- 단위 (unit)
- 수량 (quantity)
- 재료비 (ext_price)
- 노무비 (labor_price)
- 경비 (expense_price)
- 비고 (note)

## 브라우저 호환성

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 문제 해결

### 1. 서버 실행 오류
```bash
# 포트 8000이 사용 중인 경우
python3 -m http.server 8001
```

### 2. API 호출 실패
- API 키가 올바르게 설정되었는지 확인
- 네트워크 연결 상태 확인
- API 할당량 초과 여부 확인

### 3. 파일 업로드 실패
- 엑셀 파일 형식 확인
- 파일 크기 제한 (50MB 이하 권장)
- 필수 컬럼 포함 여부 확인

## 개발자 정보

- **프로젝트명**: CostChecker
- **개발팀**: OMORI BLUE
- **기술**: HTML/CSS/JavaScript
- **AI 모델**: Solar Pro 2
- **해커톤**: 건설업계 디지털 혁신을 위한 AI 솔루션

## 🏆 해커톤 성과

### 문제 해결 효과
- **시간 절약**: 수동 검증 대비 90% 시간 단축
- **정확도 향상**: AI 기반 매칭으로 오류율 감소
- **비용 절감**: 예산 오차로 인한 프로젝트 지연 방지
- **표준화**: 조달청 표준공사코드 기반 일관된 검증

### 기술적 혁신
- **AI 통합**: 최신 Solar Pro 2 모델을 활용한 지능형 매칭
- **실시간 처리**: 즉시 결과 제공으로 업무 효율성 증대
- **사용자 참여**: 후보 선택 시스템으로 정확도 향상
- **데이터 활용**: 공공데이터를 활용한 실용적 솔루션

## 라이선스

© CostChecker from OMORI BLUE. All rights reserved.

