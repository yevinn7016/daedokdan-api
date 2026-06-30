"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdultContentHidden = isAdultContentHidden;
exports.filterAdultBooks = filterAdultBooks;
exports.resolveAdultVerified = resolveAdultVerified;
exports.parseAladinAdult = parseAladinAdult;
const authClient_1 = require("../clients/authClient");
/**
 * 성인 도서 전면 비노출 모드.
 * 기본값 true — HIDE_ADULT_BOOKS=false 일 때만 인증 완료 사용자에게 노출.
 */
function isAdultContentHidden() {
    return process.env.HIDE_ADULT_BOOKS !== 'false';
}
function filterAdultBooks(books, adultVerified) {
    if (adultVerified) {
        return books;
    }
    return books.filter((book) => !book.adult);
}
async function resolveAdultVerified(req) {
    var _a;
    if (isAdultContentHidden()) {
        return false;
    }
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return false;
    }
    return (0, authClient_1.isUserAdultVerified)(userId);
}
function parseAladinAdult(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (Array.isArray(value)) {
        return parseAladinAdult(value[0]);
    }
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }
    return false;
}
