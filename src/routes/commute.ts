// src/routes/commute.ts
import { Router, Request, Response } from "express";
import { authMiddleware, AuthedRequest } from "../middlewares/auth";
import { searchPlacesByKeyword } from "../services/kakaoPlacesService";
import { upsertPlaces, getPlaceById } from "../repositories/placesCacheRepository";
import { searchPubTransRoutes } from "../services/odsayService";
import { normalizeOdsayRoutes } from "../services/odsayNormalize";

const router = Router();

/**
 * GET /api/commute/places/search?query=성신여대 정문
 * - 카카오 keyword search 결과 반환
 * - 동시에 places_cache에 upsert (placeId→좌표 캐시)
 */
router.get("/places/search", authMiddleware, async (req: AuthedRequest, res: Response) => {
  try {
    const query = String(req.query.query ?? "").trim();
    if (!query) {
      return res.status(400).json({ success: false, error: "query is required" });
    }

    const places = await searchPlacesByKeyword(query, 10);

    // 캐시 저장 (placeId로 routes 요청할 때 좌표를 서버가 찾게 하려면 필수)
    await upsertPlaces(places);

    return res.json({ success: true, data: { places }, error: null });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message ?? "server error" });
  }
});

/**
 * POST /api/commute/routes
 * body: { originPlaceId: string, destinationPlaceId: string }
 * - places_cache에서 placeId→lat,lng 조회
 * - ODsay로 최적+대안 경로 계산
 * - normalize 후 (최적1 + 대안3) 반환
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
        error: "placeId not found in cache. Call GET /api/commute/places/search and select from results again.",
      });
    }

    if (origin.lat == null || origin.lng == null || dest.lat == null || dest.lng == null) {
      return res.status(400).json({
        success: false,
        error: "cached place missing lat/lng. Please search again.",
      });
    }

    // ✅ ODsay: SX=경도(lng), SY=위도(lat)
    const raw = await searchPubTransRoutes({
      sx: Number(origin.lng),
      sy: Number(origin.lat),
      ex: Number(dest.lng),
      ey: Number(dest.lat),
      lang: 0,
    });

    const data = normalizeOdsayRoutes(raw);

    // ODsay 에러가 normalize 결과에 담긴 경우 처리
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
