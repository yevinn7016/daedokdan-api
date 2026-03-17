// src/services/odsayService.ts
import axios from "axios";

function sanitizeApiKey(v: unknown): string {
  if (typeof v !== "string") return "";
  const trimmed = v.trim();
  // .env에 ODSAY_API_KEY="xxxxx" 형태로 들어가서 따옴표가 값에 포함되는 경우 방지
  const unquoted = trimmed.replace(/^['"](.+)['"]$/, "$1").trim();
  return unquoted;
}

const ODSAY_API_KEY = sanitizeApiKey(process.env.ODSAY_API_KEY);
if (!ODSAY_API_KEY) throw new Error("Missing env: ODSAY_API_KEY");

const odsay = axios.create({
  baseURL: "https://api.odsay.com/v1/api",
  timeout: 8000,
});

export async function searchPubTransRoutes(params: { sx: number; sy: number; ex: number; ey: number; lang?: number }) {
  const { sx, sy, ex, ey, lang = 0 } = params;

  const { data } = await odsay.get("/searchPubTransPath", {
    params: {
      apiKey: ODSAY_API_KEY,
      SX: sx,
      SY: sy,
      EX: ex,
      EY: ey,
      lang,
      OPT: 0
    },
    headers: {
      "x-forwarded-for": undefined,
    },
  });

  return data;
}
