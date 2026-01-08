const searchBtn = document.getElementById('searchBtn');
const keywordInput = document.getElementById('keyword');
const sortSelect = document.getElementById('sort');
const resultsArea = document.getElementById('resultsArea');
const statusText = document.getElementById('statusText');
const toast = document.getElementById('toast');

const collectBtn = document.getElementById('collectViewBtn');

const sourceSelect = document.getElementById('source');
const manageApisBtn = document.getElementById('manageApisBtn');
const apiModal = document.getElementById('apiModal');
const closeApiModal = document.getElementById('closeApiModal');
const apiConfigForm = document.getElementById('apiConfigForm');
const apiConfigList = document.getElementById('apiConfigList');

let currentArticles = [];

searchBtn.addEventListener('click', () => {
    const keyword = keywordInput.value.trim();
    const sort = sortSelect.value;
    const sourceId = sourceSelect.value;

    if (!keyword) {
        showToast('키워드를 입력해 주세요.');
        return;
    }

    fetchNews(keyword, sort, sourceId);
});

// Load API Configurations and populate source select
async function loadApiConfigs() {
    try {
        const response = await fetch('/api/configs');
        const configs = await response.json();

        // Populate Source Select
        sourceSelect.innerHTML = configs.map(c =>
            `<option value="${c.id}" ${c.type === 'naver' ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        // Populate Modal List
        apiConfigList.innerHTML = configs.filter(c => c.type !== 'naver').map(c => `
            <div class="api-config-item">
                <div class="api-info">
                    <h4>${c.name}</h4>
                    <p>${c.url}</p>
                </div>
                <div class="api-actions">
                    <button class="btn-small btn-edit" onclick="editApiConfig('${c.id}')">수정</button>
                    <button class="btn-small btn-delete" onclick="deleteApiConfig('${c.id}')">삭제</button>
                </div>
            </div>
        `).join('') || '<div class="empty-state">등록된 커스텀 API가 없습니다.</div>';

        window.currentConfigs = configs;
    } catch (error) {
        console.error('Failed to load configs:', error);
    }
}

// Manage API Modal
manageApisBtn.addEventListener('click', () => {
    loadApiConfigs();
    apiModal.classList.add('show');
});

closeApiModal.addEventListener('click', () => {
    apiModal.classList.remove('show');
    apiConfigForm.reset();
    document.getElementById('configId').value = '';
});

// Save API Config
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

async function fetchNews(query, sort, sourceId = 'naver') {
    statusText.textContent = '수집 중...';
    resultsArea.innerHTML = '<div class="empty-state">데이터를 가져오는 중입니다...</div>';

    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&sort=${sort}&sourceId=${sourceId}`);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            currentArticles = data.items;
            renderNews(data.items);
            statusText.textContent = `${data.items.length}개의 데이터 수집 완료`;
        } else {
            resultsArea.innerHTML = '<div class="empty-state">검색 결과가 없습니다.</div>';
            statusText.textContent = '결과 없음';
        }
    } catch (error) {
        resultsArea.innerHTML = `<div class="empty-state">에러가 발생했습니다: ${error.message}</div>`;
        statusText.textContent = '에러 발생';
    }
}

// Initial Load
loadApiConfigs();

// View Collection
collectBtn.addEventListener('click', async () => {
    statusText.textContent = '수집함 불러오는 중...';
    try {
        const response = await fetch('/api/collect');
        const data = await response.json();
        renderNews(data, true); // true for 'collection view'
        statusText.textContent = `수집함: ${data.length}개의 기사`;
    } catch (error) {
        showToast('수집함을 불러오지 못했습니다.');
    }
});

const draftModal = document.getElementById('draftModal');
const closeModal = document.getElementById('closeModal');
const copyDraftBtn = document.getElementById('copyDraftBtn');
const draftLoading = document.getElementById('draftLoading');
const draftTitle = document.getElementById('draftTitle');
const draftText = document.getElementById('draftText');
const draftTagList = document.getElementById('draftTagList');

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
        }
    } catch (error) {
        showToast('저장 중 오류가 발생했습니다.');
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

function renderNews(items, isCollection = false) {
    resultsArea.innerHTML = '';
    if (items.length === 0) {
        resultsArea.innerHTML = '<div class="empty-state">표시할 기사가 없습니다.</div>';
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
                    ${!isCollection ? `<button class="save-btn" onclick="saveForBlog('${item.link}')">수집함 담기</button>` : '<span class="saved-badge">저장됨</span>'}
                    ${isCollection ? `<button class="btn-ai" onclick="generateAIDraft('${index}')">AI 초안 생성시작</button>` : ''}
                </div>
            </div>
        `;
        resultsArea.appendChild(card);
    });

    // Store items in a temporary global variable to access by index in current view
    window.currentViewItems = items;
}

const postTistoryBtn = document.getElementById('postTistoryBtn');

let currentDraft = null; // Store current AI draft data

window.generateAIDraft = async (index) => {
    const article = window.currentViewItems[index];
    if (!article) {
        console.error('Article not found at index:', index);
        return;
    }

    console.log('Generating draft for:', article.title);

    // Show Modal
    draftModal.classList.add('show');
    draftLoading.style.display = 'flex';
    postTistoryBtn.disabled = true;

    try {
        const response = await fetch('/api/generate-draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: article.title, description: article.description })
        });

        console.log('Server response status:', response.status);

        const data = await response.json();

        if (!response.ok) {
            console.error('Server error data:', data);
            throw new Error(data.error || 'Unknown server error');
        }

        draftTitle.value = data.title;
        draftText.value = data.content;
        draftTagList.innerHTML = data.tags.map(tag => `<span class="tag">#${tag}</span>`).join('');

        // Store for Tistory posting
        currentDraft = data;
        postTistoryBtn.disabled = false;

        draftLoading.style.display = 'none';
        showToast('AI 블로그 초안이 생성되었습니다!');
    } catch (error) {
        console.error('Generation Error Detail:', error);
        showToast(`오류 발생: ${error.message}`);
        draftModal.classList.remove('show');
    }
};

postTistoryBtn.addEventListener('click', async () => {
    if (!currentDraft) return;

    const originalText = postTistoryBtn.textContent;
    postTistoryBtn.textContent = '게시 중...';
    postTistoryBtn.disabled = true;

    try {
        const response = await fetch('/api/tistory-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: draftTitle.value,
                content: draftText.value,
                tags: currentDraft.tags
            })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('티스토리에 게시되었습니다! (비공개)');
            window.open(data.url, '_blank');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showToast(`게시 실패: ${error.message}`);
    } finally {
        postTistoryBtn.textContent = originalText;
        postTistoryBtn.disabled = false;
    }
});

closeModal.addEventListener('click', () => {
    draftModal.classList.remove('show');
});

copyDraftBtn.addEventListener('click', () => {
    const textToCopy = `제목: ${draftTitle.value}\n\n본문:\n${draftText.value}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('클립보드에 복사되었습니다!');
    });
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === draftModal) {
        draftModal.classList.remove('show');
    }
});

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
