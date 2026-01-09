// src/services/odsayNormalize.ts
// ✅ 최종 버전 (최적 1 + 대안 3개 = 총 4개 반환)
// - ODsay raw → UI 친화적인 routes/segments 구조로 정규화
// - walkMinutes: WALK(trafficType=3) sectionTime 합(분)으로 계산 (거리(m) 값 방지)
// - transfers: info.transferCount 우선, 없으면 bus/subway transit count 합
// - WALK from/to 비어있으면 주변 세그먼트 기반으로 보정 (출발지/도착지 포함)
// - routes 최대 4개로 trim (최적 1 + 대안 3)

export type NormalizedSegment =
  | { type: "WALK"; minutes: number; from: string; to: string }
  | { type: "BUS"; minutes: number; from: string; to: string; busNo: string; busType?: number; busLocalBlID?: string }
  | { type: "SUBWAY"; minutes: number; from: string; to: string; line: string; subwayCode?: number; wayCode?: number }
  | { type: "ETC"; minutes: number; from?: string; to?: string; rawType?: any };

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

const isFiniteNumber = (v: any): v is number => typeof v === "number" && Number.isFinite(v);

function safeStr(v: any): string {
  return typeof v === "string" ? v : "";
}

function pickResultRoot(raw: any) {
  // ODsay 응답 형태가 endpoint/환경에 따라 달라질 수 있어서 최대한 안전하게
  return raw?.result ?? raw?.data?.result ?? raw?.body?.result ?? null;
}

function pickPathList(result: any): any[] {
  const candidate =
    result?.path ??
    result?.paths ??
    result?.Path ??
    result?.route ??
    result?.routes ??
    result?.Route ??
    [];
  return Array.isArray(candidate) ? candidate : [];
}

function normalizeBusSegment(sp: any): NormalizedSegment {
  const lane0 = Array.isArray(sp?.lane) ? sp.lane[0] : undefined;
  const minutes = isFiniteNumber(sp?.sectionTime) ? sp.sectionTime : 0;
  return {
    type: "BUS",
    minutes,
    from: safeStr(sp?.startName),
    to: safeStr(sp?.endName),
    busNo: safeStr(lane0?.busNo) || safeStr(lane0?.name) || "",
    busType: isFiniteNumber(lane0?.type) ? lane0.type : undefined,
    busLocalBlID: safeStr(lane0?.busLocalBlID) || undefined,
  };
}

function normalizeSubwaySegment(sp: any): NormalizedSegment {
  const lane0 = Array.isArray(sp?.lane) ? sp.lane[0] : undefined;
  const minutes = isFiniteNumber(sp?.sectionTime) ? sp.sectionTime : 0;

  // line 이름은 lane[0].name에 들어오는 경우가 많음
  // name이 없으면 subwayCode/line 등 대체 표시값
  const lineName =
    safeStr(lane0?.name) ||
    (isFiniteNumber(lane0?.subwayCode) ? `지하철 ${lane0.subwayCode}` : "") ||
    safeStr(lane0?.line) ||
    "";

  return {
    type: "SUBWAY",
    minutes,
    from: safeStr(sp?.startName),
    to: safeStr(sp?.endName),
    line: lineName,
    subwayCode: isFiniteNumber(lane0?.subwayCode) ? lane0.subwayCode : undefined,
    wayCode: isFiniteNumber(sp?.wayCode) ? sp.wayCode : undefined,
  };
}

function normalizeWalkSegment(sp: any): NormalizedSegment {
  const minutes = isFiniteNumber(sp?.sectionTime) ? sp.sectionTime : 0;
  return {
    type: "WALK",
    minutes,
    from: safeStr(sp?.startName),
    to: safeStr(sp?.endName),
  };
}

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

function fillWalkFromTo(segments: NormalizedSegment[]) {
  // WALK 구간의 from/to가 비어있는 경우가 많아서 UI 문구를 위해 보정
  // 규칙:
  // - 첫 WALK from 비면 "출발지", 마지막 WALK to 비면 "도착지"
  // - 그 외에는 인접 segment의 to/from을 활용
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type !== "WALK") continue;

    // from 보정
    if (!seg.from) {
      if (i === 0) seg.from = "출발지";
      else seg.from = (segments[i - 1] as any)?.to ?? "이전 지점";
    }

    // to 보정
    if (!seg.to) {
      if (i === segments.length - 1) seg.to = "도착지";
      else seg.to = (segments[i + 1] as any)?.from ?? "다음 지점";
    }
  }
}

function computeWalkMinutesFromSegments(segments: NormalizedSegment[]): number {
  // ✅ 도보 시간(분) = WALK 구간 sectionTime 합
  return segments
    .filter((s) => s.type === "WALK")
    .reduce((sum, s) => sum + (isFiniteNumber(s.minutes) ? s.minutes : 0), 0);
}

function computeTransfers(info: any): number {
  // info.transferCount가 있으면 그걸 우선
  if (isFiniteNumber(info?.transferCount)) return info.transferCount;

  const busT = isFiniteNumber(info?.busTransitCount) ? info.busTransitCount : 0;
  const subwayT = isFiniteNumber(info?.subwayTransitCount) ? info.subwayTransitCount : 0;

  // 혹시 다른 필드명 케이스
  const altBusT = isFiniteNumber(info?.busTransitCnt) ? info.busTransitCnt : 0;
  const altSubT = isFiniteNumber(info?.subwayTransitCnt) ? info.subwayTransitCnt : 0;

  return Math.max(busT + subwayT, altBusT + altSubT);
}

function computeTotalMinutes(info: any): number | null {
  if (isFiniteNumber(info?.totalTime)) return info.totalTime;
  if (isFiniteNumber(info?.TotalTime)) return info.TotalTime;
  // 혹시 다른 필드 케이스 대비
  return null;
}

function computeFare(info: any): number | null {
  if (isFiniteNumber(info?.payment)) return info.payment;
  if (isFiniteNumber(info?.fare)) return info.fare;
  return null;
}

export function normalizeOdsayRoutes(raw: any): NormalizeResult {
  // 1) ODsay 에러 처리
  // (지금 네 raw에서는 error가 배열로 옴: [{code, message}, ...])
  if (raw?.error) {
    return { routes: [], odsayError: raw.error };
  }

  const result = pickResultRoot(raw);
  if (!result) {
    return { routes: [] };
  }

  const pathList = pickPathList(result);

  const routes: NormalizedRoute[] = pathList.map((p: any, idx: number) => {
    const info = p?.info ?? p?.Info ?? {};
    const subPath = Array.isArray(p?.subPath) ? p.subPath : Array.isArray(p?.SubPath) ? p.SubPath : [];

    // 2) segments 생성
    const segments: NormalizedSegment[] = subPath.map((sp: any) => {
      // ODsay에서 흔히: 1=지하철, 2=버스, 3=도보
      const t = sp?.trafficType;

      if (t === 3) return normalizeWalkSegment(sp);
      if (t === 2) return normalizeBusSegment(sp);
      if (t === 1) return normalizeSubwaySegment(sp);

      return normalizeEtcSegment(sp);
    });

    // 3) WALK from/to 보정
    fillWalkFromTo(segments);

    // 4) 요약값 계산
    const totalMinutes = computeTotalMinutes(info);
    const transfers = computeTransfers(info);
    const walkMinutes = computeWalkMinutesFromSegments(segments);
    const fare = computeFare(info);

    return {
      id: String(idx),
      tag: idx === 0 ? "최적" : "대안",
      totalMinutes,
      transfers,
      walkMinutes,
      fare,
      segments,
    };
  });

  // 5) 최적 1 + 대안 3개만 반환
  const trimmed = routes.slice(0, 4);

  return { routes: trimmed };
}
