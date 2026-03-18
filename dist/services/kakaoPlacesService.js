"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPlacesByKeyword = searchPlacesByKeyword;
// src/services/kakaoPlacesService.ts
const axios_1 = __importDefault(require("axios"));
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
if (!KAKAO_REST_API_KEY)
    throw new Error("Missing env: KAKAO_REST_API_KEY");
const kakao = axios_1.default.create({
    baseURL: "https://dapi.kakao.com",
    timeout: 8000,
    headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
    },
});
async function searchPlacesByKeyword(query, size = 10) {
    var _a, _b;
    const q = (query !== null && query !== void 0 ? query : "").trim();
    if (!q)
        return [];
    try {
        const { data } = await kakao.get("/v2/local/search/keyword.json", {
            params: { query: q, size },
        });
        const docs = Array.isArray(data === null || data === void 0 ? void 0 : data.documents) ? data.documents : [];
        return docs.map((d) => {
            var _a;
            return ({
                placeId: String(d.id),
                name: (_a = d.place_name) !== null && _a !== void 0 ? _a : "",
                address: d.road_address_name || d.address_name || "",
                lat: Number(d.y),
                lng: Number(d.x),
            });
        });
    }
    catch (err) {
        // ✅ 카카오가 보내는 실제 에러 바디 확인
        const status = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.status;
        const body = (_b = err === null || err === void 0 ? void 0 : err.response) === null || _b === void 0 ? void 0 : _b.data;
        console.error("[KAKAO ERROR]", status, body);
        // 라우트에서 그대로 응답하도록 던지기
        throw new Error(`Kakao API failed: ${status} ${JSON.stringify(body)}`);
    }
}
