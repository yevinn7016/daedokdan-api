"use strict";
// src/routes/ranking.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rankingService_1 = require("../services/rankingService");
const router = (0, express_1.Router)();
router.get("/books", async (req, res) => {
    try {
        const rankings = await (0, rankingService_1.getBookRanking)();
        res.json({
            success: true,
            data: {
                rankings,
            },
            error: null,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            data: null,
            error: "Failed to fetch ranking",
        });
    }
});
exports.default = router;
