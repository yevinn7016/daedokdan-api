"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/reading.ts
const express_1 = __importDefault(require("express"));
const userBooksRepository = __importStar(require("../repositories/userBooksRepository"));
console.log('🔥 userBooksRepository exports:', userBooksRepository);
const userBooksRepository_1 = require("../repositories/userBooksRepository");
const recommendationService_1 = require("../services/recommendationService");
const readingSessionsRepository = __importStar(require("../repositories/readingSessionsRepository"));
console.log('🔥 readingSessionsRepository exports:', readingSessionsRepository);
const { createReadingSession, finishReadingSession } = readingSessionsRepository;
const placesCacheRepository_1 = require("../repositories/placesCacheRepository");
// ✅ auth 미들웨어
const auth_1 = require("../middlewares/auth");
const odsayService_1 = require("../services/odsayService");
const odsayNormalize_1 = require("../services/odsayNormalize");
// 🔹 page_count 보정용
const db_1 = require("../core/db");
const aladinClient_1 = require("../clients/aladinClient");
// ⭐ ODsay → 정거장 추출 함수
function enrichSegmentsWithStations(route) {
    return {
        ...route,
        segments: route.segments.map((seg, idx, arr) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            // ✅ SUBWAY / BUS
            if (seg.type === 'SUBWAY' || seg.type === 'BUS') {
                const lane = (_a = seg.lane) === null || _a === void 0 ? void 0 : _a[0];
                const stations = (_d = (_c = (_b = lane === null || lane === void 0 ? void 0 : lane.passStopList) === null || _b === void 0 ? void 0 : _b.stations) === null || _c === void 0 ? void 0 : _c.map((s) => ({
                    name: s.stationName,
                    lat: Number(s.y),
                    lng: Number(s.x),
                }))) !== null && _d !== void 0 ? _d : [];
                return {
                    ...seg,
                    stations,
                };
            }
            // ⭐⭐ WALK 처리 추가 ⭐⭐
            if (seg.type === 'WALK') {
                const prevSeg = arr[idx - 1];
                const nextSeg = arr[idx + 1];
                const fromStation = (_f = (_e = prevSeg === null || prevSeg === void 0 ? void 0 : prevSeg.stations) === null || _e === void 0 ? void 0 : _e[prevSeg.stations.length - 1]) !== null && _f !== void 0 ? _f : null;
                const toStation = (_h = (_g = nextSeg === null || nextSeg === void 0 ? void 0 : nextSeg.stations) === null || _g === void 0 ? void 0 : _g[0]) !== null && _h !== void 0 ? _h : null;
                return {
                    ...seg,
                    fromStation, // ⭐ 시작 좌표
                    toStation, // ⭐ 도착 좌표
                };
            }
            return seg;
        }),
    };
}
const router = express_1.default.Router();
/**
 * GET /api/reading/current
 * 현재 읽는 책 목록 (status = 'reading')
 */
router.get('/current', auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res
                .status(401)
                .json({ message: 'Unauthorized: userId not found' });
        }
        const items = await (0, userBooksRepository_1.getCurrentReadingByUserId)(userId);
        return res.json({ items });
    }
    catch (err) {
        console.error('[GET /api/reading/current] error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
/**
 * GET /api/reading/bookshelf
 * 책장 전체 (status별 그룹)
 */
router.get('/bookshelf', auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res
                .status(401)
                .json({ message: 'Unauthorized: userId not found' });
        }
        const bookshelf = await (0, userBooksRepository_1.getBookshelfByUserId)(userId);
        return res.json(bookshelf);
    }
    catch (err) {
        console.error('[GET /api/reading/bookshelf] error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
/**
 * POST /api/reading/recommend/commute
 *
 * body:
 * {
 *   book_id: string,
 *   user_book_id: string,
 *   origin_place_id: string,
 *   destination_place_id: string,
 *   selected_route_id: string
 * }
 */
router.post('/recommend/commute', auth_1.authMiddleware, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: userId not found' });
        }
        const { book_id, user_book_id, origin_place_id, destination_place_id, selected_route_id, } = req.body;
        // 1️⃣ 필수값 체크
        if (!book_id) {
            return res.status(400).json({ message: 'book_id is required' });
        }
        if (!user_book_id) {
            return res.status(400).json({ message: 'user_book_id is required' });
        }
        if (!origin_place_id || !destination_place_id || !selected_route_id) {
            return res.status(400).json({
                message: 'origin_place_id, destination_place_id, selected_route_id are required',
            });
        }
        // 2️⃣ placeId → 좌표 조회
        const origin = await (0, placesCacheRepository_1.getPlaceById)(String(origin_place_id));
        const dest = await (0, placesCacheRepository_1.getPlaceById)(String(destination_place_id));
        if (!origin ||
            !dest ||
            origin.lat == null ||
            origin.lng == null ||
            dest.lat == null ||
            dest.lng == null) {
            return res.status(400).json({
                message: 'Invalid placeId. Please search places again.',
            });
        }
        // 3️⃣ ODsay 호출 → 경로 생성
        const raw = await (0, odsayService_1.searchPubTransRoutes)({
            sx: Number(origin.lng),
            sy: Number(origin.lat),
            ex: Number(dest.lng),
            ey: Number(dest.lat),
            lang: 0,
        });
        const normalized = (0, odsayNormalize_1.normalizeOdsayRoutes)(raw);
        if (normalized === null || normalized === void 0 ? void 0 : normalized.odsayError) {
            return res.status(502).json({ message: normalized.odsayError });
        }
        const routes = (_b = normalized.routes) !== null && _b !== void 0 ? _b : [];
        const selected = routes.find((r) => String(r.id) === String(selected_route_id));
        if (!selected) {
            return res.status(400).json({
                message: `selected_route_id not found: ${selected_route_id}`,
            });
        }
        const availableMinutes = Number(selected.totalMinutes);
        if (!availableMinutes || availableMinutes <= 0) {
            return res.status(500).json({
                message: 'Invalid commute time from selected route',
            });
        }
        // 4️⃣ 분량 추천
        const recommendation = await (0, recommendationService_1.recommendPortion)({
            userId: userId,
            bookId: book_id,
            availableMinutes,
        });
        // 5️⃣ 응답
        return res.json({
            ...recommendation,
            meta: {
                userBookId: user_book_id,
                originPlaceId: origin_place_id,
                destinationPlaceId: destination_place_id,
                selectedRouteId: selected_route_id,
                availableMinutes,
                selectedRouteSummary: {
                    tag: (_c = selected.tag) !== null && _c !== void 0 ? _c : null,
                    totalMinutes: (_d = selected.totalMinutes) !== null && _d !== void 0 ? _d : null,
                    walkMinutes: (_e = selected.walkMinutes) !== null && _e !== void 0 ? _e : null,
                    transfers: (_f = selected.transfers) !== null && _f !== void 0 ? _f : null,
                    fare: (_g = selected.fare) !== null && _g !== void 0 ? _g : null,
                },
            },
        });
    }
    catch (err) {
        console.error('[POST /api/reading/recommend/commute] error', err);
        return res.status(500).json({
            message: (_h = err === null || err === void 0 ? void 0 : err.message) !== null && _h !== void 0 ? _h : 'Internal server error',
        });
    }
});
/**
 * POST /api/reading/bookshelf
 * 내 서재에 책 담기
 *
 * body: { book_id: string }
 * response: { item, alreadyExists }
 *  - 여기서 item.pageCount / item.endPage가 비어있으면
 *    알라딘 상세 API로 page_count를 채워서 books / user_books / 응답을 보정한다.
 */
/**
 * POST /api/reading/bookshelf
 * 내 서재에 책 담기 + pageCount 보정
 */
router.post('/bookshelf', auth_1.authMiddleware, async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res
                .status(401)
                .json({ message: 'Unauthorized: userId not found' });
        }
        const { book_id } = req.body;
        if (!book_id) {
            return res.status(400).json({ message: 'book_id is required' });
        }
        // 1) 기존 로직: 내 책장에 추가
        const result = await (0, userBooksRepository_1.addBookToShelf)(userId, book_id);
        let { item } = result;
        // -------------------------------
        // 2) pageCount / endPage 보정 로직
        // -------------------------------
        try {
            console.log('📚 [bookshelf] before fix item =', item);
            // 이미 값이 있으면 굳이 안 건드림
            if (item.pageCount && item.pageCount > 0 && item.endPage) {
                return res
                    .status(result.alreadyExists ? 200 : 201)
                    .json(result);
            }
            // (1) books 테이블에서 isbn13, page_count 가져오기
            const { data: bookRow, error: bookError } = await db_1.supabase
                .from('books')
                .select('id, isbn13, page_count')
                .eq('id', item.bookId)
                .maybeSingle();
            console.log('📚 [bookshelf] bookRow from DB =', bookRow, bookError);
            if (!bookRow) {
                // 책 메타도 없으면 더 이상 할 수 있는 게 없음
                return res
                    .status(result.alreadyExists ? 200 : 201)
                    .json(result);
            }
            let newPageCount = null;
            // (2) DB에 이미 page_count가 있으면 그걸 쓰자
            if (bookRow.page_count && bookRow.page_count > 0) {
                newPageCount = bookRow.page_count;
                console.log('📚 [bookshelf] use existing page_count =', newPageCount);
            }
            else if (bookRow.isbn13) {
                // (3) 없으면 알라딘 상세 API 호출
                console.log('📚 [bookshelf] call Aladin with isbn13 =', bookRow.isbn13);
                // ...
                const detail = await (0, aladinClient_1.getBookDetailFromAladin)(bookRow.isbn13);
                console.log('📚 [bookshelf] Aladin detail =', JSON.stringify(detail, null, 2));
                /**
                 * 알라딘 ItemLookUp 응답에서 페이지 수 파싱
                 *
                 * 케이스별로 최대한 커버:
                 * 1) detail.page
                 * 2) detail.item.page
                 * 3) detail.items[0].page
                 * 4) detail.item[0].subInfo.itemPage  ← 지금 로그에 해당되는 케이스
                 */
                if (typeof (detail === null || detail === void 0 ? void 0 : detail.page) === 'number') {
                    newPageCount = detail.page;
                }
                else if (typeof ((_b = detail === null || detail === void 0 ? void 0 : detail.item) === null || _b === void 0 ? void 0 : _b.page) === 'number') {
                    newPageCount = detail.item.page;
                }
                else if (Array.isArray(detail === null || detail === void 0 ? void 0 : detail.items) &&
                    detail.items[0] &&
                    typeof detail.items[0].page === 'number') {
                    newPageCount = detail.items[0].page;
                }
                else if (Array.isArray(detail === null || detail === void 0 ? void 0 : detail.item) &&
                    detail.item[0] &&
                    typeof ((_d = (_c = detail.item[0]) === null || _c === void 0 ? void 0 : _c.subInfo) === null || _d === void 0 ? void 0 : _d.itemPage) === 'number') {
                    newPageCount = detail.item[0].subInfo.itemPage; // ✅ 여기!
                }
                console.log('📚 [bookshelf] parsed newPageCount =', newPageCount);
                console.log('📚 [bookshelf] parsed newPageCount =', newPageCount);
                // (4) DB에 page_count 업데이트
                if (newPageCount && newPageCount > 0) {
                    const { error: updateBookError } = await db_1.supabase
                        .from('books')
                        .update({ page_count: newPageCount })
                        .eq('id', bookRow.id);
                    if (updateBookError) {
                        console.error('[bookshelf] books update error', updateBookError);
                    }
                }
            }
            // (5) user_books.end_page도 비어있고, newPageCount가 있다면 채워주기
            if (newPageCount &&
                newPageCount > 0 &&
                (item.endPage == null || item.endPage <= 0)) {
                const { error: updateUserBookError } = await db_1.supabase
                    .from('user_books')
                    .update({ end_page: newPageCount })
                    .eq('id', item.userBookId);
                if (updateUserBookError) {
                    console.error('[bookshelf] user_books update error', updateUserBookError);
                }
                else {
                    item.endPage = newPageCount;
                }
            }
            // (6) 응답 item.pageCount 보정
            if (newPageCount && newPageCount > 0) {
                item.pageCount = newPageCount;
            }
            console.log('📚 [bookshelf] after fix item =', item);
            const finalResult = { ...result, item };
            return res
                .status(finalResult.alreadyExists ? 200 : 201)
                .json(finalResult);
        }
        catch (fixErr) {
            console.error('[POST /api/reading/bookshelf] fix error', fixErr);
            // 보정에 실패하더라도 기본 result는 보내준다
            return res.status(result.alreadyExists ? 200 : 201).json(result);
        }
    }
    catch (err) {
        console.error('[POST /api/reading/bookshelf] error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
/**
 * POST /api/reading/recommend
 * body: { book_id, available_minutes }
 */
router.post('/recommend', auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res
                .status(401)
                .json({ message: 'Unauthorized: userId not found' });
        }
        const { book_id, bookId, available_minutes, availableMinutes, } = req.body;
        const effectiveBookId = book_id !== null && book_id !== void 0 ? book_id : bookId;
        const effectiveMinutes = available_minutes !== null && available_minutes !== void 0 ? available_minutes : availableMinutes;
        if (!effectiveBookId) {
            return res.status(400).json({ message: 'book_id is required' });
        }
        if (effectiveMinutes == null ||
            typeof effectiveMinutes !== 'number' ||
            effectiveMinutes <= 0) {
            return res
                .status(400)
                .json({ message: 'available_minutes must be a positive number' });
        }
        const result = await (0, recommendationService_1.recommendPortion)({
            userId,
            bookId: effectiveBookId,
            availableMinutes: effectiveMinutes,
        });
        return res.json(result);
    }
    catch (err) {
        console.error('[POST /api/reading/recommend] error', err);
        const message = (_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : 'Internal server error';
        return res.status(500).json({ message });
    }
});
router.post('/sessions', auth_1.authMiddleware, async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: userId not found' });
        }
        const { user_book_id, book_id, start_page, end_page, planned_pages, session_type, origin_place_id, destination_place_id, selected_route_id, } = req.body;
        if (!user_book_id)
            return res.status(400).json({ message: 'user_book_id is required' });
        if (!book_id)
            return res.status(400).json({ message: 'book_id is required' });
        if (start_page == null ||
            end_page == null ||
            typeof start_page !== 'number' ||
            typeof end_page !== 'number') {
            return res.status(400).json({ message: 'start_page and end_page must be numbers' });
        }
        const effectiveType = session_type !== null && session_type !== void 0 ? session_type : 'timer';
        // =========================
        // 🚇 COMMUTE 세션
        // =========================
        if (effectiveType === 'commute') {
            if (!origin_place_id || !destination_place_id || !selected_route_id) {
                return res.status(400).json({
                    message: 'origin_place_id, destination_place_id, selected_route_id are required',
                });
            }
            const origin = await (0, placesCacheRepository_1.getPlaceById)(String(origin_place_id));
            const dest = await (0, placesCacheRepository_1.getPlaceById)(String(destination_place_id));
            if (!origin || !dest || origin.lat == null || origin.lng == null || dest.lat == null || dest.lng == null) {
                return res.status(400).json({
                    message: 'placeId not found or missing lat/lng',
                });
            }
            // ✅ ODsay 호출
            const raw = await (0, odsayService_1.searchPubTransRoutes)({
                sx: Number(origin.lng),
                sy: Number(origin.lat),
                ex: Number(dest.lng),
                ey: Number(dest.lat),
                lang: 0,
            });
            const normalized = (0, odsayNormalize_1.normalizeOdsayRoutes)(raw);
            if (normalized === null || normalized === void 0 ? void 0 : normalized.odsayError) {
                return res.status(502).json({ message: normalized.odsayError });
            }
            const routes = (_b = normalized.routes) !== null && _b !== void 0 ? _b : [];
            const selected = routes.find((r) => String(r.id) === String(selected_route_id));
            if (!selected) {
                return res.status(400).json({ message: `selected_route_id not found` });
            }
            // ⭐⭐⭐ 핵심 추가 부분 ⭐⭐⭐
            const enrichedRoute = enrichSegmentsWithStations(selected);
            // ✅ 세션 저장
            const session = await createReadingSession({
                userId,
                userBookId: user_book_id,
                bookId: book_id,
                startPage: start_page,
                endPage: end_page,
                plannedPages: planned_pages,
                sessionType: 'commute',
                commuteProfileId: null,
                originPlaceId: String(origin_place_id),
                destinationPlaceId: String(destination_place_id),
                selectedRouteId: String(selected_route_id),
                commuteTotalMinutes: (_c = enrichedRoute.totalMinutes) !== null && _c !== void 0 ? _c : null,
                commuteWalkMinutes: (_d = enrichedRoute.walkMinutes) !== null && _d !== void 0 ? _d : null,
                commuteTransfers: (_e = enrichedRoute.transfers) !== null && _e !== void 0 ? _e : null,
                commuteFare: (_f = enrichedRoute.fare) !== null && _f !== void 0 ? _f : null,
                // ⭐ 변경된 부분
                commuteRouteJson: enrichedRoute,
            });
            return res.status(201).json({
                ...session,
                originLat: origin.lat,
                originLng: origin.lng,
                destinationLat: dest.lat,
                destinationLng: dest.lng,
            });
        }
        // =========================
        // ⏱ TIMER 세션
        // =========================
        const session = await createReadingSession({
            userId,
            userBookId: user_book_id,
            bookId: book_id,
            startPage: start_page,
            endPage: end_page,
            plannedPages: planned_pages,
            sessionType: 'timer',
            commuteProfileId: null,
        });
        return res.status(201).json(session);
    }
    catch (err) {
        console.error('[POST /api/reading/sessions] error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
/**
 * PATCH /api/reading/sessions/:sessionId/finish
 * 읽기 세션 종료
 *
 * body: { end_page, actual_minutes }
 */
router.patch('/sessions/:sessionId/finish', auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: userId not found' });
        }
        const { sessionId } = req.params;
        const { end_page, actual_minutes } = req.body;
        if (!sessionId)
            return res.status(400).json({ message: 'sessionId is required' });
        if (end_page == null || typeof end_page !== 'number' || end_page <= 0) {
            return res.status(400).json({ message: 'end_page must be a positive number' });
        }
        if (actual_minutes == null || typeof actual_minutes !== 'number' || actual_minutes <= 0) {
            return res.status(400).json({ message: 'actual_minutes must be a positive number' });
        }
        const session = await finishReadingSession({
            userId,
            sessionId,
            actualEndPage: end_page,
            durationMinutes: actual_minutes,
        });
        return res.json(session);
    }
    catch (err) {
        console.error('[PATCH /api/reading/sessions/:id/finish] error', err);
        const message = (_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : 'Internal server error';
        return res.status(500).json({ message });
    }
});
exports.default = router;
