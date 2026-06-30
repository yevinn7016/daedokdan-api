"use strict";
// src/routes/ranking.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rankingService_1 = require("../services/rankingService");
const optionalAuth_1 = require("../middlewares/optionalAuth");
const adultBookFilter_1 = require("../utils/adultBookFilter");
const router = (0, express_1.Router)();
router.get("/books", optionalAuth_1.optionalAuthMiddleware, async (req, res) => {
    try {
        const rankings = await (0, rankingService_1.getBookRanking)();
        const adultVerified = await (0, adultBookFilter_1.resolveAdultVerified)(req);
        res.json({
            success: true,
            data: {
                rankings: (0, adultBookFilter_1.filterAdultBooks)(rankings, adultVerified),
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
