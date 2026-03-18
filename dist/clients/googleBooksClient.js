"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchGoogleBook = fetchGoogleBook;
// src/clients/googleBooksClient.ts
const node_fetch_1 = __importDefault(require("node-fetch"));
require("dotenv/config");
const GOOGLE_BOOKS_BASE_URL = 'https://www.googleapis.com/books/v1/volumes';
const GOOGLE_BOOKS_API_KEY = (_a = process.env.GOOGLE_BOOKS_API_KEY) !== null && _a !== void 0 ? _a : '';
async function fetchGoogleBook(input) {
    var _a, _b, _c, _d, _e;
    let q = '';
    if (input.isbn13) {
        q = `isbn:${input.isbn13}`;
    }
    else if (input.title) {
        const authorPart = input.authors && input.authors.length > 0
            ? `+inauthor:${encodeURIComponent(input.authors[0])}`
            : '';
        q = `intitle:${encodeURIComponent(input.title)}${authorPart}`;
    }
    else {
        return null;
    }
    const url = new URL(GOOGLE_BOOKS_BASE_URL);
    url.searchParams.set('q', q);
    url.searchParams.set('maxResults', '1');
    if (GOOGLE_BOOKS_API_KEY) {
        url.searchParams.set('key', GOOGLE_BOOKS_API_KEY);
    }
    console.log('🌐 [GoogleBooks] request:', url.toString());
    const res = await (0, node_fetch_1.default)(url.toString());
    if (!res.ok) {
        const text = await res.text();
        console.error('❌ [GoogleBooks] error:', res.status, res.statusText, text);
        return null;
    }
    const data = (await res.json());
    if (!data.items || data.items.length === 0)
        return null;
    const item = data.items[0];
    const volume = item.volumeInfo || {};
    return {
        google_id: item.id,
        title: volume.title,
        authors: (_a = volume.authors) !== null && _a !== void 0 ? _a : [],
        description: volume.description,
        page_count: volume.pageCount,
        categories: (_b = volume.categories) !== null && _b !== void 0 ? _b : [],
        thumbnail_url: (_d = (_c = volume.imageLinks) === null || _c === void 0 ? void 0 : _c.thumbnail) !== null && _d !== void 0 ? _d : (_e = volume.imageLinks) === null || _e === void 0 ? void 0 : _e.smallThumbnail,
        language: volume.language,
    };
}
