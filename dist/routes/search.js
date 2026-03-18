"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/search.ts
const express_1 = require("express");
const searchRepository_1 = require("../repositories/searchRepository");
const recentBooksRepository_1 = require("../repositories/recentBooksRepository");
// ✅ 토큰 기반 인증 미들웨어
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
/**
 * GET /api/search/recent
 * - 최근 검색어 텍스트 리스트
 */
router.get('/recent', auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        // authMiddleware가 있으니 거의 안 들어오지만 방어용
        return res.json({ items: [] });
    }
    const limit = Number((_b = req.query.limit) !== null && _b !== void 0 ? _b : 10);
    try {
        const items = await (0, searchRepository_1.getRecentSearches)(userId, limit);
        return res.json({ items });
    }
    catch (err) {
        console.error('❌ getRecentSearches error', err);
        return res.status(500).json({ message: 'Failed to fetch recent searches' });
    }
});
/**
 * DELETE /api/search/recent
 * - query 파라미터가 있으면 해당 검색어만 삭제
 * - 없으면 전체 삭제
 */
router.delete('/recent', auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const q = (_b = req.query.query) !== null && _b !== void 0 ? _b : undefined;
    try {
        if (q) {
            await (0, searchRepository_1.deleteRecentSearch)(userId, q);
        }
        else {
            await (0, searchRepository_1.clearRecentSearches)(userId);
        }
        return res.status(204).send();
    }
    catch (err) {
        console.error('❌ delete/clear recent searches error', err);
        return res.status(500).json({ message: 'Failed to delete recent searches' });
    }
});
/**
 * GET /api/search/recent-books
 * - 최근 본 책 카드 리스트
 */
router.get('/recent-books', auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return res.json({ items: [] });
    }
    const limit = Number((_b = req.query.limit) !== null && _b !== void 0 ? _b : 10);
    try {
        const items = await (0, recentBooksRepository_1.getRecentBooks)(userId, limit);
        return res.json({ items });
    }
    catch (err) {
        console.error('❌ getRecentBooks error', err);
        return res.status(500).json({ message: 'Failed to fetch recent books' });
    }
});
/**
 * DELETE /api/search/recent-books/:bookId
 * - 특정 책만 최근 목록에서 제거
 */
router.delete('/recent-books/:bookId', auth_1.authMiddleware, async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const { bookId } = req.params;
    try {
        await (0, recentBooksRepository_1.deleteRecentBook)(userId, bookId);
        return res.status(204).send();
    }
    catch (err) {
        console.error('❌ deleteRecentBook error', err);
        return res.status(500).json({ message: 'Failed to delete recent book' });
    }
});
/**
 * DELETE /api/search/recent-books
 * - 최근 본 책 전체 제거
 */
router.delete('/recent-books', auth_1.authMiddleware, async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        await (0, recentBooksRepository_1.clearRecentBooks)(userId);
        return res.status(204).send();
    }
    catch (err) {
        console.error('❌ clearRecentBooks error', err);
        return res.status(500).json({ message: 'Failed to clear recent books' });
    }
});
exports.default = router;
