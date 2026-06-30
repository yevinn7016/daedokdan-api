"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUserAdultVerified = isUserAdultVerified;
const node_fetch_1 = __importDefault(require("node-fetch"));
const db_1 = require("../core/db");
/**
 * 사용자 성인 인증 여부 조회
 * - AUTH_SERVICE_URL 설정 시 auth 내부 API 호출
 * - 미설정 시 동일 Supabase users.adult_verified 직접 조회 (로컬 개발용)
 */
async function isUserAdultVerified(userId) {
    var _a;
    const authServiceUrl = process.env.AUTH_SERVICE_URL;
    if (authServiceUrl) {
        try {
            const res = await (0, node_fetch_1.default)(`${authServiceUrl}/api/internal/users/${userId}/adult-status`, {
                headers: {
                    'X-Internal-Api-Key': (_a = process.env.INTERNAL_API_KEY) !== null && _a !== void 0 ? _a : '',
                },
            });
            if (!res.ok) {
                console.error('[authClient] adult-status failed', res.status);
                return false;
            }
            const data = (await res.json());
            return Boolean(data.adultVerified);
        }
        catch (err) {
            console.error('[authClient] adult-status error', err);
            return false;
        }
    }
    const { data, error } = await db_1.supabase
        .from('users')
        .select('adult_verified')
        .eq('id', userId)
        .maybeSingle();
    if (error) {
        console.error('[authClient] users.adult_verified query error', error);
        return false;
    }
    return Boolean(data === null || data === void 0 ? void 0 : data.adult_verified);
}
