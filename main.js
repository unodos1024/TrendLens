// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const statusText = document.getElementById('statusText');
const toast = document.getElementById('toast');

// News Page Elements
const searchBtn = document.getElementById('searchBtn');
const keywordInput = document.getElementById('keyword');
const sortSelect = document.getElementById('sort');
const sourceSelect = document.getElementById('source');
const displayCountSelect = document.getElementById('displayCount');
const resultsArea = document.getElementById('resultsArea');

// Collection Elements
const collectionArea = document.getElementById('collectionArea');
// const collectCountBadge = document.getElementById('collectCountBadge'); // Removed from HTML

const analyzeTrendBtn = document.getElementById('analyzeTrendBtn');
const analyzeShoppingBtn = document.getElementById('analyzeShoppingBtn');
const shoppingCat1 = document.getElementById('shoppingCat1');
const shoppingCat2 = document.getElementById('shoppingCat2');

// Settings Elements
const manageApisBtn = document.getElementById('manageApisBtn');
const apiModal = document.getElementById('apiModal');
const closeApiModal = document.getElementById('closeApiModal');
const apiConfigForm = document.getElementById('apiConfigForm');
const apiConfigList = document.getElementById('apiConfigList');
const apiConfigListModal = document.getElementById('apiConfigListModal');

// Modal Elements
const draftModal = document.getElementById('draftModal');
const closeModal = document.getElementById('closeModal');
const copyDraftBtn = document.getElementById('copyDraftBtn');
const postTistoryBtn = document.getElementById('postTistoryBtn');
const draftLoading = document.getElementById('draftLoading');
const draftTitle = document.getElementById('draftTitle');
const draftText = document.getElementById('draftText');
const draftTagList = document.getElementById('draftTagList');

// State
let currentArticles = [];
let collectedArticles = [];
let trendChart = null;
let shoppingChart = null;
let currentDraft = null;

// Shopping Sub-categories Map
const subCategoryMap = {
    "50000000": [ // 패션의류
        { id: "50000830", name: "남성의류" },
        { id: "50000167", name: "여성의류" },
        { id: "50000837", name: "언더웨어/잠옷" }
    ],
    "50000001": [ // 패션잡화
        { id: "50000169", name: "신발" },
        { id: "50000173", name: "가방" },
        { id: "50000551", name: "지갑/벨트" },
        { id: "50000171", name: "쥬얼리" }
    ],
    "50000002": [ // 화장품/미용
        { id: "50000176", name: "스킨케어" },
        { id: "50000180", name: "메이크업" },
        { id: "50000181", name: "헤어케어" }
    ],
    "50000003": [ // 디지털/가전
        { id: "50000204", name: "휴대폰" },
        { id: "50000151", name: "노트북" },
        { id: "50000213", name: "PC부품" },
        { id: "50000153", name: "카메라" }
    ],
    "50000004": [ // 가구/인테리어
        { id: "50000121", name: "침실가구" },
        { id: "50000122", name: "거실가구" },
        { id: "50000123", name: "주방가구" }
    ],
    "50000005": [ // 출산/육아
        { id: "50000136", name: "출산용품" },
        { id: "50000137", name: "유아기저귀" },
        { id: "50000143", name: "완구/교구" }
    ],
    "50000006": [ // 식품
        { id: "50000026", name: "가공식품" },
        { id: "50000028", name: "농산물" },
        { id: "50000029", name: "수산물" },
        { id: "50000033", name: "음료" }
    ],
    "50000007": [ // 스포츠/레저
        { id: "50000036", name: "골프" },
        { id: "50000041", name: "캠핑" },
        { id: "50000038", name: "등산" }
    ],
    "50000008": [ // 생활/건강
        { id: "50000063", name: "생활용품" },
        { id: "50000064", name: "욕실용품" },
        { id: "50000069", name: "청소용품" },
        { id: "50000012", name: "반려동물" }
    ]
};

// Page Navigation
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetPage = item.dataset.page;
        switchPage(targetPage);
    });
});

function switchPage(pageName) {
    // Update nav items
    navItems.forEach(nav => {
        if (nav.dataset.page === pageName) {
            nav.classList.add('active');
        } else {
            nav.classList.remove('active');
        }
    });

    // Update pages
    pages.forEach(page => {
        if (page.id === `${pageName}Page`) {
            page.classList.add('active');
        } else {
            page.classList.remove('active');
        }
    });

    // Load page-specific data
    if (pageName === 'collection') {
        loadCollection();
    }
}

// News Search
searchBtn.addEventListener('click', () => {
    const keyword = keywordInput.value.trim();
    const sort = sortSelect.value;
    const sourceId = sourceSelect.value;
    const display = displayCountSelect.value;

    if (!keyword) {
        showToast('키워드를 입력해 주세요.');
        return;
    }

    fetchNews(keyword, sort, sourceId, display);
});

async function fetchNews(query, sort, sourceId = 'naver', display = 20) {
    statusText.textContent = '수집 중...';
    resultsArea.innerHTML = '<div class="empty-state"><div class="spinner"></div><p>데이터를 가져오는 중입니다...</p></div>';

    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&sort=${sort}&sourceId=${sourceId}&display=${display}`);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            currentArticles = data.items;
            renderNews(data.items, resultsArea);
            statusText.textContent = `${data.items.length}개의 데이터 수집 완료`;
        } else {
            resultsArea.innerHTML = '<div class="empty-state"><h2>검색 결과가 없습니다</h2></div>';
            statusText.textContent = '결과 없음';
        }
    } catch (error) {
        resultsArea.innerHTML = `<div class="empty-state"><h2>에러 발생</h2><p>${error.message}</p></div>`;
        statusText.textContent = '에러 발생';
    }
}

function renderNews(items, container, isCollection = false) {
    container.innerHTML = '';
    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><h2>표시할 기사가 없습니다</h2></div>';
        return;
    }

    items.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'news-card';
        card.id = `news-${index}`;
        card.style.animationDelay = `${index * 0.05}s`;

        const pubDate = new Date(item.pubDate || item.collectedAt);
        const formattedDate = pubDate.toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        card.innerHTML = `
            <div class="card-header">
                <span class="pub-date">${isCollection ? '📍 수집됨: ' : ''}${formattedDate}</span>
                ${!isCollection ? `<button class="btn-hide" onclick="excludeNews('${item.link}', 'news-${index}')" title="이 기사 제외하기">✕</button>` : ''}
            </div>
            <h3 class="news-title">${item.title}</h3>
            <p class="news-description">${item.description}</p>
            <div class="card-footer">
                <a href="${item.link}" target="_blank" class="link-btn">
                    원문 보기
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
                <div class="action-group">
                    ${!isCollection ? `<button class="save-btn" onclick="saveForBlog('${item.link}')">수집함 담기</button>` : `<button class="btn-delete-article" onclick="removeFromCollection('${item.link}', 'news-${index}')">삭제</button>`}
                    ${isCollection ? `<button class="btn-ai" onclick="generateAIDraft('${index}')">AI 초안 작성</button>` : ''}
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    // Store items globally for AI draft generation
    window.currentViewItems = items;
}

// Collection Management
async function loadCollection() {
    statusText.textContent = '수집함 불러오는 중...';
    try {
        const response = await fetch('/api/collect');
        collectedArticles = await response.json();
        // if (collectCountBadge) collectCountBadge.textContent = collectedArticles.length;
        renderNews(collectedArticles, collectionArea, true);
        statusText.textContent = `수집함: ${collectedArticles.length}개의 기사`;
    } catch (error) {
        showToast('수집함을 불러오지 못했습니다.');
    }
}

window.saveForBlog = async (link) => {
    const article = currentArticles.find(a => a.link === link);
    if (!article) return;

    try {
        const response = await fetch('/api/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(article)
        });
        if (response.ok) {
            showToast('수집함에 저장되었습니다!');
            loadCollection(); // Update count
        }
    } catch (error) {
        showToast('저장 중 오류가 발생했습니다.');
    }
};

window.removeFromCollection = async (link, cardId) => {
    if (!confirm('수집함에서 삭제하시겠습니까?')) return;
    try {
        const response = await fetch('/api/collect', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link })
        });
        if (response.ok) {
            const card = document.getElementById(cardId);
            card.style.opacity = '0';
            setTimeout(() => {
                card.remove();
                loadCollection();
            }, 300);
            showToast('수집함에서 삭제되었습니다.');
        }
    } catch (error) {
        showToast('삭제 중 오류가 발생했습니다.');
    }
};

window.excludeNews = async (link, cardId) => {
    try {
        const response = await fetch('/api/exclude', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link })
        });
        if (response.ok) {
            const card = document.getElementById(cardId);
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => card.remove(), 300);
            showToast('기사가 제외 목록에 추가되었습니다.');
        }
    } catch (error) {
        showToast('제외 처리 중 오류가 발생했습니다.');
    }
};

// Multi-keyword Trend Analysis
const fixedKeywordGrid = document.getElementById('fixedKeywordGrid');

analyzeTrendBtn.addEventListener('click', async () => {
    const keywords = [];
    const allInputs = fixedKeywordGrid.querySelectorAll('.keyword-input');
    allInputs.forEach(input => {
        const value = input.value.trim();
        if (value) keywords.push(value);
    });

    if (keywords.length === 0) {
        showToast('최소 1개의 키워드를 입력하세요.');
        return;
    }

    // Collect checkbox values
    const checkAllDevice = document.querySelector('.check-all[data-target="trendDevice"]').checked;
    const checkAllGender = document.querySelector('.check-all[data-target="trendGender"]').checked;
    const checkAllAge = document.querySelector('.check-all[data-target="trendAge"]').checked;

    const selectedDevices = checkAllDevice ? [] : Array.from(document.querySelectorAll('input[name="trendDevice"]:checked')).map(el => el.value);
    const selectedGenders = checkAllGender ? [] : Array.from(document.querySelectorAll('input[name="trendGender"]:checked')).map(el => el.value);
    const selectedAges = checkAllAge ? [] : Array.from(document.querySelectorAll('input[name="trendAge"]:checked')).map(el => el.value);

    const device = selectedDevices.length === 1 ? selectedDevices[0] : '';
    const gender = selectedGenders.length === 1 ? selectedGenders[0] : '';

    let startDate = document.getElementById('trendStartDate').value;
    let endDate = document.getElementById('trendEndDate').value;

    const timeUnit = document.getElementById('trendTimeUnit').value;

    // Handle Month/Week start/end date formatting for Naver API (needs YYYY-MM-DD)
    if ((timeUnit === 'month' || timeUnit === 'week') && startDate.length === 7) {
        startDate += '-01';

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const [year, month] = endDate.split('-').map(Number);
        const lastDayDate = new Date(year, month, 0);
        let lastDayStr = `${year}-${month.toString().padStart(2, '0')}-${lastDayDate.getDate().toString().padStart(2, '0')}`;

        // If the end of the month is in the future, use today
        if (lastDayStr > todayStr) {
            endDate = todayStr;
        } else {
            endDate = lastDayStr;
        }
    }

    const filters = {
        timeUnit: timeUnit,
        device: device,
        gender: gender,
        ages: selectedAges,
        startDate: startDate,
        endDate: endDate
    };

    await fetchMultiTrend(keywords, filters);
});

// Update trend dates based on time unit
function handleTimeUnitChange(unit, startId, endId) {
    const startInput = document.getElementById(startId);
    const endInput = document.getElementById(endId);
    const today = new Date();
    const pastDate = new Date(today);

    if (unit === 'month' || unit === 'week') {
        startInput.type = 'month';
        endInput.type = 'month';
        if (unit === 'month') {
            pastDate.setFullYear(today.getFullYear() - 1);
        } else {
            pastDate.setMonth(today.getMonth() - 3);
        }
        startInput.value = pastDate.toISOString().slice(0, 7);
        endInput.value = today.toISOString().slice(0, 7);
    } else {
        startInput.type = 'date';
        endInput.type = 'date';
        pastDate.setMonth(today.getMonth() - 1);
        startInput.value = pastDate.toISOString().split('T')[0];
        endInput.value = today.toISOString().split('T')[0];
    }
}

const trendTimeUnitSelect = document.getElementById('trendTimeUnit');
if (trendTimeUnitSelect) {
    trendTimeUnitSelect.addEventListener('change', () => {
        handleTimeUnitChange(trendTimeUnitSelect.value, 'trendStartDate', 'trendEndDate');
    });
}

const shoppingTimeUnitSelect = document.getElementById('shoppingTimeUnit');
if (shoppingTimeUnitSelect) {
    shoppingTimeUnitSelect.addEventListener('change', () => {
        handleTimeUnitChange(shoppingTimeUnitSelect.value, 'shoppingStartDate', 'shoppingEndDate');
    });
}

// Shopping Category Change
if (shoppingCat1) {
    shoppingCat1.addEventListener('change', () => {
        const cat1Id = shoppingCat1.value;
        const subCats = subCategoryMap[cat1Id] || [];

        shoppingCat2.innerHTML = '<option value="">2분류 선택</option>';
        subCats.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            shoppingCat2.appendChild(opt);
        });
    });
}

// Shopping Trend Analysis
if (analyzeShoppingBtn) {
    analyzeShoppingBtn.addEventListener('click', async () => {
        const cat1Id = shoppingCat1.value;
        const cat2Id = shoppingCat2.value;

        if (!cat1Id) {
            showToast('분야(1분류)를 선택하세요.');
            return;
        }

        const checkAllDevice = document.querySelector('.check-all[data-target="shoppingDevice"]').checked;
        const checkAllGender = document.querySelector('.check-all[data-target="shoppingGender"]').checked;
        const checkAllAge = document.querySelector('.check-all[data-target="shoppingAge"]').checked;

        const device = checkAllDevice ? '' : (Array.from(document.querySelectorAll('input[name="shoppingDevice"]:checked'))[0]?.value || '');
        const gender = checkAllGender ? '' : (Array.from(document.querySelectorAll('input[name="shoppingGender"]:checked'))[0]?.value || '');
        const ages = checkAllAge ? [] : Array.from(document.querySelectorAll('input[name="shoppingAge"]:checked')).map(el => el.value);

        let startDate = document.getElementById('shoppingStartDate').value;
        let endDate = document.getElementById('shoppingEndDate').value;
        const timeUnit = document.getElementById('shoppingTimeUnit').value;

        if ((timeUnit === 'month' || timeUnit === 'week') && startDate.length === 7) {
            startDate += '-01';
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const [year, month] = endDate.split('-').map(Number);
            const lastDayDate = new Date(year, month, 0);
            let lastDayStr = `${year}-${month.toString().padStart(2, '0')}-${lastDayDate.getDate().toString().padStart(2, '0')}`;
            endDate = lastDayStr > todayStr ? todayStr : lastDayStr;
        }

        const filters = {
            category: cat2Id || cat1Id,
            timeUnit,
            device,
            gender,
            ages,
            startDate,
            endDate
        };

        await fetchShoppingTrend(filters);
    });
}

async function fetchShoppingTrend(filters) {
    statusText.textContent = '쇼핑 인사이트 분석 중...';
    try {
        const response = await fetch('/api/trend/shopping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filters)
        });
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            renderShoppingChart(data.results[0]);
            statusText.textContent = '쇼핑 인사이트 조회 완료';
        } else {
            statusText.textContent = '쇼핑 데이터가 부족합니다.';
        }
    } catch (error) {
        console.error('Shopping Trend Error:', error);
        statusText.textContent = '쇼핑 트렌드 조회 실패';
        showToast('쇼핑 데이터를 불러오지 못했습니다.');
    }
}

function renderShoppingChart(result) {
    const ctx = document.getElementById('shoppingChart').getContext('2d');
    if (shoppingChart) {
        shoppingChart.destroy();
    }

    const labels = result.data.map(item => item.period);
    const dataValues = result.data.map(item => item.ratio);

    shoppingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: result.title,
                data: dataValues,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.6)' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255, 255, 255, 0.6)' }
                }
            }
        }
    });
}

async function fetchMultiTrend(keywords, filters = {}) {
    statusText.textContent = '트렌드 분석 중...';

    try {
        const response = await fetch('/api/trend/multi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords, ...filters })
        });
        const data = await response.json();

        console.log('Multi Trend Response:', data);

        if (data.results && data.results.length > 0) {
            renderMultiTrendChart(data.results);
            statusText.textContent = `트렌드 분석 완료 (${keywords.length}개 키워드)`;
        } else {
            statusText.textContent = '데이터가 부족합니다.';
        }
    } catch (error) {
        console.error('Trend Error:', error);
        statusText.textContent = '트렌드 조회 실패';
        showToast('트렌드 데이터를 불러오지 못했습니다.');
    }
}

function renderMultiTrendChart(results) {
    const ctx = document.getElementById('trendChart').getContext('2d');

    if (trendChart) {
        trendChart.destroy();
    }

    const colors = [
        '#38bdf8', // Blue
        '#a78bfa', // Purple  
        '#f59e0b', // Orange
        '#10b981', // Green
        '#ef4444'  // Red
    ];

    const datasets = results.map((result, index) => ({
        label: result.title,
        data: result.data.map(item => item.ratio),
        borderColor: colors[index],
        backgroundColor: colors[index] + '20',
        borderWidth: 3,
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: colors[index],
        pointRadius: 4
    }));

    const labels = results[0].data.map(item => item.period);

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#94a3b8' },
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#38bdf8'
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#64748b' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#64748b' },
                    beginAtZero: true
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// API Management
async function loadApiConfigs() {
    try {
        const response = await fetch('/api/configs');
        const configs = await response.json();

        // Populate Source Select
        sourceSelect.innerHTML = configs.map(c =>
            `<option value="${c.id}" ${c.type === 'naver' ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        // Populate Settings List
        const list = configs.filter(c => c.type !== 'naver').map(c => `
            <div class="api-config-item">
                <div><strong>${c.name}</strong><br><small>${c.url}</small></div>
                <div>
                    <button class="btn-secondary" onclick="editApiConfig('${c.id}')">수정</button>
                    <button class="btn-secondary" onclick="deleteApiConfig('${c.id}')">삭제</button>
                </div>
            </div>
        `).join('') || '<p>등록된 API가 없습니다.</p>';

        apiConfigList.innerHTML = list;
        apiConfigListModal.innerHTML = list;

        window.currentConfigs = configs;
    } catch (error) {
        console.error('Failed to load configs:', error);
    }
}

manageApisBtn.addEventListener('click', () => {
    loadApiConfigs();
    apiModal.classList.add('show');
});

closeApiModal.addEventListener('click', () => {
    apiModal.classList.remove('show');
    apiConfigForm.reset();
});

apiConfigForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const config = {
        id: document.getElementById('configId').value || undefined,
        name: document.getElementById('configName').value,
        url: document.getElementById('configUrl').value,
        serviceKey: document.getElementById('configKey').value,
        keywordParam: document.getElementById('configKeyword').value,
        itemPath: document.getElementById('configPath').value,
        mapTitle: document.getElementById('mapTitle').value,
        mapLink: document.getElementById('mapLink').value,
        mapDesc: document.getElementById('mapDesc').value,
        type: 'public'
    };

    try {
        const response = await fetch('/api/configs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        if (response.ok) {
            showToast('API 설정이 저장되었습니다.');
            loadApiConfigs();
            apiConfigForm.reset();
            document.getElementById('configId').value = '';
        }
    } catch (error) {
        showToast('저장 중 오류가 발생했습니다.');
    }
});

window.editApiConfig = (id) => {
    const config = window.currentConfigs.find(c => c.id === id);
    if (!config) return;

    document.getElementById('configId').value = config.id;
    document.getElementById('configName').value = config.name;
    document.getElementById('configUrl').value = config.url;
    document.getElementById('configKey').value = config.serviceKey;
    document.getElementById('configKeyword').value = config.keywordParam;
    document.getElementById('configPath').value = config.itemPath || '';
    document.getElementById('mapTitle').value = config.mapTitle || '';
    document.getElementById('mapLink').value = config.mapLink || '';
    document.getElementById('mapDesc').value = config.mapDesc || '';
};

window.deleteApiConfig = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
        const response = await fetch(`/api/configs/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('삭제되었습니다.');
            loadApiConfigs();
        }
    } catch (error) {
        showToast('삭제 중 오류가 발생했습니다.');
    }
};

// AI Draft Generation
let activeDraftArticle = null;

window.generateAIDraft = async (index) => {
    const article = window.currentViewItems[index];
    if (!article) return;

    activeDraftArticle = article;

    // UI Reset
    document.getElementById('previewTitle').textContent = article.title;
    document.getElementById('previewDesc').textContent = article.description;
    document.getElementById('draftInitialView').style.display = 'block';
    document.getElementById('draftResultView').style.display = 'none';
    document.getElementById('modalFooter').style.display = 'none';
    draftTitle.value = '';
    draftText.value = '';
    draftTagList.innerHTML = '';

    draftModal.classList.add('show');
};

const startAiDraftBtn = document.getElementById('startAiDraftBtn');
startAiDraftBtn.addEventListener('click', async () => {
    if (!activeDraftArticle) return;

    document.getElementById('draftInitialView').style.display = 'none';
    document.getElementById('draftResultView').style.display = 'block';
    draftLoading.style.display = 'flex';
    postTistoryBtn.disabled = true;

    try {
        const response = await fetch('/api/generate-draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: activeDraftArticle.title,
                description: activeDraftArticle.description
            })
        });
        const data = await response.json();

        draftLoading.style.display = 'none';

        if (data.title && data.content) {
            currentDraft = data;
            draftTitle.value = data.title;
            draftText.value = data.content;
            draftTagList.innerHTML = data.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
            document.getElementById('modalFooter').style.display = 'flex';
            postTistoryBtn.disabled = false;
        } else {
            throw new Error(data.error || 'Invalid draft data');
        }
    } catch (error) {
        draftLoading.style.display = 'none';
        console.error('Draft Error:', error);
        showToast(`AI 초안 생성 실패: ${error.message || '알 수 없는 오류'}`);
        // Go back to initial if failed? Or just keep showing empty result
    }
});

closeModal.addEventListener('click', () => {
    draftModal.classList.remove('show');
    currentDraft = null;
});

copyDraftBtn.addEventListener('click', () => {
    const content = `제목: ${draftTitle.value}\n\n${draftText.value}\n\n태그: ${currentDraft.tags.join(', ')}`;
    navigator.clipboard.writeText(content).then(() => {
        showToast('클립보드에 복사되었습니다!');
    });
});

postTistoryBtn.addEventListener('click', async () => {
    if (!currentDraft) return;

    try {
        const response = await fetch('/api/tistory-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentDraft)
        });
        const data = await response.json();

        if (data.success) {
            showToast('Tistory에 게시되었습니다!');
            draftModal.classList.remove('show');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showToast(`게시 실패: ${error.message}`);
    }
});

// Toast
function showToast(message, duration = 3000) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    // 1. Load data
    loadApiConfigs();
    loadCollection();

    // 2. Setup default dates
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    const pastDate = new Date(today);
    pastDate.setMonth(today.getMonth() - 1);
    const startDate = pastDate.toISOString().split('T')[0];

    ['trend', 'shopping'].forEach(pfx => {
        const startInput = document.getElementById(`${pfx}StartDate`);
        const endInput = document.getElementById(`${pfx}EndDate`);
        if (startInput) startInput.value = startDate;
        if (endInput) endInput.value = endDate;
    });

    // 3. Setup Filter Logic (Check-all <-> Individual)
    document.querySelectorAll('.check-all').forEach(allBtn => {
        const target = allBtn.dataset.target;
        const others = document.querySelectorAll(`input[name="${target}"]`);

        // If 'All' is changed
        allBtn.addEventListener('change', () => {
            if (allBtn.checked) {
                // If All is checked, uncheck individual items for cleaner UI
                others.forEach(o => o.checked = false);
            }
        });

        // If any individual item is changed
        others.forEach(item => {
            item.addEventListener('change', () => {
                if (item.checked) {
                    // If an individual item is checked, uncheck 'All'
                    allBtn.checked = false;
                } else {
                    // If no individual items are checked anymore, re-check 'All'
                    const checkedCount = document.querySelectorAll(`input[name="${target}"]:checked`).length;
                    if (checkedCount === 0) {
                        allBtn.checked = true;
                    }
                }
            });
        });
    });

    // 4. Sidebar Toggle
    const toggleSidebar = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    if (toggleSidebar && sidebar) {
        toggleSidebar.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
});
