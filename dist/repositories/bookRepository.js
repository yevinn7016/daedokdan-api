"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertBooksFromAladinItems = upsertBooksFromAladinItems;
// src/repositories/bookRepository.ts
require("dotenv/config");
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = (_a = process.env.SUPABASE_URL) !== null && _a !== void 0 ? _a : '';
const supabaseServiceRoleKey = (_b = process.env.SUPABASE_SERVICE_ROLE_KEY) !== null && _b !== void 0 ? _b : '';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey);
/**
 * 알라딘 ItemSearch 결과를 Supabase books 테이블에 upsert
 */
async function upsertBooksFromAladinItems(items) {
    if (!items || items.length === 0)
        return;
    const rows = items.map((it) => {
        var _a, _b, _c, _d, _e, _f;
        const authors = it.author
            ? String(it.author)
                .split(',')
                .map((s) => s.trim())
                .filter((s) => !!s)
            : [];
        const categories = it.categoryName
            ? [String(it.categoryName)]
            : [];
        return {
            // books 테이블 컬럼 이름에 맞게 수정
            aladin_item_id: String(it.itemId),
            isbn13: (_b = (_a = it.isbn13) !== null && _a !== void 0 ? _a : it.isbn) !== null && _b !== void 0 ? _b : null,
            title: (_c = it.title) !== null && _c !== void 0 ? _c : null,
            authors,
            publisher: (_d = it.publisher) !== null && _d !== void 0 ? _d : null,
            published_date: (_e = it.pubDate) !== null && _e !== void 0 ? _e : null,
            page_count: null, // 상세에서 채움
            language: 'ko',
            categories,
            thumbnail_url: (_f = it.cover) !== null && _f !== void 0 ? _f : null,
        };
    });
    const { error } = await supabase
        .from('books')
        .upsert(rows, { onConflict: 'aladin_item_id' });
    if (error) {
        console.error('❌ books upsert error', error);
        throw error;
    }
}
