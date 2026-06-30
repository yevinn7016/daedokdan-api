"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterAdultBooks = filterAdultBooks;
exports.resolveAdultVerified = resolveAdultVerified;
exports.parseAladinAdult = parseAladinAdult;
const authClient_1 = require("../clients/authClient");
function filterAdultBooks(books, adultVerified) {
    if (adultVerified) {
        return books;
    }
    return books.filter((book) => !book.adult);
}
async function resolveAdultVerified(req) {
    var _a;
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
