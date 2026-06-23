"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPubTransRoutes = searchPubTransRoutes;
// src/services/odsayService.ts
const axios_1 = __importDefault(require("axios"));
function sanitizeBaseUrl(v) {
    if (typeof v !== "string")
        return "";
    return v.trim().replace(/\/+$/, "");
}
console.log("[odsay] process.env.ODSAY_PROXY_URL =", process.env.ODSAY_PROXY_URL);
const ODSAY_PROXY_URL = sanitizeBaseUrl(process.env.ODSAY_PROXY_URL);
if (!ODSAY_PROXY_URL)
    throw new Error("Missing env: ODSAY_PROXY_URL");
console.log("[odsay] sanitized proxy base =", ODSAY_PROXY_URL);
const PROXY_TIMEOUT_MS = 30000;
async function searchPubTransRoutes(params) {
    const { sx, sy, ex, ey, lang = 0 } = params;
    console.log("🔥 EC2 호출 시작", `${ODSAY_PROXY_URL}/odsay/searchPubTransPath`);
    const { data } = await axios_1.default.get(`${ODSAY_PROXY_URL}/odsay/searchPubTransPath`, {
        params: {
            sx,
            sy,
            ex,
            ey,
            lang,
        },
        timeout: PROXY_TIMEOUT_MS,
    });
    return data;
}
