// src/routes/commute.ts
import { Router, Request, Response } from "express";
import { authMiddleware, AuthedRequest } from "../middlewares/auth";
import { searchPlacesByKeyword } from "../services/kakaoPlacesService";
import { upsertPlaces, getPlaceById } from "../repositories/placesCacheRepository";
import { searchPubTransRoutes } from "../services/odsayService";
import { normalizeOdsayRoutes } from "../services/odsayNormalize";

// ⭐ 추가: recent repository
import {
  getRecentPlacesByUser,
  saveRecentPlaceForUser,
} from "../repositories/recentPlacesRepository";
import {
  getRecentRoutesByUser,
  saveRecentRouteForUser,
} from "../repositories/recentRoutesRepository";
const router = Router();

/**
 * GET /api/commute/places/search?query=성신여대 정문
 */
router.get("/places/search", authMiddleware, async (req: AuthedRequest, res: Response) => {
  try {
    const query = String(req.query.query ?? "").trim();
    if (!query) {
      return res.status(400).json({ success: false, error: "query is required" });
    }

    const places = await searchPlacesByKeyword(query, 10);

    await upsertPlaces(places);

    return res.json({ success: true, data: { places }, error: null });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message ?? "server error" });
  }
});

/**
 * ⭐ GET /api/commute/places/recent
 * - 최근 검색 조회
 */
router.get("/places/recent", authMiddleware, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized: userId missing" });
    }

    const places = await getRecentPlacesByUser(userId);

    return res.json({
      success: true,
      data: { places },
      error: null,
    });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: e.message ?? "server error",
    });
  }
});
router.get("/recent-routes", authMiddleware, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized: userId missing" });
    }

    const routes = await getRecentRoutesByUser(userId);

    return res.json({
      success: true,
      data: { routes },
      error: null,
    });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: e.message ?? "server error",
    });
  }
});
router.post("/recent-routes", authMiddleware, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized: userId missing" });
    }
    const { origin, destination } = req.body ?? {};

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: "origin and destination required",
      });
    }

    await saveRecentRouteForUser({
      userId,
      origin,
      destination,
    });

    return res.json({ success: true, error: null });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: e.message ?? "server error",
    });
  }
});
/**
 * ⭐ POST /api/commute/places/recent
 * - 최근 검색 저장
 */
router.post("/places/recent", authMiddleware, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized: userId missing" });
    }
    const { name, address, lat, lng, type } = req.body ?? {};

    if (!name || lat == null || lng == null) {
      return res.status(400).json({
        success: false,
        error: "name, lat, lng required",
      });
    }

    await saveRecentPlaceForUser({
      userId,
      name,
      address,
      lat,
      lng,
      type,
    });

    return res.json({ success: true, error: null });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: e.message ?? "server error",
    });
  }
});

/**
 * POST /api/commute/routes
 */
router.post("/routes", authMiddleware, async (req: AuthedRequest, res: Response) => {
  try {
    const { originPlaceId, destinationPlaceId } = req.body ?? {};

    if (!originPlaceId || !destinationPlaceId) {
      return res.status(400).json({
        success: false,
        error: "originPlaceId/destinationPlaceId required",
      });
    }

    const origin = await getPlaceById(String(originPlaceId));
    const dest = await getPlaceById(String(destinationPlaceId));

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

    const raw = await searchPubTransRoutes({
      sx: Number(origin.lng),
      sy: Number(origin.lat),
      ex: Number(dest.lng),
      ey: Number(dest.lat),
      lang: 0,
    });

    const data = normalizeOdsayRoutes(raw);

    if ((data as any)?.odsayError) {
      return res.status(502).json({
        success: false,
        error: (data as any).odsayError,
      });
    }

    return res.json({ success: true, data, error: null });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message ?? "server error" });
  }
});

export default router;