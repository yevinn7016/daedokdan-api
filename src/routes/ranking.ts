// src/routes/ranking.ts

import { Router } from "express";
import { getBookRanking } from "../services/rankingService";

const router = Router();

router.get("/books", async (req, res) => {
  try {
    const rankings = await getBookRanking();

    res.json({
      success: true,
      data: {
        rankings,
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