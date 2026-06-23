"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const youtubeService_1 = require("../services/youtubeService");
const router = (0, express_1.Router)();
// 🔥 수동 동기화 (Postman용)
router.post("/videos/sync", async (req, res) => {
    try {
        await (0, youtubeService_1.updateYoutubeVideos)();
        res.json({
            success: true,
            message: "YouTube sync 완료",
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "INTERNAL_SERVER_ERROR",
        });
    }
});
// 조회 API
router.get("/videos", async (req, res) => {
    try {
        const result = await (0, youtubeService_1.getYoutubeVideosFromDB)();
        res.json({
            success: true,
            data: result,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "INTERNAL_SERVER_ERROR",
        });
    }
});
router.post("/update", async (req, res) => {
    try {
        await (0, youtubeService_1.updateYoutubeVideos)();
        res.json({
            success: true,
            message: "update complete",
        });
    }
    catch (e) {
        res.json({
            success: false,
            error: "update failed",
        });
    }
});
exports.default = router;
