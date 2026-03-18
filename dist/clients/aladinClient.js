"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchBooksFromAladin = searchBooksFromAladin;
exports.getBookDetailFromAladin = getBookDetailFromAladin;
exports.getBookDetailByIsbnFromAladin = getBookDetailByIsbnFromAladin;
exports.fetchBestSellers = fetchBestSellers;
// src/clients/aladinClient.ts
const node_fetch_1 = __importDefault(require("node-fetch"));
require("dotenv/config");
const ALADIN_TTB_KEY = (_a = process.env.ALADIN_TTB_KEY) !== null && _a !== void 0 ? _a : '';
const BASE_URL = 'https://www.aladin.co.kr/ttb/api';
if (!ALADIN_TTB_KEY) {
    console.warn('⚠️ ALADIN_TTB_KEY 가 .env 에 설정되지 않았습니다.');
}
async function searchBooksFromAladin(q, maxResults = 10) {
    const url = new URL(`${BASE_URL}/ItemSearch.aspx`);
    url.searchParams.set('TTBKey', ALADIN_TTB_KEY);
    url.searchParams.set('Query', q);
    url.searchParams.set('QueryType', 'Keyword'); // 제목+저자+출판사 등 통합 검색
    url.searchParams.set('MaxResults', String(maxResults));
    url.searchParams.set('SearchTarget', 'Book');
    url.searchParams.set('Output', 'JS');
    url.searchParams.set('Cover', 'Big');
    url.searchParams.set('Version', '20131101');
    console.log('🔍 [Aladin] ItemSearch URL:', url.toString());
    const res = await (0, node_fetch_1.default)(url.toString());
    if (!res.ok) {
        const text = await res.text();
        console.error('[Aladin] search error:', res.status, res.statusText, text);
        throw new Error('Aladin search failed');
    }
    const data = (await res.json());
    return data;
}
// src/clients/aladinClient.ts
async function getBookDetailFromAladin(id) {
    var _a;
    const TTBKey = (_a = process.env.ALADIN_TTB_KEY) !== null && _a !== void 0 ? _a : '';
    // ✅ 13자리 숫자면 ISBN13, 아니면 상품번호(ItemId)로 가정
    const isIsbn13 = /^\d{13}$/.test(id);
    const params = new URLSearchParams({
        TTBKey,
        ItemId: id,
        ItemIdType: isIsbn13 ? 'ISBN13' : 'ItemId',
        Output: 'JS',
        Cover: 'Big',
        Version: '20131101',
    });
    const url = `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?${params.toString()}`;
    console.log('📖 [Aladin] ItemLookUp URL:', url);
    const res = await (0, node_fetch_1.default)(url);
    const data = await res.json();
    return data;
}
// ✅ 신규: ISBN13 전용
async function getBookDetailByIsbnFromAladin(isbn13) {
    var _a;
    const params = new URLSearchParams({
        TTBKey: (_a = process.env.ALADIN_TTB_KEY) !== null && _a !== void 0 ? _a : '',
        ItemId: isbn13,
        ItemIdType: 'ISBN13', // ✅ 여기 다름
        Output: 'JS',
        Cover: 'Big',
        Version: '20131101',
    });
    const url = `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?${params.toString()}`;
    console.log('📖 [Aladin] ItemLookUp(ISBN13) URL:', url);
    const res = await (0, node_fetch_1.default)(url);
    const data = await res.json();
    return data;
}
// src/clients/aladinClient.ts
// src/clients/aladinClient.ts
// src/clients/aladinClient.ts
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = require("xml2js");
const config_1 = require("../core/config");
// 🔥 베스트셀러 (랭킹용)
async function fetchBestSellers() {
    var _a, _b;
    const url = "https://www.aladin.co.kr/ttb/api/ItemList.aspx";
    const res = await axios_1.default.get(url, {
        params: {
            TTBKey: config_1.config.aladinTtbKey,
            QueryType: "Bestseller",
            MaxResults: 10,
            start: 1,
            SearchTarget: "Book",
            Output: "XML",
            Version: "20131101",
        },
        headers: {
            "User-Agent": "Mozilla/5.0", // 🔥 핵심
        },
        responseType: "text",
    });
    console.log("🔥 raw XML:", res.data);
    const parsed = await (0, xml2js_1.parseStringPromise)(res.data);
    console.log("🔥 parsed:", parsed);
    return (_b = (_a = parsed === null || parsed === void 0 ? void 0 : parsed.object) === null || _a === void 0 ? void 0 : _a.item) !== null && _b !== void 0 ? _b : [];
}
