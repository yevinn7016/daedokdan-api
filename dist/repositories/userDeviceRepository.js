"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDeviceToken = saveDeviceToken;
exports.deleteDeviceToken = deleteDeviceToken;
exports.getUserTokens = getUserTokens;
exports.getAllTokens = getAllTokens;
const db_1 = require("../core/db");
// ✅ 토큰 저장 (UPSERT)
async function saveDeviceToken(userId, token) {
    const { error } = await db_1.supabase
        .from("user_devices")
        .upsert({
        user_id: userId,
        fcm_token: token,
    }, {
        onConflict: "fcm_token",
    });
    if (error)
        throw error;
}
// ✅ 토큰 삭제
async function deleteDeviceToken(token) {
    const { error } = await db_1.supabase
        .from("user_devices")
        .delete()
        .eq("fcm_token", token);
    if (error)
        throw error;
}
// ✅ 특정 유저 토큰 조회
async function getUserTokens(userId) {
    const { data, error } = await db_1.supabase
        .from("user_devices")
        .select("fcm_token")
        .eq("user_id", userId);
    if (error)
        throw error;
    return (data !== null && data !== void 0 ? data : []).map((row) => row.fcm_token);
}
// ✅ 전체 토큰 조회
async function getAllTokens() {
    const { data, error } = await db_1.supabase
        .from("user_devices")
        .select("fcm_token")
        .not("fcm_token", "is", null);
    if (error)
        throw error;
    // 중복 제거
    const tokens = (data !== null && data !== void 0 ? data : []).map((row) => row.fcm_token);
    return [...new Set(tokens)];
}
