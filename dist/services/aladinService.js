"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchBooks = fetchBooks;
exports.fetchBooksByCategory = fetchBooksByCategory;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../core/config");
const BASE_URL = "https://www.aladin.co.kr/ttb/api/ItemList.aspx";
async function fetchBooks(categoryId, queryType = "Bestseller", maxResults = 10, start = 1) {
    var _a;
    const res = await axios_1.default.get(BASE_URL, {
        params: {
            TTBKey: config_1.config.aladinTtbKey,
            QueryType: queryType,
            CategoryId: categoryId,
            MaxResults: maxResults,
            start,
            SearchTarget: "Book",
            Output: "JS",
            Version: "20131101",
        },
    });
    const items = Array.isArray((_a = res.data) === null || _a === void 0 ? void 0 : _a.item) ? res.data.item : [];
    return items.map((item) => ({
        aladin_item_id: item.itemId,
        isbn13: item.isbn13,
        title: item.title,
        authors: item.author ? item.author.split(",") : [],
        publisher: item.publisher,
        published_date: item.pubDate,
        page_count: 0, // 알라딘 기본 없음 → 추후 detail API로 보완
        language: "ko",
        categories: [item.categoryName],
        thumbnail_url: item.cover,
        google_books_id: null,
        adult: Boolean(item.adult),
    }));
}
async function fetchBooksByCategory(categoryId) {
    return fetchBooks(categoryId, "Bestseller", 15);
}
