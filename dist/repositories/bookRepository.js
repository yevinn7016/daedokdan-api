"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertBooksFromAladinItems = upsertBooksFromAladinItems;
exports.findBooksByPageRange = findBooksByPageRange;
exports.upsertBooks = upsertBooks;
// src/repositories/bookRepository.ts
const db_1 = require("../core/db");
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
                .split(",")
                .map((s) => s.trim())
                .filter((s) => !!s)
            : [];
        const categories = it.categoryName ? [String(it.categoryName)] : [];
        return {
            aladin_item_id: String(it.itemId),
            isbn13: (_b = (_a = it.isbn13) !== null && _a !== void 0 ? _a : it.isbn) !== null && _b !== void 0 ? _b : null,
            title: (_c = it.title) !== null && _c !== void 0 ? _c : null,
            authors,
            publisher: (_d = it.publisher) !== null && _d !== void 0 ? _d : null,
            published_date: (_e = it.pubDate) !== null && _e !== void 0 ? _e : null,
            page_count: null,
            language: "ko",
            categories,
            thumbnail_url: (_f = it.cover) !== null && _f !== void 0 ? _f : null,
            adult: Boolean(it.adult),
        };
    });
    const { error } = await db_1.supabase
        .from("books")
        .upsert(rows, { onConflict: "aladin_item_id" });
    if (error) {
        console.error("❌ books upsert error", error);
        throw error;
    }
}
async function findBooksByPageRange(min, max, limit = 20) {
    let query = db_1.supabase
        .from("books")
        .select("*")
        .gte("page_count", min)
        .limit(limit);
    if (max) {
        query = query.lte("page_count", max);
    }
    const { data, error } = await query;
    if (error) {
        throw new Error(error.message);
    }
    return data !== null && data !== void 0 ? data : [];
}
async function upsertBooks(books) {
    const { data, error } = await db_1.supabase
        .from("books")
        .upsert(books, { onConflict: "aladin_item_id" })
        .select();
    if (error)
        throw error;
    return data;
}
