"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentReadingByUserId = getCurrentReadingByUserId;
exports.getBookshelfByUserId = getBookshelfByUserId;
exports.addBookToShelf = addBookToShelf;
// src/repositories/userBooksRepository.ts
const db_1 = require("../core/db");
/* -------------------------------------------------------------------------- */
/*                         현재 읽는 책 목록 (READING)                        */
/* -------------------------------------------------------------------------- */
async function getCurrentReadingByUserId(userId) {
    const { data, error } = await db_1.supabase
        .from('user_books')
        .select(`
      id,
      status,
      start_page,
      current_page,
      end_page,
      started_at,
      completed_at,
      updated_at,
      books:book_id (
        id,
        title,
        authors,
        thumbnail_url,
        page_count
      )
    `)
        .eq('user_id', userId)
        .eq('status', 'reading')
        .order('updated_at', { ascending: false });
    if (error) {
        console.error('[userBooksRepository] getCurrentReadingByUserId error', error.message, error.details, error.hint);
        throw error;
    }
    if (!data)
        return [];
    return data.map((row) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        const pageCount = (_c = (_a = row.end_page) !== null && _a !== void 0 ? _a : (_b = row.books) === null || _b === void 0 ? void 0 : _b.page_count) !== null && _c !== void 0 ? _c : null;
        const currentPage = (_d = row.current_page) !== null && _d !== void 0 ? _d : 0;
        const progress = pageCount && pageCount > 0 ? (currentPage / pageCount) * 100 : 0;
        const item = {
            userBookId: row.id,
            bookId: (_e = row.books) === null || _e === void 0 ? void 0 : _e.id,
            title: (_g = (_f = row.books) === null || _f === void 0 ? void 0 : _f.title) !== null && _g !== void 0 ? _g : '제목 없음',
            authors: (_j = (_h = row.books) === null || _h === void 0 ? void 0 : _h.authors) !== null && _j !== void 0 ? _j : null,
            coverUrl: (_l = (_k = row.books) === null || _k === void 0 ? void 0 : _k.thumbnail_url) !== null && _l !== void 0 ? _l : null,
            startPage: (_m = row.start_page) !== null && _m !== void 0 ? _m : null,
            currentPage,
            endPage: (_o = row.end_page) !== null && _o !== void 0 ? _o : null,
            pageCount,
            progress,
        };
        return item;
    });
}
/* -------------------------------------------------------------------------- */
/*                           책장 전체 조회 (BOOKSHELF)                       */
/* -------------------------------------------------------------------------- */
async function getBookshelfByUserId(userId) {
    var _a;
    const { data, error } = await db_1.supabase
        .from('user_books')
        .select(`
      id,
      status,
      start_page,
      current_page,
      end_page,
      started_at,
      completed_at,
      updated_at,
      books:book_id (
        id,
        title,
        authors,
        thumbnail_url,
        page_count
      )
    `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
    if (error) {
        console.error('[userBooksRepository] getBookshelfByUserId error', error.message, error.details, error.hint);
    }
    const grouped = {
        reading: [],
        planned: [],
        completed: [],
        dropped: [],
    };
    ((_a = data) !== null && _a !== void 0 ? _a : []).forEach((row) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        const status = row.status;
        const pageCount = (_c = (_a = row.end_page) !== null && _a !== void 0 ? _a : (_b = row.books) === null || _b === void 0 ? void 0 : _b.page_count) !== null && _c !== void 0 ? _c : null;
        const currentPage = (_d = row.current_page) !== null && _d !== void 0 ? _d : 0;
        const progress = pageCount && pageCount > 0 ? (currentPage / pageCount) * 100 : 0;
        const item = {
            userBookId: row.id,
            bookId: (_e = row.books) === null || _e === void 0 ? void 0 : _e.id,
            title: (_g = (_f = row.books) === null || _f === void 0 ? void 0 : _f.title) !== null && _g !== void 0 ? _g : '제목 없음',
            authors: (_j = (_h = row.books) === null || _h === void 0 ? void 0 : _h.authors) !== null && _j !== void 0 ? _j : null,
            coverUrl: (_l = (_k = row.books) === null || _k === void 0 ? void 0 : _k.thumbnail_url) !== null && _l !== void 0 ? _l : null,
            startPage: (_m = row.start_page) !== null && _m !== void 0 ? _m : null,
            currentPage,
            endPage: (_o = row.end_page) !== null && _o !== void 0 ? _o : null,
            pageCount,
            progress,
            status,
            completedAt: (_p = row.completed_at) !== null && _p !== void 0 ? _p : null,
            startedAt: (_q = row.started_at) !== null && _q !== void 0 ? _q : null,
        };
        if (!grouped[status]) {
            grouped[status] = [];
        }
        grouped[status].push(item);
    });
    return grouped;
}
/* -------------------------------------------------------------------------- */
/*                      책을 내 서재에 담기 (ADD TO BOOKSHELF)               */
/* -------------------------------------------------------------------------- */
async function addBookToShelf(userId, bookId) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
    // 1) 이미 담겨 있는지 확인
    const { data: existing } = await db_1.supabase
        .from('user_books')
        .select(`
      id,
      status,
      start_page,
      current_page,
      end_page,
      started_at,
      completed_at,
      books:book_id (
        id,
        title,
        authors,
        thumbnail_url,
        page_count
      )
    `)
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .maybeSingle();
    if (existing) {
        const row = existing;
        const pageCount = (_c = (_a = row.end_page) !== null && _a !== void 0 ? _a : (_b = row.books) === null || _b === void 0 ? void 0 : _b.page_count) !== null && _c !== void 0 ? _c : null;
        const currentPage = (_d = row.current_page) !== null && _d !== void 0 ? _d : 0;
        const progress = pageCount && pageCount > 0 ? (currentPage / pageCount) * 100 : 0;
        const item = {
            userBookId: row.id,
            bookId: (_e = row.books) === null || _e === void 0 ? void 0 : _e.id,
            title: (_g = (_f = row.books) === null || _f === void 0 ? void 0 : _f.title) !== null && _g !== void 0 ? _g : '제목 없음',
            authors: (_j = (_h = row.books) === null || _h === void 0 ? void 0 : _h.authors) !== null && _j !== void 0 ? _j : null,
            coverUrl: (_l = (_k = row.books) === null || _k === void 0 ? void 0 : _k.thumbnail_url) !== null && _l !== void 0 ? _l : null,
            startPage: (_m = row.start_page) !== null && _m !== void 0 ? _m : null,
            currentPage,
            endPage: (_o = row.end_page) !== null && _o !== void 0 ? _o : null,
            pageCount,
            progress,
            status: row.status,
            completedAt: (_p = row.completed_at) !== null && _p !== void 0 ? _p : null,
            startedAt: (_q = row.started_at) !== null && _q !== void 0 ? _q : null,
        };
        return { item, alreadyExists: true };
    }
    // 2) books 테이블 정보 가져오기
    const { data: bookRows, error: bookError } = await db_1.supabase
        .from('books')
        .select('id, title, authors, thumbnail_url, page_count')
        .eq('id', bookId);
    if (bookError || !bookRows || bookRows.length === 0) {
        console.error('[addBookToShelf] book not found', bookError);
        throw bookError !== null && bookError !== void 0 ? bookError : new Error('Book not found');
    }
    const book = bookRows[0];
    const endPage = (_r = book.page_count) !== null && _r !== void 0 ? _r : null;
    // 3) user_books에 insert
    const { data: insertedRows, error: insertError } = await db_1.supabase
        .from('user_books')
        .insert({
        user_id: userId,
        book_id: bookId,
        status: 'planned',
        start_page: 1,
        current_page: 0,
        end_page: endPage,
    })
        .select(`
      id,
      status,
      start_page,
      current_page,
      end_page,
      started_at,
      completed_at
    `);
    if (insertError || !insertedRows || insertedRows.length === 0) {
        console.error('[addBookToShelf] insert error', insertError);
        throw insertError !== null && insertError !== void 0 ? insertError : new Error('Failed to insert user_book');
    }
    const inserted = insertedRows[0];
    const item = {
        userBookId: inserted.id,
        bookId: book.id,
        title: (_s = book.title) !== null && _s !== void 0 ? _s : '제목 없음',
        authors: (_t = book.authors) !== null && _t !== void 0 ? _t : null,
        coverUrl: (_u = book.thumbnail_url) !== null && _u !== void 0 ? _u : null,
        startPage: (_v = inserted.start_page) !== null && _v !== void 0 ? _v : null,
        currentPage: (_w = inserted.current_page) !== null && _w !== void 0 ? _w : 0,
        endPage: (_x = inserted.end_page) !== null && _x !== void 0 ? _x : null,
        pageCount: (_y = book.page_count) !== null && _y !== void 0 ? _y : null,
        progress: 0,
        status: inserted.status,
        completedAt: (_z = inserted.completed_at) !== null && _z !== void 0 ? _z : null,
        startedAt: (_0 = inserted.started_at) !== null && _0 !== void 0 ? _0 : null,
    };
    return { item, alreadyExists: false };
}
