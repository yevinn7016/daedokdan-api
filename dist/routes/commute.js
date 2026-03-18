"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/commute.ts
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const kakaoPlacesService_1 = require("../services/kakaoPlacesService");
const placesCacheRepository_1 = require("../repositories/placesCacheRepository");
const odsayService_1 = require("../services/odsayService");
const odsayNormalize_1 = require("../services/odsayNormalize");
// ⭐ 추가: recent repository
const recentPlacesRepository_1 = require("../repositories/recentPlacesRepository");
const recentRoutesRepository_1 = require("../repositories/recentRoutesRepository");
const router = (0, express_1.Router)();
/**
 * GET /api/commute/places/search?query=성신여대 정문
 */
router.get("/places/search", auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    try {
        const query = String((_a = req.query.query) !== null && _a !== void 0 ? _a : "").trim();
        if (!query) {
            return res.status(400).json({ success: false, error: "query is required" });
        }
        const places = await (0, kakaoPlacesService_1.searchPlacesByKeyword)(query, 10);
        await (0, placesCacheRepository_1.upsertPlaces)(places);
        return res.json({ success: true, data: { places }, error: null });
    }
    catch (e) {
        return res.status(500).json({ success: false, error: (_b = e.message) !== null && _b !== void 0 ? _b : "server error" });
    }
});
/**
 * ⭐ GET /api/commute/places/recent
 * - 최근 검색 조회
 */
router.get("/places/recent", auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: "Unauthorized: userId missing" });
        }
        const places = await (0, recentPlacesRepository_1.getRecentPlacesByUser)(userId);
        return res.json({
            success: true,
            data: { places },
            error: null,
        });
    }
    catch (e) {
        return res.status(500).json({
            success: false,
            error: (_b = e.message) !== null && _b !== void 0 ? _b : "server error",
        });
    }
});
router.get("/recent-routes", auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: "Unauthorized: userId missing" });
        }
        const routes = await (0, recentRoutesRepository_1.getRecentRoutesByUser)(userId);
        return res.json({
            success: true,
            data: { routes },
            error: null,
        });
    }
    catch (e) {
        return res.status(500).json({
            success: false,
            error: (_b = e.message) !== null && _b !== void 0 ? _b : "server error",
        });
    }
});
router.post("/recent-routes", auth_1.authMiddleware, async (req, res) => {
    var _a, _b, _c;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: "Unauthorized: userId missing" });
        }
        const { origin, destination } = (_b = req.body) !== null && _b !== void 0 ? _b : {};
        if (!origin || !destination) {
            return res.status(400).json({
                success: false,
                error: "origin and destination required",
            });
        }
        await (0, recentRoutesRepository_1.saveRecentRouteForUser)({
            userId,
            origin,
            destination,
        });
        return res.json({ success: true, error: null });
    }
    catch (e) {
        return res.status(500).json({
            success: false,
            error: (_c = e.message) !== null && _c !== void 0 ? _c : "server error",
        });
    }
});
/**
 * ⭐ POST /api/commute/places/recent
 * - 최근 검색 저장
 */
router.post("/places/recent", auth_1.authMiddleware, async (req, res) => {
    var _a, _b, _c;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: "Unauthorized: userId missing" });
        }
        const { name, address, lat, lng, type } = (_b = req.body) !== null && _b !== void 0 ? _b : {};
        if (!name || lat == null || lng == null) {
            return res.status(400).json({
                success: false,
                error: "name, lat, lng required",
            });
        }
        await (0, recentPlacesRepository_1.saveRecentPlaceForUser)({
            userId,
            name,
            address,
            lat,
            lng,
            type,
        });
        return res.json({ success: true, error: null });
    }
    catch (e) {
        return res.status(500).json({
            success: false,
            error: (_c = e.message) !== null && _c !== void 0 ? _c : "server error",
        });
    }
});
/**
 * POST /api/commute/routes
 */
router.post("/routes", auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    try {
        const { originPlaceId, destinationPlaceId } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        if (!originPlaceId || !destinationPlaceId) {
            return res.status(400).json({
                success: false,
                error: "originPlaceId/destinationPlaceId required",
            });
        }
        const origin = await (0, placesCacheRepository_1.getPlaceById)(String(originPlaceId));
        const dest = await (0, placesCacheRepository_1.getPlaceById)(String(destinationPlaceId));
        if (!origin || !dest) {
            return res.status(400).json({
                success: false,
                error: "placeId not found in cache. Call GET /api/commute/places/search first.",
            });
        }
        if (origin.lat == null || origin.lng == null || dest.lat == null || dest.lng == null) {
            return res.status(400).json({
                success: false,
                error: "cached place missing lat/lng",
            });
        }
        const raw = await (0, odsayService_1.searchPubTransRoutes)({
            sx: Number(origin.lng),
            sy: Number(origin.lat),
            ex: Number(dest.lng),
            ey: Number(dest.lat),
            lang: 0,
        });
        const data = (0, odsayNormalize_1.normalizeOdsayRoutes)(raw);
        if (data === null || data === void 0 ? void 0 : data.odsayError) {
            return res.status(502).json({
                success: false,
                error: data.odsayError,
            });
        }
        return res.json({ success: true, data, error: null });
    }
    catch (e) {
        return res.status(500).json({ success: false, error: (_b = e.message) !== null && _b !== void 0 ? _b : "server error" });
    }
});
exports.default = router;
