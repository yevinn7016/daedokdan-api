// src/services/odsayService.ts
import axios from "axios";

const ODSAY_API_KEY = process.env.ODSAY_API_KEY;
if (!ODSAY_API_KEY) throw new Error("Missing env: ODSAY_API_KEY");

const odsay = axios.create({
  baseURL: "https://api.odsay.com/v1/api",
  timeout: 8000,
});

export async function searchPubTransRoutes(params: { sx: number; sy: number; ex: number; ey: number; lang?: number }) {
  const { sx, sy, ex, ey, lang = 0 } = params;

  const { data } = await odsay.get("/searchPubTransPathT", {
    params: {
      apiKey: ODSAY_API_KEY,
      SX: sx,
      SY: sy,
      EX: ex,
      EY: ey,
      lang,
    },
  });

  return data;
}
