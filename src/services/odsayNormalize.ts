// src/services/odsayNormalize.ts

export type Station = {
  name: string;
  lat: number;
  lng: number;
};

export type NormalizedSegment =
  | {
      type: "WALK";
      minutes: number;
      from: string;
      to: string;
      fromStation?: Station;
      toStation?: Station;
      stations: Station[];
    }
  | {
      type: "BUS";
      minutes: number;
      from: string;
      to: string;
      busNo: string;
      busType?: number;
      busLocalBlID?: string;
      fromStation?: Station;
      toStation?: Station;
      stations: Station[];
    }
  | {
      type: "SUBWAY";
      minutes: number;
      from: string;
      to: string;
      line: string;
      subwayCode?: number;
      wayCode?: number;
      fromStation?: Station;
      toStation?: Station;
      stations: Station[];
    }
  | {
      type: "ETC";
      minutes: number;
      from?: string;
      to?: string;
      rawType?: any;
    };

export type NormalizedRoute = {
  id: string;
  tag: "최적" | "대안";
  totalMinutes: number | null;
  transfers: number;
  walkMinutes: number;
  fare: number | null;
  segments: NormalizedSegment[];
};

export type NormalizeResult = {
  routes: NormalizedRoute[];
  odsayError?: any;
};

const isFiniteNumber = (v: any): v is number =>
  typeof v === "number" && Number.isFinite(v);

function safeStr(v: any): string {
  return typeof v === "string" ? v : "";
}

function pickResultRoot(raw: any) {
  return raw?.result ?? raw?.data?.result ?? raw?.body?.result ?? null;
}

function pickPathList(result: any): any[] {
  const candidate =
    result?.path ??
    result?.Path ??
    result?.paths ??
    result?.route ??
    result?.routes ??
    result?.Route ??
    [];
  return Array.isArray(candidate) ? candidate : [];
}

/* =========================
   🚶 WALK
========================= */
function normalizeWalkSegment(sp: any): NormalizedSegment {
  const minutes = isFiniteNumber(sp?.sectionTime) ? sp.sectionTime : 0;

  return {
    type: "WALK",
    minutes,
    from: safeStr(sp?.startName),
    to: safeStr(sp?.endName),

    fromStation: {
      name: safeStr(sp?.startName),
      lat: sp.startY,
      lng: sp.startX,
    },
    toStation: {
      name: safeStr(sp?.endName),
      lat: sp.endY,
      lng: sp.endX,
    },

    stations: [],
  };
}

/* =========================
   🚌 BUS
========================= */
function normalizeBusSegment(sp: any): NormalizedSegment {
  const lane0 = Array.isArray(sp?.lane) ? sp.lane[0] : undefined;
  const minutes = isFiniteNumber(sp?.sectionTime) ? sp.sectionTime : 0;

  const stations =
    lane0?.passStopList?.stations?.map((s: any) => ({
      name: s.stationName,
      lat: Number(s.y),
      lng: Number(s.x),
    })) ?? [];

  return {
    type: "BUS",
    minutes,
    from: safeStr(sp?.startName),
    to: safeStr(sp?.endName),

    busNo: safeStr(lane0?.busNo) || safeStr(lane0?.name) || "",
    busType: isFiniteNumber(lane0?.type) ? lane0.type : undefined,
    busLocalBlID: safeStr(lane0?.busLocalBlID) || undefined,

    stations,

    fromStation: {
      name: safeStr(sp?.startName),
      lat: sp.startY,
      lng: sp.startX,
    },
    toStation: {
      name: safeStr(sp?.endName),
      lat: sp.endY,
      lng: sp.endX,
    },
  };
}

/* =========================
   🚇 SUBWAY
========================= */
function normalizeSubwaySegment(sp: any): NormalizedSegment {
  const lane0 = Array.isArray(sp?.lane) ? sp.lane[0] : undefined;
  const minutes = isFiniteNumber(sp?.sectionTime) ? sp.sectionTime : 0;

  const lineName =
    safeStr(lane0?.name) ||
    (isFiniteNumber(lane0?.subwayCode)
      ? `지하철 ${lane0.subwayCode}`
      : "") ||
    safeStr(lane0?.line) ||
    "";

  const stations =
    lane0?.passStopList?.stations?.map((s: any) => ({
      name: s.stationName,
      lat: Number(s.y),
      lng: Number(s.x),
    })) ?? [];

  return {
    type: "SUBWAY",
    minutes,
    from: safeStr(sp?.startName),
    to: safeStr(sp?.endName),

    line: lineName,
    subwayCode: isFiniteNumber(lane0?.subwayCode)
      ? lane0.subwayCode
      : undefined,
    wayCode: isFiniteNumber(sp?.wayCode) ? sp.wayCode : undefined,

    stations,

    fromStation: {
      name: safeStr(sp?.startName),
      lat: sp.startY,
      lng: sp.startX,
    },
    toStation: {
      name: safeStr(sp?.endName),
      lat: sp.endY,
      lng: sp.endX,
    },
  };
}

/* =========================
   ETC
========================= */
function normalizeEtcSegment(sp: any): NormalizedSegment {
  const minutes = isFiniteNumber(sp?.sectionTime) ? sp.sectionTime : 0;

  return {
    type: "ETC",
    minutes,
    from: safeStr(sp?.startName) || undefined,
    to: safeStr(sp?.endName) || undefined,
    rawType: sp?.trafficType,
  };
}

/* =========================
   WALK 보정
========================= */
function fillWalkFromTo(segments: NormalizedSegment[]) {
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type !== "WALK") continue;

    if (!seg.from) {
      seg.from =
        i === 0 ? "출발지" : (segments[i - 1] as any)?.to ?? "이전";
    }

    if (!seg.to) {
      seg.to =
        i === segments.length - 1
          ? "도착지"
          : (segments[i + 1] as any)?.from ?? "다음";
    }
  }
}

/* =========================
   계산 함수
========================= */
function computeWalkMinutes(segments: NormalizedSegment[]) {
  return segments
    .filter((s) => s.type === "WALK")
    .reduce((sum, s) => sum + s.minutes, 0);
}

function computeTransfers(info: any) {
  if (isFiniteNumber(info?.transferCount)) return info.transferCount;

  return (
    (info?.busTransitCount || 0) +
    (info?.subwayTransitCount || 0)
  );
}

function computeTotalMinutes(info: any) {
  return isFiniteNumber(info?.totalTime) ? info.totalTime : null;
}

function computeFare(info: any) {
  return isFiniteNumber(info?.payment) ? info.payment : null;
}

/* =========================
   🚀 MAIN
========================= */
export function normalizeOdsayRoutes(raw: any): NormalizeResult {
  if (raw?.error) {
    return { routes: [], odsayError: raw.error };
  }

  const result = pickResultRoot(raw);
  if (!result) return { routes: [] };

  const pathList = pickPathList(result);

  const routes: NormalizedRoute[] = pathList.map((p: any, idx: number) => {
    const info = p?.info ?? {};
    const subPath = Array.isArray(p?.subPath) ? p.subPath : [];

    const segments: NormalizedSegment[] = subPath.map((sp: any) => {
      if (sp.trafficType === 3) return normalizeWalkSegment(sp);
      if (sp.trafficType === 2) return normalizeBusSegment(sp);
      if (sp.trafficType === 1) return normalizeSubwaySegment(sp);
      return normalizeEtcSegment(sp);
    });

    fillWalkFromTo(segments);

    return {
      id: String(idx),
      tag: idx === 0 ? "최적" : "대안",
      totalMinutes: computeTotalMinutes(info),
      transfers: computeTransfers(info),
      walkMinutes: computeWalkMinutes(segments),
      fare: computeFare(info),
      segments,
    };
  });

  return { routes: routes.slice(0, 4) };
}