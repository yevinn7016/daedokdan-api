"use strict";
/** Render 등에서 stdout 로그로 확인 — `.env` / Render Dashboard에 `API_DEBUG_LOGS=1` */
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiDebugEnabled = apiDebugEnabled;
exports.apiDebugLog = apiDebugLog;
function envTruthy(v) {
    if (!v)
        return false;
    const s = v.trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}
function apiDebugEnabled() {
    return envTruthy(process.env.API_DEBUG_LOGS);
}
function apiDebugLog(tag, message, extra) {
    if (!apiDebugEnabled())
        return;
    const payload = extra && Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : '';
    console.log(`[API_DEBUG][${tag}] ${message}${payload}`);
}
