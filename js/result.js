// 전역 변수
let resultData = null;
let excelData = null;

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    loadResultData();
});

// 결과 데이터 로드
function loadResultData() {
    try {
        // localStorage에서 데이터 가져오기
        const apiResult = localStorage.getItem('apiResult');
        const fileDataStr = localStorage.getItem('fileData');
        
        if (!apiResult) {
            showNoDataMessage();
            return;
        }
        
        resultData = JSON.parse(apiResult);
        if (fileDataStr) {
            excelData = JSON.parse(fileDataStr);
        }
        
        if (resultData.success) {
            displayResults();
        } else {
            showErrorMessage('데이터 처리에 실패했습니다.');
        }
        
    } catch (error) {
        console.error('데이터 로드 오류:', error);
        showErrorMessage('데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

// 결과 표시
function displayResults() {
    displayStatistics();
    displayTable();
    displayOriginalFile();
    displayCorrectionDetails();
}

// 통계 표시 (새로운 출력 형식용)
function displayStatistics() {
    const data = resultData.data;
    
    // 총 항목 수
    document.getElementById('totalItems').textContent = data.length;
    
    // 확정 항목 수
    const confirmedCount = data.filter(item => item.decision === '확정').length;
    document.getElementById('confirmedItems').textContent = confirmedCount;
    
    // 모호 항목 수
    const ambiguousCount = data.filter(item => item.decision === '모호').length;
    document.getElementById('ambiguousItems').textContent = ambiguousCount;
    
    // 없음 항목 수
    const noMatchCount = data.filter(item => item.decision === '없음').length;
    document.getElementById('noMatchItems').textContent = noMatchCount;
}

// 테이블 표시 (새로운 출력 형식용)
function displayTable() {
    const tableBody = document.getElementById('resultTableBody');
    const data = resultData.data;
    
    tableBody.innerHTML = '';
    
    data.forEach((item, index) => {
        const row = document.createElement('tr');
        
        // 의사결정에 따른 스타일 적용
        let decisionClass = '';
        let decisionBadge = '';
        
        switch(item.decision) {
            case '확정':
                decisionClass = 'table-success';
                decisionBadge = '<span class="badge bg-success">확정</span>';
                break;
            case '모호':
                decisionClass = 'table-warning';
                decisionBadge = '<span class="badge bg-warning text-dark">모호</span>';
                break;
            case '없음':
                decisionClass = 'table-danger';
                decisionBadge = '<span class="badge bg-danger">없음</span>';
                break;
        }
        
        // 표준 코드와 품목명
        const standardCode = item.match ? item.match.std_code : '-';
        const standardName = item.match ? item.match.std_name : '-';
        const standardPrice = item.match ? formatCurrency(item.match.std_price) : '-';
        const matchScore = item.match ? item.match.match_score : '-';
        
        // 차이 계산
        const gap = item.comparison ? item.comparison.gap : '-';
        const gapRatio = item.comparison ? (parseFloat(item.comparison.gap_ratio) * 100).toFixed(1) + '%' : '-';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.input_item.name}</td>
            <td>${item.input_item.spec}</td>
            <td>${item.input_item.unit}</td>
            <td>${formatCurrency(item.input_item.ext_price)}</td>
            <td>${decisionBadge}</td>
            <td>${standardCode}</td>
            <td>${standardName}</td>
            <td>${standardPrice}</td>
            <td>${matchScore}</td>
            <td>${gap !== '-' ? formatCurrency(gap) : '-'}</td>
            <td>${gapRatio}</td>
            <td>
                <small class="text-muted">${item.note || '-'}</small>
            </td>
        `;
        
        row.classList.add(decisionClass);
        tableBody.appendChild(row);
    });
}

// 원본 파일 표시
function displayOriginalFile() {
    if (excelData && excelData.fileText) {
        document.getElementById('originalContent').textContent = excelData.fileText;
    } else {
        document.getElementById('originalContent').textContent = '원본 파일 내용을 불러올 수 없습니다.';
    }
}

// 매칭 상세 표시 (새로운 출력 형식용)
function displayCorrectionDetails() {
    const detailsContainer = document.getElementById('correctionDetails');
    const data = resultData.data;
    
    const confirmedItems = data.filter(item => item.decision === '확정');
    const ambiguousItems = data.filter(item => item.decision === '모호');
    const noMatchItems = data.filter(item => item.decision === '없음');

    let detailsHTML = '';
    
    // 확정된 항목들
    if (confirmedItems.length > 0) {
        detailsHTML += `
            <div class="alert alert-success mb-4">
                <h6><i class="fas fa-check-circle me-2"></i>확정된 항목 (${confirmedItems.length}개)</h6>
                <p class="mb-0">표준공사코드와 성공적으로 매칭된 항목들입니다.</p>
            </div>
        `;
        
        detailsHTML += '<div class="row">';
        confirmedItems.forEach((item, index) => {
            detailsHTML += `
                <div class="col-md-6 mb-3">
                    <div class="card border-success">
                        <div class="card-body">
                            <h6 class="card-title text-success">
                                <i class="fas fa-check-circle me-2"></i>
                                확정 ${index + 1}
                            </h6>
                            <div class="row mb-2">
                                <div class="col-6">
                                    <small class="text-muted">입력 품목명</small>
                                    <p class="mb-1"><strong>${item.input_item.name}</strong></p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">표준 코드</small>
                                    <p class="mb-1"><strong class="text-success">${item.match.std_code}</strong></p>
                                </div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6">
                                    <small class="text-muted">표준 품목명</small>
                                    <p class="mb-1"><strong>${item.match.std_name}</strong></p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">매칭 점수</small>
                                    <p class="mb-1"><strong>${item.match.match_score}</strong></p>
                                </div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6">
                                    <small class="text-muted">입력 재료비</small>
                                    <p class="mb-1"><strong>${formatCurrency(item.input_item.ext_price)}</strong></p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">표준 재료비</small>
                                    <p class="mb-1"><strong>${formatCurrency(item.match.std_price)}</strong></p>
                                </div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6">
                                    <small class="text-muted">차이(원)</small>
                                    <p class="mb-1"><strong class="${item.comparison.gap > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(item.comparison.gap)}</strong></p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">차이(%)</small>
                                    <p class="mb-1"><strong class="${item.comparison.gap > 0 ? 'text-danger' : 'text-success'}">${(parseFloat(item.comparison.gap_ratio) * 100).toFixed(1)}%</strong></p>
                                </div>
                            </div>
                            <small class="text-muted">매칭 사유: ${item.match.reason}</small>
                        </div>
                    </div>
                </div>
            `;
        });
        detailsHTML += '</div>';
    }
    
    // 모호한 항목들
    if (ambiguousItems.length > 0) {
        detailsHTML += `
            <div class="alert alert-warning mb-4">
                <h6><i class="fas fa-question-circle me-2"></i>모호한 항목 (${ambiguousItems.length}개)</h6>
                <p class="mb-0">유사한 품목이 여러 개 존재하여 정확한 매칭이 어려운 항목들입니다.</p>
            </div>
        `;
        
        detailsHTML += '<div class="row">';
        ambiguousItems.forEach((item, index) => {
            detailsHTML += `
                <div class="col-md-6 mb-3">
                    <div class="card border-warning">
                        <div class="card-body">
                            <h6 class="card-title text-warning">
                                <i class="fas fa-question-circle me-2"></i>
                                모호 ${index + 1}
                            </h6>
                            <div class="row mb-2">
                                <div class="col-12">
                                    <small class="text-muted">입력 품목명</small>
                                    <p class="mb-1"><strong>${item.input_item.name}</strong></p>
                                </div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-12">
                                    <small class="text-muted">입력 규격</small>
                                    <p class="mb-1"><strong>${item.input_item.spec}</strong></p>
                                </div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-12">
                                    <small class="text-muted">입력 재료비</small>
                                    <p class="mb-1"><strong>${formatCurrency(item.input_item.ext_price)}</strong></p>
                                </div>
                            </div>
                            <small class="text-muted">사유: ${item.note}</small>
                        </div>
                    </div>
                </div>
            `;
        });
        detailsHTML += '</div>';
    }
    
    // 매칭되지 않은 항목들
    if (noMatchItems.length > 0) {
        detailsHTML += `
            <div class="alert alert-danger mb-4">
                <h6><i class="fas fa-times-circle me-2"></i>매칭되지 않은 항목 (${noMatchItems.length}개)</h6>
                <p class="mb-0">표준공사코드에서 찾을 수 없는 항목들입니다.</p>
            </div>
        `;
        
        detailsHTML += '<div class="row">';
        noMatchItems.forEach((item, index) => {
            detailsHTML += `
                <div class="col-md-6 mb-3">
                    <div class="card border-danger">
                        <div class="card-body">
                            <h6 class="card-title text-danger">
                                <i class="fas fa-times-circle me-2"></i>
                                없음 ${index + 1}
                            </h6>
                            <div class="row mb-2">
                                <div class="col-12">
                                    <small class="text-muted">입력 품목명</small>
                                    <p class="mb-1"><strong>${item.input_item.name}</strong></p>
                                </div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-12">
                                    <small class="text-muted">입력 규격</small>
                                    <p class="mb-1"><strong>${item.input_item.spec}</strong></p>
                                </div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-12">
                                    <small class="text-muted">입력 재료비</small>
                                    <p class="mb-1"><strong>${formatCurrency(item.input_item.ext_price)}</strong></p>
                                </div>
                            </div>
                            <small class="text-muted">사유: ${item.note}</small>
                        </div>
                    </div>
                </div>
            `;
        });
        detailsHTML += '</div>';
    }
    
    if (data.length === 0) {
        detailsHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                분석할 데이터가 없습니다.
            </div>
        `;
    }
    
    detailsContainer.innerHTML = detailsHTML;
}

// Excel 파일 다운로드 (새로운 출력 형식용)
function exportToExcel() {
    try {
        const data = resultData.data;

        // 워크북 생성
        const wb = XLSX.utils.book_new();

        // 데이터 준비 (새로운 출력 형식용)
        const excelData = [
            ['번호', '입력 품목명', '입력 규격', '입력 단위', '입력 재료비', '의사결정', '표준 코드', '표준 품목명', '표준 재료비', '매칭 점수', '차이(원)', '차이(%)', '비고'],
            ...data.map((item, index) => [
                index + 1,
                item.input_item.name,
                item.input_item.spec,
                item.input_item.unit,
                item.input_item.ext_price,
                item.decision,
                item.match ? item.match.std_code : '',
                item.match ? item.match.std_name : '',
                item.match ? item.match.std_price : '',
                item.match ? item.match.match_score : '',
                item.comparison ? item.comparison.gap : '',
                item.comparison ? (parseFloat(item.comparison.gap_ratio) * 100).toFixed(1) + '%' : '',
                item.note || ''
            ])
        ];

        // 워크시트 생성
        const ws = XLSX.utils.aoa_to_sheet(excelData);

        // 컬럼 너비 설정
        ws['!cols'] = [
            { width: 8 },   // 번호
            { width: 20 },  // 입력 품목명
            { width: 15 },  // 입력 규격
            { width: 10 },  // 입력 단위
            { width: 12 },  // 입력 재료비
            { width: 10 },  // 의사결정
            { width: 12 },  // 표준 코드
            { width: 25 },  // 표준 품목명
            { width: 12 },  // 표준 재료비
            { width: 10 },  // 매칭 점수
            { width: 10 },  // 차이(원)
            { width: 10 },  // 차이(%)
            { width: 30 }   // 비고
        ];

        // 워크북에 워크시트 추가
        XLSX.utils.book_append_sheet(wb, ws, '표준공사코드매칭결과');

        // 파일 다운로드
        const fileName = `표준공사코드매칭결과_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showSuccessMessage('Excel 파일이 다운로드되었습니다.');

    } catch (error) {
        console.error('Excel 다운로드 오류:', error);
        showErrorMessage('Excel 파일 다운로드 중 오류가 발생했습니다.');
    }
}

// CSV 파일 다운로드 (새로운 출력 형식용)
function exportToCSV() {
    try {
        const data = resultData.data;

        // CSV 헤더 (새로운 출력 형식용)
        let csvContent = '번호,입력 품목명,입력 규격,입력 단위,입력 재료비,의사결정,표준 코드,표준 품목명,표준 재료비,매칭 점수,차이(원),차이(%),비고\n';

        // CSV 데이터
        data.forEach((item, index) => {
            csvContent += `${index + 1},"${item.input_item.name}","${item.input_item.spec}","${item.input_item.unit}",${item.input_item.ext_price},"${item.decision}","${item.match ? item.match.std_code : ''}","${item.match ? item.match.std_name : ''}",${item.match ? item.match.std_price : ''},${item.match ? item.match.match_score : ''},${item.comparison ? item.comparison.gap : ''},"${item.comparison ? (parseFloat(item.comparison.gap_ratio) * 100).toFixed(1) + '%' : ''}","${item.note || ''}"\n`;
        });

        // 파일 다운로드
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `표준공사코드매칭결과_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSuccessMessage('CSV 파일이 다운로드되었습니다.');

    } catch (error) {
        console.error('CSV 다운로드 오류:', error);
        showErrorMessage('CSV 파일 다운로드 중 오류가 발생했습니다.');
    }
}

// 통화 포맷팅
function formatCurrency(amount) {
    if (!amount || amount === '') return '-';
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return num.toLocaleString('ko-KR');
}

// 데이터 없음 메시지
function showNoDataMessage() {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="text-center py-5">
            <i class="fas fa-exclamation-triangle fa-4x text-warning mb-4"></i>
            <h3>데이터가 없습니다</h3>
            <p class="lead text-muted mb-4">
                처리할 데이터가 없습니다. 파일을 업로드해주세요.
            </p>
            <a href="upload.html" class="btn btn-primary btn-lg">
                <i class="fas fa-upload me-2"></i>
                파일 업로드하기
            </a>
        </div>
    `;
}

// 오류 메시지
function showErrorMessage(message) {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="text-center py-5">
            <i class="fas fa-times-circle fa-4x text-danger mb-4"></i>
            <h3>오류가 발생했습니다</h3>
            <p class="lead text-muted mb-4">${message}</p>
            <a href="upload.html" class="btn btn-primary btn-lg me-3">
                <i class="fas fa-upload me-2"></i>
                다시 시도하기
            </a>
            <a href="index.html" class="btn btn-outline-secondary btn-lg">
                <i class="fas fa-home me-2"></i>
                홈으로
            </a>
        </div>
    `;
}

// 성공 메시지
function showSuccessMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 3000);
}
