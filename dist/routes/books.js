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
const recommendationService_1 = require("../services/recommendationService");
// GET /api/books/by-pages?range=0-100
router.get("/by-pages", async (req, res) => {
    try {
        const { range = "0-100", limit = "10" } = req.query;
        const books = await (0, recommendationService_1.getBooksByPageRange)(String(range), Number(limit));
        res.json({
            success: true,
            data: { books },
            error: null,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            data: null,
            error: error.message,
        });
    }
});
/**
 * GET /api/books/:itemId
 * - 알라딘 + 구글북스 하이브리드 상세
 * - book_details 저장 + books 업데이트 + 최근 본 책 기록 + 판매처 링크 포함
 */
router.get('/:itemId', auth_1.authMiddleware, async (req, res, next) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
    const { itemId } = req.params;
    if (!/^\d+$/.test(itemId)) {
        return next();
    }
    try {
        let detailItem = null;
        const { data: initialBook, error: bookErr } = await supabase
            .from('books')
            .select('*')
            .or(`aladin_item_id.eq.${itemId},isbn13.eq.${itemId}`)
            .maybeSingle();
        if (bookErr) {
            console.error('❌ books select error', bookErr);
            return res.status(500).json({ message: 'Database error (books)' });
        }
        let book = initialBook;
        if (!book) {
            // DB에 없으면 알라딘 상세로 즉시 조회 후 books upsert 시도
            let bootstrapRaw = await (0, aladinClient_1.getBookDetailFromAladin)(itemId);
            if ((!(bootstrapRaw === null || bootstrapRaw === void 0 ? void 0 : bootstrapRaw.item) || bootstrapRaw.item.length === 0) && /^\d{13}$/.test(itemId)) {
                bootstrapRaw = await (0, aladinClient_1.getBookDetailByIsbnFromAladin)(itemId);
            }
            detailItem = bootstrapRaw.item && bootstrapRaw.item[0];
            if (!detailItem) {
                return res.status(404).json({ message: 'No detail info from Aladin' });
            }
            await (0, bookRepository_1.upsertBooksFromAladinItems)([detailItem]);
            const { data: hydratedBook, error: hydrateErr } = await supabase
                .from('books')
                .select('*')
                .or(`aladin_item_id.eq.${itemId},isbn13.eq.${itemId}`)
                .maybeSingle();
            if (hydrateErr) {
                console.error('❌ books reselect error after upsert', hydrateErr);
                return res.status(500).json({ message: 'Database error (books)' });
            }
            if (!hydratedBook) {
                return res.status(404).json({ message: 'Failed to persist book from Aladin' });
            }
            book = hydratedBook;
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
        // 알라딘 상세 (초기 부트스트랩에서 이미 조회했다면 재사용)
        if (!detailItem) {
            const lookupId = String((_b = book.aladin_item_id) !== null && _b !== void 0 ? _b : itemId);
            let raw = await (0, aladinClient_1.getBookDetailFromAladin)(lookupId);
            if ((!(raw === null || raw === void 0 ? void 0 : raw.item) || raw.item.length === 0) && book.isbn13) {
                raw = await (0, aladinClient_1.getBookDetailByIsbnFromAladin)(String(book.isbn13));
            }
            detailItem = raw.item && raw.item[0];
        }
        if (!detailItem) {
            return res.status(404).json({ message: 'No detail info from Aladin' });
        }
        // 페이지 수 / 서브 정보
        const subInfo = (_c = detailItem.subInfo) !== null && _c !== void 0 ? _c : {};
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
        const rawFullDesc = (_f = (_e = (_d = subInfo.fullDescription) !== null && _d !== void 0 ? _d : detailItem.fullDescription) !== null && _e !== void 0 ? _e : detailItem.description) !== null && _f !== void 0 ? _f : null;
        const aladinDescription = typeof rawFullDesc === 'string' && rawFullDesc.trim()
            ? rawFullDesc
            : null;
        // 출판사 서평
        const rawPublisherReview = (_j = (_h = (_g = subInfo.fullDescription2) !== null && _g !== void 0 ? _g : detailItem.fullDescription2) !== null && _h !== void 0 ? _h : detailItem.publisherReview) !== null && _j !== void 0 ? _j : null;
        const aladinPublisherReview = typeof rawPublisherReview === 'string' && rawPublisherReview.trim()
            ? rawPublisherReview
            : null;
        // 구글북스 보강
        const googleBook = await (0, googleBooksClient_1.fetchGoogleBook)({
            isbn13,
            title,
            authors: authorsFromDb,
        });
        const finalDescription = (_k = aladinDescription !== null && aladinDescription !== void 0 ? aladinDescription : ((googleBook === null || googleBook === void 0 ? void 0 : googleBook.description) && googleBook.description.trim()
            ? googleBook.description
            : null)) !== null && _k !== void 0 ? _k : ((_l = detailRow === null || detailRow === void 0 ? void 0 : detailRow.description) !== null && _l !== void 0 ? _l : null);
        const finalAuthorIntro = (authorIntro === null || authorIntro === void 0 ? void 0 : authorIntro.trim()) ||
            (detailRow === null || detailRow === void 0 ? void 0 : detailRow.author_intro) ||
            null;
        const finalPublisherReview = aladinPublisherReview ||
            (detailRow === null || detailRow === void 0 ? void 0 : detailRow.publisher_review) ||
            null;
        let finalPageCount = (_m = book.page_count) !== null && _m !== void 0 ? _m : null;
        if (!finalPageCount && aladinPageCount) {
            finalPageCount = aladinPageCount;
        }
        if (!finalPageCount && (googleBook === null || googleBook === void 0 ? void 0 : googleBook.page_count)) {
            finalPageCount = googleBook.page_count;
        }
        // 카테고리 merge
        const mergedCategories = Array.from(new Set([
            ...((_o = book.categories) !== null && _o !== void 0 ? _o : []),
            ...((_p = googleBook === null || googleBook === void 0 ? void 0 : googleBook.categories) !== null && _p !== void 0 ? _p : []),
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
            aladin: (_q = detailItem.link) !== null && _q !== void 0 ? _q : null,
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
            aladin_link: (_r = detailItem.link) !== null && _r !== void 0 ? _r : null,
            page_count: finalPageCount,
            categories: mergedCategories,
            thumbnail_url: (_t = (_s = book.thumbnail_url) !== null && _s !== void 0 ? _s : googleBook === null || googleBook === void 0 ? void 0 : googleBook.thumbnail_url) !== null && _t !== void 0 ? _t : null,
            language: (_v = (_u = book.language) !== null && _u !== void 0 ? _u : googleBook === null || googleBook === void 0 ? void 0 : googleBook.language) !== null && _v !== void 0 ? _v : 'ko',
            google_books_id: (_x = (_w = book.google_books_id) !== null && _w !== void 0 ? _w : googleBook === null || googleBook === void 0 ? void 0 : googleBook.google_id) !== null && _x !== void 0 ? _x : null,
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
const aladinService_1 = require("../services/aladinService");
const bookRepository_2 = require("../repositories/bookRepository");
/**
 * 📚 카테고리별 책 조회 API
 * GET /api/books/category?categoryId=51391
 */
router.get("/category", async (req, res) => {
    try {
        const categoryId = Number(req.query.categoryId);
        if (!categoryId) {
            return res.status(400).json({
                success: false,
                error: "categoryId required",
            });
        }
        // 1️⃣ 알라딘에서 가져오기
        const booksFromAladin = await (0, aladinService_1.fetchBooksByCategory)(categoryId);
        // 2️⃣ DB 저장 (중복 방지)
        const savedBooks = await (0, bookRepository_2.upsertBooks)(booksFromAladin);
        // 3️⃣ 응답 구조 맞추기
        const result = savedBooks.map((book) => ({
            id: book.id,
            isbn13: book.isbn13,
            title: book.title,
            authors: book.authors,
            publisher: book.publisher,
            published_date: book.published_date,
            page_count: book.page_count,
            language: book.language,
            categories: book.categories,
            thumbnail_url: book.thumbnail_url,
            google_books_id: book.google_books_id,
            created_at: book.created_at,
            aladin_item_id: book.aladin_item_id,
        }));
        res.json({
            success: true,
            data: {
                books: result,
            },
            error: null,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});
const categoryMap_1 = require("../config/categoryMap");
router.get("/sections", async (req, res) => {
    try {
        const categoryKey = req.query.category;
        const category = categoryMap_1.CATEGORY_MAP[categoryKey];
        if (!category) {
            return res.status(400).json({
                success: false,
                error: "invalid category",
            });
        }
        const ids = category.ids;
        // 🔥 병렬 호출
        const results = await Promise.all(ids.map(async (id) => {
            const [newBooks, bestBooks] = await Promise.all([
                (0, aladinService_1.fetchBooks)(id, "ItemNewAll"),
                (0, aladinService_1.fetchBooks)(id, "Bestseller"),
            ]);
            return {
                newBooks,
                bestBooks,
            };
        }));
        // 🔥 합치기
        const newBooks = results.flatMap((r) => r.newBooks).slice(0, 20);
        const bestBooks = results.flatMap((r) => r.bestBooks).slice(0, 20);
        res.json({
            success: true,
            data: {
                category: category.name,
                sections: [
                    {
                        title: `${category.name} 신작`,
                        books: newBooks,
                    },
                    {
                        title: `${category.name} 베스트`,
                        books: bestBooks,
                    },
                ],
            },
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});
exports.default = router;
