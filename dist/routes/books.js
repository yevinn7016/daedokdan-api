"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/books.ts
const express_1 = require("express");
const supabase_js_1 = require("@supabase/supabase-js");
require("dotenv/config");
const aladinClient_1 = require("../clients/aladinClient");
const googleBooksClient_1 = require("../clients/googleBooksClient");
const bookRepository_1 = require("../repositories/bookRepository");
const searchRepository_1 = require("../repositories/searchRepository");
const recentBooksRepository_1 = require("../repositories/recentBooksRepository");
// ✅ 토큰 기반 인증 미들웨어 (named import)
const auth_1 = require("../middlewares/auth");
const supabaseUrl = (_a = process.env.SUPABASE_URL) !== null && _a !== void 0 ? _a : '';
const supabaseServiceRoleKey = (_b = process.env.SUPABASE_SERVICE_ROLE_KEY) !== null && _b !== void 0 ? _b : '';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey);
const router = (0, express_1.Router)();
/**
 * GET /api/search/books?q=검색어
 * - 알라딘 Keyword 검색 + Supabase books upsert
 * - 최근 검색어 저장
 */
router.get('/search/books', auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const q = req.query.q || '';
        if (!q.trim()) {
            return res.status(400).json({ message: 'q(query) is required' });
        }
        const raw = await (0, aladinClient_1.searchBooksFromAladin)(q, 10);
        const items = raw.item || [];
        await (0, bookRepository_1.upsertBooksFromAladinItems)(items);
        const mapped = items.map((it) => ({
            aladin_item_id: String(it.itemId),
            title: it.title,
            author: it.author,
            publisher: it.publisher,
            pubDate: it.pubDate,
            cover: it.cover,
            description: it.description,
            link: it.link,
            isbn: it.isbn13 || it.isbn,
        }));
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: userId not found' });
        }
        (0, searchRepository_1.saveRecentSearch)(userId, q).catch((err) => console.error('❌ failed to save recent search', err));
        return res.json({
            total: raw.totalResults,
            items: mapped,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Aladin search failed' });
    }
});
/**
 * GET /api/books/:itemId
 * - 알라딘 + 구글북스 하이브리드 상세
 * - book_details 저장 + books 업데이트 + 최근 본 책 기록 + 판매처 링크 포함
 */
router.get('/books/:itemId', auth_1.authMiddleware, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1;
    const { itemId } = req.params;
    try {
        const { data: book, error: bookErr } = await supabase
            .from('books')
            .select('*')
            .eq('aladin_item_id', itemId)
            .maybeSingle();
        if (bookErr) {
            console.error('❌ books select error', bookErr);
            return res.status(500).json({ message: 'Database error (books)' });
        }
        if (!book) {
            return res.status(404).json({
                message: 'Book not found in local DB. 먼저 /api/search/books 로 검색해서 저장해야 합니다.',
            });
        }
        const bookId = book.id;
        const isbn13 = book.isbn13;
        const title = book.title;
        const authorsFromDb = book.authors;
        const userIdForRecent = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userIdForRecent) {
            return res.status(401).json({ message: 'Unauthorized: userId not found' });
        }
        (0, recentBooksRepository_1.addRecentBook)(userIdForRecent, bookId).catch((err) => console.error('❌ failed to add recent book', err));
        const { data: detailRow, error: detailErr } = await supabase
            .from('book_details')
            .select('*')
            .eq('book_id', bookId)
            .maybeSingle();
        if (detailErr) {
            console.error('❌ book_details select error', detailErr);
        }
        // 알라딘 상세
        const raw = await (0, aladinClient_1.getBookDetailFromAladin)(itemId);
        const detailItem = raw.item && raw.item[0];
        if (!detailItem) {
            return res.status(404).json({ message: 'No detail info from Aladin' });
        }
        // 페이지 수 / 서브 정보
        const subInfo = (_b = detailItem.subInfo) !== null && _b !== void 0 ? _b : {};
        const authorsArr = Array.isArray(detailItem.authors)
            ? detailItem.authors
            : [];
        const aladinPageCount = typeof subInfo.itemPage === 'number'
            ? subInfo.itemPage
            : subInfo.itemPage
                ? Number(subInfo.itemPage)
                : null;
        // 작가 소개
        let authorIntro = null;
        if (typeof detailItem.authorInfo === 'string' && detailItem.authorInfo.trim()) {
            authorIntro = detailItem.authorInfo.trim();
        }
        if (!authorIntro) {
            for (const a of authorsArr) {
                if (typeof a.authorInfo === 'string' && a.authorInfo.trim()) {
                    authorIntro = a.authorInfo.trim();
                    break;
                }
            }
        }
        // 책 소개
        const rawFullDesc = (_e = (_d = (_c = subInfo.fullDescription) !== null && _c !== void 0 ? _c : detailItem.fullDescription) !== null && _d !== void 0 ? _d : detailItem.description) !== null && _e !== void 0 ? _e : null;
        const aladinDescription = typeof rawFullDesc === 'string' && rawFullDesc.trim()
            ? rawFullDesc
            : null;
        // 출판사 서평
        const rawPublisherReview = (_h = (_g = (_f = subInfo.fullDescription2) !== null && _f !== void 0 ? _f : detailItem.fullDescription2) !== null && _g !== void 0 ? _g : detailItem.publisherReview) !== null && _h !== void 0 ? _h : null;
        const aladinPublisherReview = typeof rawPublisherReview === 'string' && rawPublisherReview.trim()
            ? rawPublisherReview
            : null;
        // 구글북스 보강
        const googleBook = await (0, googleBooksClient_1.fetchGoogleBook)({
            isbn13,
            title,
            authors: authorsFromDb,
        });
        const finalDescription = (_j = aladinDescription !== null && aladinDescription !== void 0 ? aladinDescription : ((googleBook === null || googleBook === void 0 ? void 0 : googleBook.description) && googleBook.description.trim()
            ? googleBook.description
            : null)) !== null && _j !== void 0 ? _j : ((_k = detailRow === null || detailRow === void 0 ? void 0 : detailRow.description) !== null && _k !== void 0 ? _k : null);
        const finalAuthorIntro = (_o = (_l = (authorIntro && authorIntro.trim())) !== null && _l !== void 0 ? _l : ((_m = detailRow === null || detailRow === void 0 ? void 0 : detailRow.author_intro) !== null && _m !== void 0 ? _m : null)) !== null && _o !== void 0 ? _o : null;
        const finalPublisherReview = (_q = aladinPublisherReview !== null && aladinPublisherReview !== void 0 ? aladinPublisherReview : ((_p = detailRow === null || detailRow === void 0 ? void 0 : detailRow.publisher_review) !== null && _p !== void 0 ? _p : null)) !== null && _q !== void 0 ? _q : null;
        let finalPageCount = (_r = book.page_count) !== null && _r !== void 0 ? _r : null;
        if (!finalPageCount && aladinPageCount) {
            finalPageCount = aladinPageCount;
        }
        if (!finalPageCount && (googleBook === null || googleBook === void 0 ? void 0 : googleBook.page_count)) {
            finalPageCount = googleBook.page_count;
        }
        // 카테고리 merge
        const mergedCategories = Array.from(new Set([
            ...((_s = book.categories) !== null && _s !== void 0 ? _s : []),
            ...((_t = googleBook === null || googleBook === void 0 ? void 0 : googleBook.categories) !== null && _t !== void 0 ? _t : []),
        ]));
        // books 업데이트
        const bookUpdate = {};
        if (!book.page_count && finalPageCount) {
            bookUpdate.page_count = finalPageCount;
        }
        if (mergedCategories.length > 0) {
            bookUpdate.categories = mergedCategories;
        }
        if (!book.thumbnail_url && (googleBook === null || googleBook === void 0 ? void 0 : googleBook.thumbnail_url)) {
            bookUpdate.thumbnail_url = googleBook.thumbnail_url;
        }
        if (!book.language && (googleBook === null || googleBook === void 0 ? void 0 : googleBook.language)) {
            bookUpdate.language = googleBook.language;
        }
        if (!book.google_books_id && (googleBook === null || googleBook === void 0 ? void 0 : googleBook.google_id)) {
            bookUpdate.google_books_id = googleBook.google_id;
        }
        if (Object.keys(bookUpdate).length > 0) {
            const { error: bookUpdateErr } = await supabase
                .from('books')
                .update(bookUpdate)
                .eq('id', bookId);
            if (bookUpdateErr) {
                console.error('❌ books update error (merge)', bookUpdateErr);
            }
        }
        // book_details upsert
        const { error: upsertErr } = await supabase
            .from('book_details')
            .upsert({
            book_id: bookId,
            description: finalDescription,
            author_intro: finalAuthorIntro,
            publisher_review: finalPublisherReview,
            last_synced_at: new Date().toISOString(),
        }, { onConflict: 'book_id' });
        if (upsertErr) {
            console.error('❌ book_details upsert error', upsertErr);
        }
        // 판매처 링크
        const purchaseLinks = {
            aladin: (_u = detailItem.link) !== null && _u !== void 0 ? _u : null,
            yes24: isbn13 ? `https://www.yes24.com/search?query=${isbn13}` : null,
            kyobo: isbn13
                ? `https://product.kyobobook.co.kr/search?keyword=${isbn13}`
                : null,
            google_books: (googleBook === null || googleBook === void 0 ? void 0 : googleBook.google_id)
                ? `https://books.google.com/books?id=${googleBook.google_id}`
                : null,
            naver: isbn13
                ? `https://search.shopping.naver.com/book/search?query=${isbn13}`
                : null,
        };
        return res.json({
            ...book,
            aladin_link: (_v = detailItem.link) !== null && _v !== void 0 ? _v : null,
            page_count: finalPageCount,
            categories: mergedCategories,
            thumbnail_url: (_x = (_w = book.thumbnail_url) !== null && _w !== void 0 ? _w : googleBook === null || googleBook === void 0 ? void 0 : googleBook.thumbnail_url) !== null && _x !== void 0 ? _x : null,
            language: (_z = (_y = book.language) !== null && _y !== void 0 ? _y : googleBook === null || googleBook === void 0 ? void 0 : googleBook.language) !== null && _z !== void 0 ? _z : 'ko',
            google_books_id: (_1 = (_0 = book.google_books_id) !== null && _0 !== void 0 ? _0 : googleBook === null || googleBook === void 0 ? void 0 : googleBook.google_id) !== null && _1 !== void 0 ? _1 : null,
            purchase_links: purchaseLinks,
            detail: {
                description: finalDescription,
                author_intro: finalAuthorIntro,
                publisher_review: finalPublisherReview,
            },
        });
    }
    catch (err) {
        console.error('❌ /api/books/:itemId error', err);
        return res.status(500).json({ message: 'Book detail fetch failed' });
    }
});
exports.default = router;
