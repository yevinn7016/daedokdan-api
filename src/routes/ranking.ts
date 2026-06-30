// src/routes/ranking.ts

import { Router } from "express";
import { getBookRanking } from "../services/rankingService";
import { optionalAuthMiddleware } from "../middlewares/optionalAuth";
import { AuthedRequest } from "../middlewares/auth";
import { filterAdultBooks, resolveAdultVerified } from "../utils/adultBookFilter";

const router = Router();

router.get("/books", optionalAuthMiddleware, async (req: AuthedRequest, res) => {
  try {
    const rankings = await getBookRanking();
    const adultVerified = await resolveAdultVerified(req);

    res.json({
      success: true,
      data: {
        rankings: filterAdultBooks(rankings, adultVerified),
      },
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      data: null,
      error: "Failed to fetch ranking",
    });
  }
});

export default router;