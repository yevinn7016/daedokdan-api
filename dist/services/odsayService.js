"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPubTransRoutes = searchPubTransRoutes;
// src/services/odsayService.ts
const axios_1 = __importDefault(require("axios"));
function sanitizeApiKey(v) {
    if (typeof v !== "string")
        return "";
    const trimmed = v.trim();
    // .env에 ODSAY_API_KEY="xxxxx" 형태로 들어가서 따옴표가 값에 포함되는 경우 방지
    const unquoted = trimmed.replace(/^['"](.+)['"]$/, "$1").trim();
    return unquoted;
}
const ODSAY_API_KEY = sanitizeApiKey(process.env.ODSAY_API_KEY);
if (!ODSAY_API_KEY)
    throw new Error("Missing env: ODSAY_API_KEY");
const odsay = axios_1.default.create({
    baseURL: "https://api.odsay.com/v1/api",
    timeout: 8000,
});
async function searchPubTransRoutes(params) {
    const { sx, sy, ex, ey, lang = 0 } = params;
    const { data } = await odsay.get("/searchPubTransPath", {
        params: {
            apiKey: ODSAY_API_KEY,
            SX: sx,
            SY: sy,
            EX: ex,
            EY: ey,
            lang,
            OPT: 0
        },
        headers: {
            "x-forwarded-for": undefined,
        },
    });
    return data;
}
