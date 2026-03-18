"use strict";
// src/services/odsayNormalize.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeOdsayRoutes = normalizeOdsayRoutes;
const isFiniteNumber = (v) => typeof v === "number" && Number.isFinite(v);
function safeStr(v) {
    return typeof v === "string" ? v : "";
}
function pickResultRoot(raw) {
    var _a, _b, _c, _d, _e;
    return (_e = (_c = (_a = raw === null || raw === void 0 ? void 0 : raw.result) !== null && _a !== void 0 ? _a : (_b = raw === null || raw === void 0 ? void 0 : raw.data) === null || _b === void 0 ? void 0 : _b.result) !== null && _c !== void 0 ? _c : (_d = raw === null || raw === void 0 ? void 0 : raw.body) === null || _d === void 0 ? void 0 : _d.result) !== null && _e !== void 0 ? _e : null;
}
function pickPathList(result) {
    var _a, _b, _c, _d, _e, _f;
    const candidate = (_f = (_e = (_d = (_c = (_b = (_a = result === null || result === void 0 ? void 0 : result.path) !== null && _a !== void 0 ? _a : result === null || result === void 0 ? void 0 : result.Path) !== null && _b !== void 0 ? _b : result === null || result === void 0 ? void 0 : result.paths) !== null && _c !== void 0 ? _c : result === null || result === void 0 ? void 0 : result.route) !== null && _d !== void 0 ? _d : result === null || result === void 0 ? void 0 : result.routes) !== null && _e !== void 0 ? _e : result === null || result === void 0 ? void 0 : result.Route) !== null && _f !== void 0 ? _f : [];
    return Array.isArray(candidate) ? candidate : [];
}
/* =========================
   🚶 WALK
========================= */
function normalizeWalkSegment(sp) {
    const minutes = isFiniteNumber(sp === null || sp === void 0 ? void 0 : sp.sectionTime) ? sp.sectionTime : 0;
    return {
        type: "WALK",
        minutes,
        from: safeStr(sp === null || sp === void 0 ? void 0 : sp.startName),
        to: safeStr(sp === null || sp === void 0 ? void 0 : sp.endName),
        fromStation: {
            name: safeStr(sp === null || sp === void 0 ? void 0 : sp.startName),
            lat: sp.startY,
            lng: sp.startX,
        },
        toStation: {
            name: safeStr(sp === null || sp === void 0 ? void 0 : sp.endName),
            lat: sp.endY,
            lng: sp.endX,
        },
        stations: [],
    };
}
/* =========================
   🚌 BUS
========================= */
function normalizeBusSegment(sp) {
    var _a, _b, _c;
    const lane0 = Array.isArray(sp === null || sp === void 0 ? void 0 : sp.lane) ? sp.lane[0] : undefined;
    const minutes = isFiniteNumber(sp === null || sp === void 0 ? void 0 : sp.sectionTime) ? sp.sectionTime : 0;
    const stations = (_c = (_b = (_a = lane0 === null || lane0 === void 0 ? void 0 : lane0.passStopList) === null || _a === void 0 ? void 0 : _a.stations) === null || _b === void 0 ? void 0 : _b.map((s) => ({
        name: s.stationName,
        lat: Number(s.y),
        lng: Number(s.x),
    }))) !== null && _c !== void 0 ? _c : [];
    return {
        type: "BUS",
        minutes,
        from: safeStr(sp === null || sp === void 0 ? void 0 : sp.startName),
        to: safeStr(sp === null || sp === void 0 ? void 0 : sp.endName),
        busNo: safeStr(lane0 === null || lane0 === void 0 ? void 0 : lane0.busNo) || safeStr(lane0 === null || lane0 === void 0 ? void 0 : lane0.name) || "",
        busType: isFiniteNumber(lane0 === null || lane0 === void 0 ? void 0 : lane0.type) ? lane0.type : undefined,
        busLocalBlID: safeStr(lane0 === null || lane0 === void 0 ? void 0 : lane0.busLocalBlID) || undefined,
        stations,
        fromStation: {
            name: safeStr(sp === null || sp === void 0 ? void 0 : sp.startName),
            lat: sp.startY,
            lng: sp.startX,
        },
        toStation: {
            name: safeStr(sp === null || sp === void 0 ? void 0 : sp.endName),
            lat: sp.endY,
            lng: sp.endX,
        },
    };
}
/* =========================
   🚇 SUBWAY
========================= */
function normalizeSubwaySegment(sp) {
    var _a, _b, _c;
    const lane0 = Array.isArray(sp === null || sp === void 0 ? void 0 : sp.lane) ? sp.lane[0] : undefined;
    const minutes = isFiniteNumber(sp === null || sp === void 0 ? void 0 : sp.sectionTime) ? sp.sectionTime : 0;
    const lineName = safeStr(lane0 === null || lane0 === void 0 ? void 0 : lane0.name) ||
        (isFiniteNumber(lane0 === null || lane0 === void 0 ? void 0 : lane0.subwayCode)
            ? `지하철 ${lane0.subwayCode}`
            : "") ||
        safeStr(lane0 === null || lane0 === void 0 ? void 0 : lane0.line) ||
        "";
    const stations = (_c = (_b = (_a = lane0 === null || lane0 === void 0 ? void 0 : lane0.passStopList) === null || _a === void 0 ? void 0 : _a.stations) === null || _b === void 0 ? void 0 : _b.map((s) => ({
        name: s.stationName,
        lat: Number(s.y),
        lng: Number(s.x),
    }))) !== null && _c !== void 0 ? _c : [];
    return {
        type: "SUBWAY",
        minutes,
        from: safeStr(sp === null || sp === void 0 ? void 0 : sp.startName),
        to: safeStr(sp === null || sp === void 0 ? void 0 : sp.endName),
        line: lineName,
        subwayCode: isFiniteNumber(lane0 === null || lane0 === void 0 ? void 0 : lane0.subwayCode)
            ? lane0.subwayCode
            : undefined,
        wayCode: isFiniteNumber(sp === null || sp === void 0 ? void 0 : sp.wayCode) ? sp.wayCode : undefined,
        stations,
        fromStation: {
            name: safeStr(sp === null || sp === void 0 ? void 0 : sp.startName),
            lat: sp.startY,
            lng: sp.startX,
        },
        toStation: {
            name: safeStr(sp === null || sp === void 0 ? void 0 : sp.endName),
            lat: sp.endY,
            lng: sp.endX,
        },
    };
}
/* =========================
   ETC
========================= */
function normalizeEtcSegment(sp) {
    const minutes = isFiniteNumber(sp === null || sp === void 0 ? void 0 : sp.sectionTime) ? sp.sectionTime : 0;
    return {
        type: "ETC",
        minutes,
        from: safeStr(sp === null || sp === void 0 ? void 0 : sp.startName) || undefined,
        to: safeStr(sp === null || sp === void 0 ? void 0 : sp.endName) || undefined,
        rawType: sp === null || sp === void 0 ? void 0 : sp.trafficType,
    };
}
/* =========================
   WALK 보정
========================= */
function fillWalkFromTo(segments) {
    var _a, _b, _c, _d;
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (seg.type !== "WALK")
            continue;
        if (!seg.from) {
            seg.from =
                i === 0 ? "출발지" : (_b = (_a = segments[i - 1]) === null || _a === void 0 ? void 0 : _a.to) !== null && _b !== void 0 ? _b : "이전";
        }
        if (!seg.to) {
            seg.to =
                i === segments.length - 1
                    ? "도착지"
                    : (_d = (_c = segments[i + 1]) === null || _c === void 0 ? void 0 : _c.from) !== null && _d !== void 0 ? _d : "다음";
        }
    }
}
/* =========================
   계산 함수
========================= */
function computeWalkMinutes(segments) {
    return segments
        .filter((s) => s.type === "WALK")
        .reduce((sum, s) => sum + s.minutes, 0);
}
function computeTransfers(info) {
    if (isFiniteNumber(info === null || info === void 0 ? void 0 : info.transferCount))
        return info.transferCount;
    return (((info === null || info === void 0 ? void 0 : info.busTransitCount) || 0) +
        ((info === null || info === void 0 ? void 0 : info.subwayTransitCount) || 0));
}
function computeTotalMinutes(info) {
    return isFiniteNumber(info === null || info === void 0 ? void 0 : info.totalTime) ? info.totalTime : null;
}
function computeFare(info) {
    return isFiniteNumber(info === null || info === void 0 ? void 0 : info.payment) ? info.payment : null;
}
/* =========================
   🚀 MAIN
========================= */
function normalizeOdsayRoutes(raw) {
    if (raw === null || raw === void 0 ? void 0 : raw.error) {
        return { routes: [], odsayError: raw.error };
    }
    const result = pickResultRoot(raw);
    if (!result)
        return { routes: [] };
    const pathList = pickPathList(result);
    const routes = pathList.map((p, idx) => {
        var _a;
        const info = (_a = p === null || p === void 0 ? void 0 : p.info) !== null && _a !== void 0 ? _a : {};
        const subPath = Array.isArray(p === null || p === void 0 ? void 0 : p.subPath) ? p.subPath : [];
        const segments = subPath.map((sp) => {
            if (sp.trafficType === 3)
                return normalizeWalkSegment(sp);
            if (sp.trafficType === 2)
                return normalizeBusSegment(sp);
            if (sp.trafficType === 1)
                return normalizeSubwaySegment(sp);
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
