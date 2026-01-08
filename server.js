require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const EXCLUDED_FILE = path.join(__dirname, 'excluded_news.json');
const COLLECTED_FILE = path.join(__dirname, 'collected_news.json');
const API_CONFIGS_FILE = path.join(__dirname, 'api_configs.json');

// Initialize config file with a sample if not exists
if (!fs.existsSync(API_CONFIGS_FILE)) {
    fs.writeFileSync(API_CONFIGS_FILE, JSON.stringify([
        {
            id: 'naver',
            name: '네이버 뉴스 (기본)',
            type: 'naver'
        }
    ], null, 2));
}

app.use(cors());
app.use(express.json());

// Log every request
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(express.static(path.join(__dirname)));

// Debug GET route for generate-draft
app.get('/api/generate-draft', (req, res) => {
    res.status(405).json({ error: 'This endpoint only supports POST requests. Please check main.js logic.' });
});

// Helper to handle JSON files
function readJson(file) {
    if (!fs.existsSync(file)) return [];
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) { return []; }
}

function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Custom API Management
app.get('/api/configs', (req, res) => {
    res.json(readJson(API_CONFIGS_FILE));
});

app.post('/api/configs', (req, res) => {
    const newConfig = req.body;
    const configs = readJson(API_CONFIGS_FILE);
    const index = configs.findIndex(c => c.id === newConfig.id);

    if (index > -1) {
        configs[index] = newConfig;
    } else {
        configs.push({ ...newConfig, id: Date.now().toString() });
    }

    writeJson(API_CONFIGS_FILE, configs);
    res.json({ success: true, configs });
});

app.delete('/api/configs/:id', (req, res) => {
    const configs = readJson(API_CONFIGS_FILE).filter(c => c.id !== req.params.id);
    writeJson(API_CONFIGS_FILE, configs);
    res.json({ success: true });
});

// Unified Search Endpoint
app.get('/api/search', async (req, res) => {
    const { sourceId, query, sort } = req.query;
    const configs = readJson(API_CONFIGS_FILE);
    const config = configs.find(c => c.id === sourceId) || configs.find(c => c.type === 'naver');

    try {
        if (config.type === 'naver') {
            // Existing Naver Logic
            const clientId = process.env.NAVER_CLIENT_ID;
            const clientSecret = process.env.NAVER_CLIENT_SECRET;
            const response = await axios.get('https://openapi.naver.com/v1/search/news.json', {
                params: { query, display: 50, start: 1, sort: sort || 'sim' },
                headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret }
            });
            const excludedLinks = readJson(EXCLUDED_FILE);
            const filteredItems = response.data.items.filter(item => !excludedLinks.includes(item.link));
            return res.json({ items: filteredItems.slice(0, 20) });
        } else {
            // Custom Public API Logic
            const params = {
                [config.keywordParam || 'keyword']: query,
                serviceKey: config.serviceKey,
                _type: 'json', // Common for many data.go.kr APIs
                numOfRows: 20,
                ...config.extraParams
            };

            const response = await axios.get(config.url, { params });

            // Extract items based on custom path (e.g., response.body.items)
            let rawItems = response.data;
            if (config.itemPath) {
                const paths = config.itemPath.split('.');
                paths.forEach(p => { rawItems = rawItems[p]; });
            }

            // Map fields to standard format
            const items = (Array.isArray(rawItems) ? rawItems : []).map(item => ({
                title: item[config.mapTitle || 'title'] || '',
                link: item[config.mapLink || 'link'] || '#',
                description: item[config.mapDesc || 'description'] || '',
                pubDate: item[config.mapDate || 'pubDate'] || new Date().toISOString()
            }));

            const excludedLinks = readJson(EXCLUDED_FILE);
            const filteredItems = items.filter(item => !excludedLinks.includes(item.link));
            res.json({ items: filteredItems });
        }
    } catch (error) {
        console.error('Search Error:', error.message);
        res.status(500).json({ error: `데이터 수집 실패: ${error.message}` });
    }
});

// Proxy endpoint with filtering (Keep for compatibility if needed, but we'll use /api/search)
app.get('/api/news', async (req, res) => {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    const { query, sort } = req.query;

    if (!clientId || !clientSecret || clientId.includes('YOUR_CLIENT_ID')) {
        console.error('Keys missing:', { clientId: !!clientId, clientSecret: !!clientSecret });
        return res.status(400).json({ error: 'Naver API keys are not configured in .env file' });
    }

    try {
        const response = await axios.get('https://openapi.naver.com/v1/search/news.json', {
            params: { query, display: 50, start: 1, sort: sort || 'sim' },
            headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret }
        });

        const excludedLinks = readJson(EXCLUDED_FILE);
        // Filter out excluded articles
        const filteredItems = response.data.items.filter(item => !excludedLinks.includes(item.link));

        res.json({ ...response.data, items: filteredItems.slice(0, 20) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// Exclusion endpoint
app.post('/api/exclude', (req, res) => {
    const { link } = req.body;
    const excluded = readJson(EXCLUDED_FILE);
    if (!excluded.includes(link)) {
        excluded.push(link);
        writeJson(EXCLUDED_FILE, excluded);
    }
    res.json({ success: true });
});

// Collection (Bookmark) endpoints
app.get('/api/collect', (req, res) => {
    res.json(readJson(COLLECTED_FILE));
});

app.post('/api/collect', (req, res) => {
    const article = req.body;
    const collected = readJson(COLLECTED_FILE);
    // Check if already collected by link
    if (!collected.find(a => a.link === article.link)) {
        collected.push({ ...article, collectedAt: new Date() });
        writeJson(COLLECTED_FILE, collected);
    }
    res.json({ success: true });
});

// AI Draft Generation endpoint (Using direct API call for Node compatibility)
app.post('/api/generate-draft', async (req, res) => {
    const { title, description } = req.query.title ? req.query : req.body; // Support both query and body

    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) {
        console.error('Error: GEMINI_API_KEY is missing in .env');
        return res.status(500).json({ error: 'Gemini API 키가 설정되지 않았습니다. .env 파일을 확인해 주세요.' });
    }
    const apiKey = rawKey.trim();

    const cleanTitle = (title || '제목 없음').replace(/<[^>]*>?/gm, '');
    const cleanDesc = (description || '설명 없음').replace(/<[^>]*>?/gm, '');

    // const promptText = `
    // 다음 뉴스 기사 정보를 바탕으로 네이버 블로그 포스팅 초안을 작성해줘.

    // 뉴스 제목: ${cleanTitle}
    // 뉴스 요약: ${cleanDesc}

    // 작성 가이드라인:
    // 1. 블로그 제목: 클릭을 부르는 매력적인 제목.
    // 2. 본문 구조: 서론 - 본론(3가지 포인트) - 결론.
    // 3. 말투: 친절하고 정중한 '~해요' 스타일.
    // 4. 출력 형식: 아래 JSON 형식으로만 답변해줘. 코드 블록 없이 순수 JSON만.
    // {
    //   "title": "추천 블로그 제목",
    //   "content": "블로그 본문 내용 (마크다운 활용)",
    //   "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"]
    // }
    // `;
    const promptText = `
        아래 뉴스 기사 정보를 참고하여, 사람 냄새가 나는 블로그 포스팅 초안을 작성해줘.
        단순 기사 요약이 아니라, 블로그 독자가 이해하기 쉽게 풀어서 설명하는 방식으로 작성해줘.

        [뉴스 정보]
        - 제목: ${cleanTitle}
        - 요약: ${cleanDesc}

        [작성 원칙]
        - 원문 기사 문장을 그대로 복사하지 말고, 반드시 새롭게 재구성할 것
        - AI가 쓴 글처럼 보이지 않도록 자연스러운 문장으로 작성
        - 광고·과장 표현은 사용하지 말 것
        - 사실이 불확실한 내용은 단정적으로 표현하지 말 것

        [본문 작성 가이드]
        1. 블로그 제목
        - 검색과 클릭을 고려한 자연스러운 제목
        - 25자 내외 권장

        2. 서론
        - 뉴스의 핵심 이슈를 일상적인 말투로 간단히 소개
        - 독자의 관심을 끄는 질문 또는 상황 제시

        3. 본론 (3가지 포인트)
        - 각 포인트마다 소제목 사용
        - 소제목은 핵심 내용을 한눈에 알 수 있게 작성
        - 뉴스 내용을 블로그 독자 기준으로 쉽게 설명

        4. 결론
        - 핵심 요약
        - 앞으로의 전망 또는 독자에게 도움이 되는 한 줄 정리

        [말투 및 형식]
        - 말투: 친절하고 정중한 '~해요' 체
        - 문단은 너무 길지 않게 2~3줄 단위로 구성
        - 마크다운 사용 가능 (소제목, 강조, 목록 등)

        [출력 규칙 – 매우 중요]
        - 반드시 아래 JSON 형식으로만 출력
        - 코드 블록(\\\`\\\`\\\`) 사용 금지
        - JSON 외의 텍스트 절대 출력 금지
        - 줄바꿈, 따옴표 깨짐 없이 올바른 JSON 형태 유지

        {
        "title": "추천 블로그 제목",
        "content": "블로그 본문 내용 (마크다운 사용)",
        "tags": ["핵심키워드", "뉴스주제", "이슈", "관련어", "트렌드"]
        }
    `;

    // List of reliable model names for Free Tier
    const models = [
        'gemini-1.5-flash',
        'gemini-flash-latest',
        'gemini-1.5-pro',
        'gemini-pro-latest'
    ];
    let lastError = null;

    for (const modelName of models) {
        try {
            console.log(`[AI] Generating with ${modelName}...`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

            const response = await axios.post(url, {
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: {
                    response_mime_type: "application/json"
                }
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            });

            const aiText = response.data.candidates[0].content.parts[0].text;
            console.log(`[AI] Success from ${modelName}`);

            try {
                // Gemini in JSON mode usually returns a clean string, but we trim just in case
                const draftJson = JSON.parse(aiText.trim());
                return res.json(draftJson);
            } catch (parseErr) {
                console.warn('[AI] Direct parse failed, trying regex extraction...');
                const jsonMatch = aiText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    // Try to fix common AI JSON mistakes: real newlines in strings
                    const cleanedJson = jsonMatch[0].replace(/\n/g, '\\n').replace(/\\n\s*"/g, '"');
                    // This is tricky, a better way is to rely on response_mime_type
                    const draftJson = JSON.parse(jsonMatch[0]);
                    return res.json(draftJson);
                }
                throw parseErr;
            }
        } catch (error) {
            lastError = error;
            const status = error.response ? error.response.status : 'TIMEOUT/NETWORK';
            console.error(`[AI] ${modelName} failed with status: ${status}`);

            if (status !== 404) break; // If it's not a 404 (e.g. 403, 429), don't bother trying other models
        }
    }

    // If we reach here, all attempts failed
    const finalErrorMsg = lastError.response ?
        (lastError.response.data.error ? lastError.response.data.error.message : lastError.message) :
        lastError.message;

    console.error('[AI] Final Error:', finalErrorMsg);
    res.status(500).json({ error: `AI 초안 생성 실패: ${finalErrorMsg}` });
});

// Tistory Posting endpoint
app.post('/api/tistory-post', async (req, res) => {
    const { title, content, tags } = req.body;
    const accessToken = process.env.TISTORY_ACCESS_TOKEN;
    const blogName = process.env.TISTORY_BLOG_NAME;

    if (!accessToken || !blogName) {
        return res.status(400).json({ error: 'Tistory API 설정(Access Token, Blog Name)이 .env 파일에 없습니다.' });
    }

    try {
        // Tistory expects HTML content. Convert basic markdown-ish AI content to HTML.
        // Simple replacement for AI's markdown output
        const htmlContent = content
            .replace(/## (.*)/g, '<h2>$1</h2>')
            .replace(/# (.*)/g, '<h1>$1</h1>')
            .replace(/\n\n/g, '<p></p>')
            .replace(/\n/g, '<br>');

        const response = await axios.post('https://www.tistory.com/apis/post/write', null, {
            params: {
                access_token: accessToken,
                output: 'json',
                blogName: blogName,
                title: title,
                content: htmlContent,
                visibility: 0, // 0: Private (Safe default)
                category: 0,
                tag: tags ? tags.join(',') : ''
            }
        });

        if (response.data.tistory.status === '200') {
            res.json({ success: true, url: response.data.tistory.url });
        } else {
            console.error('Tistory API Error:', response.data.tistory);
            throw new Error(response.data.tistory.error_message || 'Tistory API 응답 오류');
        }
    } catch (error) {
        console.error('Tistory Post Error:', error);
        res.status(500).json({ error: `티스토리 게시 실패: ${error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
