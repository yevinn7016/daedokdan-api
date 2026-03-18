import { Router } from "express";
import {
  getYoutubeVideosFromDB,
  updateYoutubeVideos,
} from "../services/youtubeService";

const router = Router();

// 🔥 수동 동기화 (Postman용)
router.post("/videos/sync", async (req, res) => {
  try {
    await updateYoutubeVideos();

    res.json({
      success: true,
      message: "YouTube sync 완료",
    });
  } catch (err) {
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
    const result = await getYoutubeVideosFromDB();

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
    });
  }
});
router.post("/update", async (req, res) => {
  try {
    await updateYoutubeVideos();

    res.json({
      success: true,
      message: "update complete",
    });
  } catch (e) {
    res.json({
      success: false,
      error: "update failed",
    });
  }
});

export default router;