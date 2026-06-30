"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdultVerified = requireAdultVerified;
const authClient_1 = require("../clients/authClient");
/**
 * 성인 도서 접근 시 인증 여부 확인.
 * 접근 불가 시 403 응답을 보내고 false 반환.
 */
async function requireAdultVerified(res, userId, isAdult) {
    if (!isAdult) {
        return true;
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
