// 대시보드 전용 기능
document.addEventListener('DOMContentLoaded', function() {
    // 대시보드 관련 초기화
    initializeDashboard();
});

// 대시보드 초기화
function initializeDashboard() {
    // 페이지 로드 시 데이터 확인
    checkDashboardData();
}

// 대시보드 데이터 새로고침
function refreshDashboard() {
    checkDashboardData();
}

// 대시보드 데이터 초기화
function clearDashboardData() {
    localStorage.removeItem('apiResult');
    localStorage.removeItem('fileData');
    showNoDataMessage();
}

// 대시보드 필터링 기능
function filterResults(filterType) {
    const apiResult = localStorage.getItem('apiResult');
    if (!apiResult) return;
    
    try {
        const result = JSON.parse(apiResult);
        const data = result.data;
        
        let filteredData;
        switch (filterType) {
            case 'confirmed':
                filteredData = data.filter(item => item.decision === '확정');
                break;
            case 'ambiguous':
                filteredData = data.filter(item => item.decision === '모호');
                break;
            case 'none':
                filteredData = data.filter(item => item.decision === '없음');
                break;
            default:
                filteredData = data;
        }
        
        // 필터링된 결과로 대시보드 업데이트
        const filteredResult = { ...result, data: filteredData };
        showDashboardResults(filteredResult);
        
    } catch (e) {
        console.error('필터링 오류:', e);
    }
}

// 대시보드 검색 기능
function searchResults(query) {
    const apiResult = localStorage.getItem('apiResult');
    if (!apiResult) return;
    
    try {
        const result = JSON.parse(apiResult);
        const data = result.data;
        
        const filteredData = data.filter(item => 
            item.input_item.name.toLowerCase().includes(query.toLowerCase()) ||
            item.input_item.spec.toLowerCase().includes(query.toLowerCase()) ||
            (item.match && item.match.std_name.toLowerCase().includes(query.toLowerCase()))
        );
        
        const filteredResult = { ...result, data: filteredData };
        showDashboardResults(filteredResult);
        
    } catch (e) {
        console.error('검색 오류:', e);
    }
}

// 대시보드 정렬 기능
function sortResults(sortBy, sortOrder = 'asc') {
    const apiResult = localStorage.getItem('apiResult');
    if (!apiResult) return;
    
    try {
        const result = JSON.parse(apiResult);
        const data = [...result.data];
        
        data.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.input_item.name;
                    bValue = b.input_item.name;
                    break;
                case 'price':
                    aValue = a.input_item.ext_price;
                    bValue = b.input_item.ext_price;
                    break;
                case 'decision':
                    aValue = a.decision;
                    bValue = b.decision;
                    break;
                default:
                    return 0;
            }
            
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
        
        const sortedResult = { ...result, data: data };
        showDashboardResults(sortedResult);
        
    } catch (e) {
        console.error('정렬 오류:', e);
    }
}

// 대시보드 내보내기 기능 (Excel 형식)
function exportToExcel() {
    const apiResult = localStorage.getItem('apiResult');
    if (!apiResult) {
        alert('내보낼 데이터가 없습니다.');
        return;
    }
    
    try {
        const result = JSON.parse(apiResult);
        const data = result.data;
        
        // Excel 형식의 데이터 생성
        let excelData = [
            ['품목명', '규격', '단위', '재료비', '결과', '표준코드', '표준품목명', '표준단가', '매칭점수', '비고']
        ];
        
        data.forEach(item => {
            const row = [
                item.input_item.name,
                item.input_item.spec,
                item.input_item.unit,
                item.input_item.ext_price,
                item.decision,
                item.match ? item.match.std_code : '',
                item.match ? item.match.std_name : '',
                item.match ? item.match.std_price : '',
                item.match ? (item.match.match_score * 100).toFixed(1) + '%' : '',
                item.note || ''
            ];
            excelData.push(row);
        });
        
        // CSV 형식으로 변환 (Excel에서 열 수 있음)
        let csv = '';
        excelData.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });
        
        // 파일 다운로드
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `매칭결과_Excel_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (e) {
        console.error('Excel 내보내기 오류:', e);
        alert('Excel 내보내기 중 오류가 발생했습니다.');
    }
}

// 대시보드 통계 차트 생성
function generateCharts() {
    const apiResult = localStorage.getItem('apiResult');
    if (!apiResult) return;
    
    try {
        const result = JSON.parse(apiResult);
        const data = result.data;
        
        // 통계 계산
        const stats = {
            confirmed: data.filter(item => item.decision === '확정').length,
            ambiguous: data.filter(item => item.decision === '모호').length,
            none: data.filter(item => item.decision === '없음').length,
            total: data.length
        };
        
        // 차트 컨테이너 생성
        const chartContainer = document.createElement('div');
        chartContainer.className = 'row mb-4';
        chartContainer.innerHTML = `
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-light">
                        <h5 class="mb-0">
                            <i class="fas fa-chart-pie me-2"></i>매칭 결과 분포
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <canvas id="pieChart" width="400" height="400"></canvas>
                            </div>
                            <div class="col-md-6">
                                <canvas id="barChart" width="400" height="400"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 차트 생성 (Chart.js 사용)
        if (typeof Chart !== 'undefined') {
            // 파이 차트
            const pieCtx = document.getElementById('pieChart');
            if (pieCtx) {
                new Chart(pieCtx, {
                    type: 'pie',
                    data: {
                        labels: ['확정', '모호', '없음'],
                        datasets: [{
                            data: [stats.confirmed, stats.ambiguous, stats.none],
                            backgroundColor: ['#28a745', '#ffc107', '#dc3545']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                });
            }
            
            // 바 차트
            const barCtx = document.getElementById('barChart');
            if (barCtx) {
                new Chart(barCtx, {
                    type: 'bar',
                    data: {
                        labels: ['확정', '모호', '없음'],
                        datasets: [{
                            label: '매칭 결과',
                            data: [stats.confirmed, stats.ambiguous, stats.none],
                            backgroundColor: ['#28a745', '#ffc107', '#dc3545']
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }
        }
        
    } catch (e) {
        console.error('차트 생성 오류:', e);
    }
}

// 대시보드 설정 저장
function saveDashboardSettings(settings) {
    localStorage.setItem('dashboardSettings', JSON.stringify(settings));
}

// 대시보드 설정 로드
function loadDashboardSettings() {
    const settings = localStorage.getItem('dashboardSettings');
    return settings ? JSON.parse(settings) : {
        showCharts: true,
        showFilters: true,
        itemsPerPage: 20,
        defaultSort: 'name',
        defaultSortOrder: 'asc'
    };
}
