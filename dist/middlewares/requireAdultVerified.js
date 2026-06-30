"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdultVerified = requireAdultVerified;
const authClient_1 = require("../clients/authClient");
const adultBookFilter_1 = require("../utils/adultBookFilter");
/**
 * 성인 도서 접근 시 인증 여부 확인.
 * HIDE_ADULT_BOOKS 모드(기본)면 404, 미인증이면 403.
 */
async function requireAdultVerified(res, userId, isAdult) {
    if (!isAdult) {
        return true;
    }
    if ((0, adultBookFilter_1.isAdultContentHidden)()) {
        res.status(404).json({ message: 'Book not found' });
        return false;
    }
    if (!userId) {
        res.status(403).json({
            error: 'ADULT_VERIFICATION_REQUIRED',
            message: '성인 인증이 필요합니다.',
        });
        return false;
    }
    const verified = await (0, authClient_1.isUserAdultVerified)(userId);
    if (!verified) {
        res.status(403).json({
            error: 'ADULT_VERIFICATION_REQUIRED',
            message: '성인 인증이 필요합니다.',
        });
        return false;
    }
    return true;
}
