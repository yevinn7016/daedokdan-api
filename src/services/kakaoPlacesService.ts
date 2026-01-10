// src/services/kakaoPlacesService.ts
import axios from "axios";

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
if (!KAKAO_REST_API_KEY) throw new Error("Missing env: KAKAO_REST_API_KEY");

type KakaoPlaceDoc = {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // lng (경도)
  y: string; // lat (위도)
};

export type KakaoPlace = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

const kakao = axios.create({
  baseURL: "https://dapi.kakao.com",
  timeout: 8000,
  headers: {
    Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
  },
});

export async function searchPlacesByKeyword(query: string, size = 10): Promise<KakaoPlace[]> {
  const q = (query ?? "").trim();
  if (!q) return [];

  try {
    const { data } = await kakao.get("/v2/local/search/keyword.json", {
      params: { query: q, size },
    });

    const docs: KakaoPlaceDoc[] = Array.isArray(data?.documents) ? data.documents : [];
    return docs.map((d) => ({
      placeId: String(d.id),
      name: d.place_name ?? "",
      address: d.road_address_name || d.address_name || "",
      lat: Number(d.y),
      lng: Number(d.x),
    }));
  } catch (err: any) {
    // ✅ 카카오가 보내는 실제 에러 바디 확인
    const status = err?.response?.status;
    const body = err?.response?.data;
    console.error("[KAKAO ERROR]", status, body);

    // 라우트에서 그대로 응답하도록 던지기
    throw new Error(`Kakao API failed: ${status} ${JSON.stringify(body)}`);
  }
}
