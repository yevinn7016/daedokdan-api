"use strict";
// src/services/rankingService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookRanking = getBookRanking;
const aladinClient_1 = require("../clients/aladinClient");
async function getBookRanking() {
    const items = await (0, aladinClient_1.fetchBestSellers)();
    // ✅ 여기 추가
    if (!items || !Array.isArray(items)) {
        console.error("❌ items 없음:", items);
        return [];
    }
    return items.map((item, index) => {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return ({
            rank: index + 1,
            bookId: (_b = (_a = item.isbn13) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : "",
            title: (_d = (_c = item.title) === null || _c === void 0 ? void 0 : _c[0]) !== null && _d !== void 0 ? _d : "",
            authors: (_f = (_e = item.author) === null || _e === void 0 ? void 0 : _e[0]) !== null && _f !== void 0 ? _f : "",
            coverUrl: (_h = (_g = item.cover) === null || _g === void 0 ? void 0 : _g[0]) !== null && _h !== void 0 ? _h : "",
        });
    });
}
