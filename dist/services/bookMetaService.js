"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureBookPageCountByBookId = ensureBookPageCountByBookId;
// src/services/bookMetaService.ts
const db_1 = require("../core/db");
const aladinClient_1 = require("../clients/aladinClient");
async function ensureBookPageCountByBookId(bookId) {
    var _a;
    const { data: book, error } = await db_1.supabase
        .from('books')
        .select('id, isbn13, page_count')
        .eq('id', bookId)
        .maybeSingle();
    if (error || !book) {
        console.error('[ensureBookPageCountByBookId] books query error', error);
        return null;
    }
    // 이미 있으면 그대로
    if (book.page_count && book.page_count > 0) {
        return book.page_count;
    }
    // 없으면 알라딘 상세 호출 (isbn13 기준 예시)
    if (!book.isbn13)
        return null;
    try {
        const detail = await (0, aladinClient_1.getBookDetailFromAladin)(book.isbn13); // 또는 aladin_item_id
        const newPageCount = (_a = detail.page) !== null && _a !== void 0 ? _a : null;
        if (!newPageCount || newPageCount <= 0) {
            return null;
        }
        const { error: updateError } = await db_1.supabase
            .from('books')
            .update({ page_count: newPageCount })
            .eq('id', bookId);
        if (updateError) {
            console.error('[ensureBookPageCountByBookId] update error', updateError);
        }
        return newPageCount;
    }
    catch (e) {
        console.error('[ensureBookPageCountByBookId] external API error', e);
        return null;
    }
}
