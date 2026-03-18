"use strict";
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
// src/core/config.ts
require("dotenv/config");
function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`❌ Missing env var: ${name}`);
    }
    return value;
}
exports.config = {
    // 서버
    port: Number((_a = process.env.PORT) !== null && _a !== void 0 ? _a : 4000),
    // 외부 API
    aladinTtbKey: (_b = process.env.ALADIN_TTB_KEY) !== null && _b !== void 0 ? _b : '',
    // 🔥 Firebase (푸시알림)
    // NOTE: 배포 환경에서 푸시를 쓰지 않는 경우도 있으므로 optional로 둡니다.
    // 푸시를 실제로 호출하는 시점에만 (firebaseClient에서) 누락 여부를 검사합니다.
    firebaseProjectId: (_c = process.env.FIREBASE_PROJECT_ID) !== null && _c !== void 0 ? _c : '',
    firebaseClientEmail: (_d = process.env.FIREBASE_CLIENT_EMAIL) !== null && _d !== void 0 ? _d : '',
    firebasePrivateKey: (_e = process.env.FIREBASE_PRIVATE_KEY) !== null && _e !== void 0 ? _e : '',
};
