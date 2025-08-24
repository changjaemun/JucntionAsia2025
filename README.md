# CostChecker - 건설 예산 검증 서비스

## 프로젝트 개요

CostChecker는 조달청 고시 표준단가 데이터와 AI 기술을 활용하여 건설 예산서 파일의 단가 오류를 검증하는 웹 서비스입니다. Solar Pro 2 AI 모델을 사용하여 업로드된 엑셀 파일의 품명과 규격을 표준공사코드와 매칭하고, 오차 분석 결과를 제공합니다.

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
http://localhost:8000
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
├── index.html              # 메인 HTML 파일
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
├── estimate.xlsx           # 샘플 예산서 파일
├── standard.xlsx           # 표준공사코드 데이터
└── README.md               # 프로젝트 설명서
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

## 샘플 데이터

### 테스트용 엑셀 파일
- `estimate.xlsx`: 샘플 건설 예산서 파일
- `standard.xlsx`: 표준공사코드 데이터베이스

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

## 라이선스

© CostChecker from OMORI BLUE. All rights reserved.

