// src/services/odsayService.ts
import axios from "axios";

function sanitizeBaseUrl(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().replace(/\/+$/, "");
}

const ODSAY_PROXY_URL = sanitizeBaseUrl(process.env.ODSAY_PROXY_URL);
if (!ODSAY_PROXY_URL) throw new Error("Missing env: ODSAY_PROXY_URL");

const PROXY_TIMEOUT_MS = 8000;

export async function searchPubTransRoutes(params: {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  lang?: number;
}) {
  const { sx, sy, ex, ey, lang = 0 } = params;

  const { data } = await axios.get(`${ODSAY_PROXY_URL}/odsay/searchPubTransPath`, {
    params: {
      sx,
      sy,
      ex,
      ey,
      lang,
    },
    timeout: PROXY_TIMEOUT_MS,
  });

  return data;
}
