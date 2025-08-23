# 건설 예산 검증 서비스

AI 기반 건설 프로젝트 예산 검증 웹 애플리케이션입니다. Solar Pro2 모델을 활용하여 자재명을 자동으로 수정하고 검증합니다.

## 🚀 주요 기능

- **Excel 파일 업로드**: 드래그 앤 드롭 또는 파일 선택
- **AI 자동 검증**: Solar Pro2 모델이 자재명을 자동 수정
- **결과 테이블**: 검증 결과를 테이블 형태로 표시
- **파일 다운로드**: Excel, CSV 형식으로 결과 다운로드
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원

## 📁 프로젝트 구조

```
ConstructionBudgetService/
├── index.html          # 메인 페이지
├── upload.html         # 파일 업로드 페이지
├── result.html         # 결과 페이지
├── css/
│   └── style.css      # 커스텀 스타일
├── js/
│   ├── upload.js      # 파일 업로드 처리
│   └── result.js      # 결과 페이지 처리
└── README.md          # 프로젝트 설명
```

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5
- **Icons**: Font Awesome 6
- **Excel Processing**: SheetJS (XLSX)
- **API**: Solar Pro2 (시뮬레이션)

## 📋 사용 방법

### 1. 메인 페이지
- 서비스 소개 및 기능 설명
- "시작하기" 버튼으로 업로드 페이지 이동

### 2. 파일 업로드
- Excel 파일(.xlsx, .xls) 업로드
- 드래그 앤 드롭 또는 파일 선택
- 파일 형식 및 크기 검증 (최대 10MB)

### 3. Excel 파일 형식
필수 컬럼:
- **자재명**: 건설 자재의 이름
- **단가**: 단위당 가격
- **수량**: 필요한 수량

예시:
| 자재명 | 단가 | 수량 |
|--------|------|------|
| 철근   | 5000 | 100  |
| 시멘트 | 30000| 50   |

### 4. 결과 확인
- AI가 수정한 자재명 확인
- 수정 사유 및 통계 정보
- Excel/CSV 파일로 다운로드

## 🚀 실행 방법

### 로컬 실행
1. 프로젝트 폴더로 이동
```bash
cd ConstructionBudgetService
```

2. 웹 서버 실행 (Python)
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

3. 브라우저에서 접속
```
http://localhost:8000
```

### VS Code Live Server
1. VS Code에서 프로젝트 열기
2. `index.html` 파일 우클릭
3. "Open with Live Server" 선택

## 🔧 개발 환경 설정

### 필수 요구사항
- 웹 브라우저 (Chrome, Firefox, Safari, Edge)
- 로컬 웹 서버 (선택사항)

### 권장 개발 도구
- Visual Studio Code
- Live Server 확장
- 브라우저 개발자 도구

## 📊 Solar Pro2 API 연동

현재는 시뮬레이션 모드로 동작합니다. 실제 Solar Pro2 API 연동을 위해서는:

1. API 엔드포인트 설정
2. 인증 정보 추가
3. 요청/응답 형식 맞춤

```javascript
// 실제 API 호출 예시
async function callSolarPro2API(data) {
    const response = await fetch('https://api.solarpro2.com/validate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_API_KEY'
        },
        body: JSON.stringify(data)
    });
    
    return await response.json();
}
```

## 🎨 커스터마이징

### 스타일 수정
`css/style.css` 파일에서 색상, 폰트, 레이아웃을 수정할 수 있습니다.

### 기능 확장
- 새로운 파일 형식 지원
- 추가 검증 규칙
- 데이터베이스 연동
- 사용자 인증

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.

---

**건설 예산 검증 서비스** - AI 기반 건설 프로젝트 예산 검증 솔루션

