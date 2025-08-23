// 앱 초기화 및 탭 관리
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 앱 초기화
function initializeApp() {
    // 탭 이벤트 리스너 등록
    initializeTabs();
    
    // 대시보드 데이터 확인
    checkDashboardData();
    
    // URL 해시에 따른 탭 전환
    handleHashChange();
    
    // 해시 변경 이벤트 리스너
    window.addEventListener('hashchange', handleHashChange);
}

// 탭 초기화
function initializeTabs() {
    const tabLinks = document.querySelectorAll('[data-tab]');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetTab = this.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

// 탭 전환 함수
function switchTab(tabName) {
    // 모든 탭 콘텐츠 숨기기
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // 모든 탭 링크 비활성화
    const tabLinks = document.querySelectorAll('.nav-link');
    tabLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // 선택된 탭 활성화
    const targetContent = document.getElementById(tabName + 'Tab');
    const targetLink = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    if (targetLink) {
        targetLink.classList.add('active');
    }
    
    // URL 해시 업데이트
    window.location.hash = tabName;
    
    // 대시보드 탭인 경우 데이터 확인
    if (tabName === 'dashboard') {
        checkDashboardData();
    }
}

// 해시 변경 처리
function handleHashChange() {
    const hash = window.location.hash.substring(1) || 'home';
    switchTab(hash);
}

// 대시보드 데이터 확인
function checkDashboardData() {
    const apiResult = localStorage.getItem('apiResult');
    
    if (apiResult) {
        try {
            const result = JSON.parse(apiResult);
            if (result.success && result.data) {
                showDashboardResults(result);
            } else {
                showSampleDashboard();
            }
        } catch (e) {
            console.error('대시보드 데이터 파싱 오류:', e);
            showSampleDashboard();
        }
    } else {
        showSampleDashboard();
    }
}

// 샘플 대시보드 표시 (이미지와 동일한 데이터)
function showSampleDashboard() {
    const noDataMessage = document.getElementById('noDataMessage');
    const resultContent = document.getElementById('resultContent');
    
    if (noDataMessage) noDataMessage.style.display = 'none';
    if (resultContent) {
        resultContent.style.display = 'block';
        populateSampleTables();
    }
}

// 샘플 테이블 데이터 채우기
function populateSampleTables() {
    populateErrorReportTable();
    populateFullReportTable();
}

// 오류 보고서 테이블 채우기
function populateErrorReportTable() {
    const tableBody = document.getElementById('errorReportTable');
    if (!tableBody) return;
    
    const sampleData = [
        {
            status: '단가오류',
            statusIcon: 'error',
            fileName: '콘크리트',
            fileSpec: 'C24',
            fileRange: '1.0',
            filePrice: '1,980',
            stdName: '콘크리트 C24',
            stdSpec: 'C24',
            stdRange: '1.0',
            stdPrice: '2,100',
            code: 'ERR001',
            hasEditButton: true
        },
        {
            status: '단가오류',
            statusIcon: 'error',
            fileName: '철근',
            fileSpec: 'SD400',
            fileRange: '2.5',
            filePrice: '180,000',
            stdName: '철근 SD400',
            stdSpec: 'SD400',
            stdRange: '2.5',
            stdPrice: '185,000',
            code: 'ERR002',
            hasEditButton: true
        },
        {
            status: '인식오류',
            statusIcon: 'info',
            fileName: '모르타르',
            fileSpec: '1:3',
            fileRange: '0.5',
            filePrice: '8,500',
            stdName: '시멘트 모르타르',
            stdSpec: '1:3',
            stdRange: '0.5',
            stdPrice: '8,500',
            code: 'OK001',
            hasEditButton: true
        },
        {
            status: '단가오류',
            statusIcon: 'error',
            fileName: '벽돌',
            fileSpec: '190x90x57',
            fileRange: '100',
            filePrice: '1,200',
            stdName: '벽돌 190x90x57',
            stdSpec: '190x90x57',
            stdRange: '100',
            stdPrice: '1,250',
            code: 'ERR033',
            hasEditButton: true
        },
        {
            status: '단가오류',
            statusIcon: 'error',
            fileName: '유리',
            fileSpec: '6mm',
            fileRange: '10',
            filePrice: '15,000',
            stdName: '유리 6mm',
            stdSpec: '6mm',
            stdRange: '10',
            stdPrice: '15,500',
            code: 'ERR034',
            hasEditButton: true
        }
    ];
    
    tableBody.innerHTML = sampleData.map(item => `
        <tr>
            <td>
                <span class="status-icon status-${item.statusIcon}">${item.statusIcon === 'error' ? '!' : 'i'}</span>
                ${item.status}
            </td>
            <td>${item.fileName}</td>
            <td>${item.fileSpec}</td>
            <td>${item.fileRange}</td>
            <td class="text-danger">${item.filePrice}</td>
            <td>
                ${item.stdName}
                ${item.hasEditButton ? '<button class="btn btn-edit ms-2">수정</button>' : ''}
            </td>
            <td>${item.stdSpec}</td>
            <td>${item.stdRange}</td>
            <td class="text-danger">${item.stdPrice}</td>
            <td>${item.code}</td>
        </tr>
    `).join('');
}

// 전체 검증 보고서 테이블 채우기
function populateFullReportTable() {
    const tableBody = document.getElementById('fullReportTable');
    if (!tableBody) return;
    
    const sampleData = [
        {
            status: '수정됨',
            statusIcon: 'success',
            fileName: '콘크리트',
            fileSpec: 'C24',
            fileRange: '1.0',
            filePrice: '2,100',
            stdName: '콘크리트 C24',
            stdSpec: 'C24',
            stdRange: '1.0',
            stdPrice: '2,100',
            code: 'ERR001'
        },
        {
            status: '단가오류',
            statusIcon: 'error',
            fileName: '철근',
            fileSpec: 'SD400',
            fileRange: '2.5',
            filePrice: '180,000',
            stdName: '철근 SD400',
            stdSpec: 'SD400',
            stdRange: '2.5',
            stdPrice: '185,000',
            code: 'ERR002'
        },
        {
            status: '인식오류',
            statusIcon: 'info',
            fileName: '모르타르',
            fileSpec: '1:3',
            fileRange: '0.5',
            filePrice: '8,500',
            stdName: '시멘트 모르타르',
            stdSpec: '1:3',
            stdRange: '0.5',
            stdPrice: '8,500',
            code: 'OK001'
        },
        {
            status: '',
            statusIcon: '',
            fileName: '벽돌',
            fileSpec: '190x90x57',
            fileRange: '100',
            filePrice: '1,200',
            stdName: '벽돌 190x90x57',
            stdSpec: '190x90x57',
            stdRange: '100',
            stdPrice: '1,250',
            code: 'ERR033'
        },
        {
            status: '',
            statusIcon: '',
            fileName: '유리',
            fileSpec: '6mm',
            fileRange: '10',
            filePrice: '15,000',
            stdName: '유리 6mm',
            stdSpec: '6mm',
            stdRange: '10',
            stdPrice: '15,500',
            code: 'ERR034'
        }
    ];
    
    tableBody.innerHTML = sampleData.map(item => `
        <tr>
            <td>
                ${item.statusIcon ? `<span class="status-icon status-${item.statusIcon}">${item.statusIcon === 'error' ? '!' : item.statusIcon === 'success' ? '✓' : 'i'}</span>` : ''}
                ${item.status}
            </td>
            <td>${item.fileName}</td>
            <td>${item.fileSpec}</td>
            <td>${item.fileRange}</td>
            <td class="text-danger">${item.filePrice}</td>
            <td>${item.stdName}</td>
            <td>${item.stdSpec}</td>
            <td>${item.stdRange}</td>
            <td class="text-danger">${item.stdPrice}</td>
            <td>${item.code}</td>
        </tr>
    `).join('');
}

// 대시보드 결과 표시
function showDashboardResults(result) {
    const noDataMessage = document.getElementById('noDataMessage');
    const resultContent = document.getElementById('resultContent');
    
    if (noDataMessage) noDataMessage.style.display = 'none';
    if (resultContent) {
        resultContent.style.display = 'block';
        resultContent.innerHTML = generateDashboardHTML(result);
    }
}

// 데이터 없음 메시지 표시
function showNoDataMessage() {
    const noDataMessage = document.getElementById('noDataMessage');
    const resultContent = document.getElementById('resultContent');
    
    if (noDataMessage) noDataMessage.style.display = 'block';
    if (resultContent) resultContent.style.display = 'none';
}

// 대시보드 HTML 생성
function generateDashboardHTML(result) {
    const data = result.data;
    const fileName = result.fileName || '업로드된 파일';
    
    let html = `
        <div class="row mb-4">
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center">
                    <h2 class="mb-0">매칭 결과</h2>
                    <button class="btn btn-outline-primary" onclick="downloadResults()">
                        <i class="fas fa-download me-2"></i>결과 다운로드
                    </button>
                </div>
                <p class="text-muted mb-0">파일: ${fileName}</p>
            </div>
        </div>
        
        <div class="row mb-4">
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-light">
                        <h5 class="mb-0">매칭 통계</h5>
                    </div>
                    <div class="card-body">
                        <div class="row text-center">
                            <div class="col-md-3">
                                <div class="border-end">
                                    <h3 class="text-success mb-1">${data.filter(item => item.decision === '확정').length}</h3>
                                    <p class="text-muted mb-0">확정</p>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="border-end">
                                    <h3 class="text-warning mb-1">${data.filter(item => item.decision === '모호').length}</h3>
                                    <p class="text-muted mb-0">모호</p>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="border-end">
                                    <h3 class="text-danger mb-1">${data.filter(item => item.decision === '없음').length}</h3>
                                    <p class="text-muted mb-0">없음</p>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <h3 class="text-primary mb-1">${data.length}</h3>
                                <p class="text-muted mb-0">전체</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-light">
                        <h5 class="mb-0">상세 결과</h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th>품목명</th>
                                        <th>규격</th>
                                        <th>단위</th>
                                        <th>재료비</th>
                                        <th>결과</th>
                                        <th>매칭 정보</th>
                                    </tr>
                                </thead>
                                <tbody>
    `;
    
    data.forEach((item, index) => {
        const decisionClass = {
            '확정': 'success',
            '모호': 'warning',
            '없음': 'danger'
        }[item.decision] || 'secondary';
        
        html += `
            <tr>
                <td><strong>${item.input_item.name}</strong></td>
                <td>${item.input_item.spec}</td>
                <td>${item.input_item.unit}</td>
                <td>${item.input_item.ext_price.toLocaleString()}원</td>
                <td>
                    <span class="badge bg-${decisionClass}">${item.decision}</span>
                </td>
                <td>
        `;
        
        if (item.decision === '확정' && item.match) {
            html += `
                <small class="text-success">
                    <strong>${item.match.std_name}</strong><br>
                    ${item.match.std_code} | ${item.match.std_price.toLocaleString()}원
                </small>
            `;
        } else if (item.decision === '모호' && item.candidates) {
            html += `
                <small class="text-warning">
                    ${item.candidates.length}개 후보<br>
                    <button class="btn btn-sm btn-outline-warning" onclick="showCandidates(${index})">
                        후보 보기
                    </button>
                </small>
            `;
        } else {
            html += `<small class="text-muted">${item.note || '매칭 없음'}</small>`;
        }
        
        html += `
                </td>
            </tr>
        `;
    });
    
    html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return html;
}

// 결과 다운로드
function downloadResults() {
    const apiResult = localStorage.getItem('apiResult');
    if (!apiResult) {
        alert('다운로드할 결과가 없습니다.');
        return;
    }
    
    try {
        const result = JSON.parse(apiResult);
        const data = result.data;
        
        // CSV 형식으로 변환
        let csv = '품목명,규격,단위,재료비,결과,매칭정보\n';
        
        data.forEach(item => {
            let matchInfo = '';
            if (item.decision === '확정' && item.match) {
                matchInfo = `${item.match.std_name} (${item.match.std_code})`;
            } else if (item.decision === '모호' && item.candidates) {
                matchInfo = `${item.candidates.length}개 후보`;
            } else {
                matchInfo = item.note || '매칭 없음';
            }
            
            csv += `"${item.input_item.name}","${item.input_item.spec}","${item.input_item.unit}",${item.input_item.ext_price},"${item.decision}","${matchInfo}"\n`;
        });
        
        // 파일 다운로드
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `매칭결과_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (e) {
        console.error('다운로드 오류:', e);
        alert('다운로드 중 오류가 발생했습니다.');
    }
}

// 후보 목록 표시 (모달)
function showCandidates(index) {
    const apiResult = localStorage.getItem('apiResult');
    if (!apiResult) return;
    
    try {
        const result = JSON.parse(apiResult);
        const item = result.data[index];
        
        if (!item.candidates) return;
        
        let modalHtml = `
            <div class="modal fade" id="candidatesModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">매칭 후보 목록</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <h6>${item.input_item.name} (${item.input_item.spec})</h6>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>순위</th>
                                            <th>표준코드</th>
                                            <th>표준품목명</th>
                                            <th>규격</th>
                                            <th>단위</th>
                                            <th>표준단가</th>
                                            <th>점수</th>
                                        </tr>
                                    </thead>
                                    <tbody>
        `;
        
        item.candidates.forEach((candidate, idx) => {
            modalHtml += `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${candidate.std_code}</td>
                    <td>${candidate.std_name}</td>
                    <td>${candidate.std_spec}</td>
                    <td>${candidate.unit}</td>
                    <td>${candidate.std_price.toLocaleString()}원</td>
                    <td>${(candidate.match_score * 100).toFixed(1)}%</td>
                </tr>
            `;
        });
        
        modalHtml += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 기존 모달 제거
        const existingModal = document.getElementById('candidatesModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 새 모달 추가
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 모달 표시
        const modal = new bootstrap.Modal(document.getElementById('candidatesModal'));
        modal.show();
        
    } catch (e) {
        console.error('후보 목록 표시 오류:', e);
    }
}
