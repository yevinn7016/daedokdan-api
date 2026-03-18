"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReadingSession = createReadingSession;
exports.finishReadingSession = finishReadingSession;
// src/repositories/readingSessionsRepository.ts
const db_1 = require("../core/db");
function mapRowToSession(row) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    return {
        id: row.id,
        userId: row.user_id,
        bookId: row.book_id,
        userBookId: row.user_book_id,
        commuteProfileId: (_a = row.commute_profile_id) !== null && _a !== void 0 ? _a : null,
        startedAt: (_b = row.started_at) !== null && _b !== void 0 ? _b : null,
        endedAt: (_c = row.ended_at) !== null && _c !== void 0 ? _c : null,
        effectiveMinutes: row.effective_minutes != null ? Number(row.effective_minutes) : null,
        plannedStartPage: (_d = row.planned_start_page) !== null && _d !== void 0 ? _d : null,
        plannedEndPage: (_e = row.planned_end_page) !== null && _e !== void 0 ? _e : null,
        plannedPages: (_f = row.planned_pages) !== null && _f !== void 0 ? _f : null,
        actualStartPage: (_g = row.actual_start_page) !== null && _g !== void 0 ? _g : null,
        actualEndPage: (_h = row.actual_end_page) !== null && _h !== void 0 ? _h : null,
        actualPages: (_j = row.actual_pages) !== null && _j !== void 0 ? _j : null,
        sessionType: row.session_type,
        // ✅ commute 선택정보
        originPlaceId: (_k = row.origin_place_id) !== null && _k !== void 0 ? _k : null,
        destinationPlaceId: (_l = row.destination_place_id) !== null && _l !== void 0 ? _l : null,
        selectedRouteId: (_m = row.selected_route_id) !== null && _m !== void 0 ? _m : null,
        commuteTotalMinutes: row.commute_total_minutes != null ? Number(row.commute_total_minutes) : null,
        commuteWalkMinutes: row.commute_walk_minutes != null ? Number(row.commute_walk_minutes) : null,
        commuteTransfers: row.commute_transfers != null ? Number(row.commute_transfers) : null,
        commuteFare: row.commute_fare != null ? Number(row.commute_fare) : null,
        commuteRouteJson: (_o = row.commute_route_json) !== null && _o !== void 0 ? _o : null,
        createdAt: (_p = row.created_at) !== null && _p !== void 0 ? _p : null,
        updatedAt: (_q = row.updated_at) !== null && _q !== void 0 ? _q : null,
    };
}
const SESSION_SELECT = `
  id,
  user_id,
  book_id,
  user_book_id,
  commute_profile_id,
  started_at,
  ended_at,
  effective_minutes,
  planned_start_page,
  planned_end_page,
  planned_pages,
  actual_start_page,
  actual_end_page,
  actual_pages,
  session_type,

  origin_place_id,
  destination_place_id,
  selected_route_id,
  commute_total_minutes,
  commute_walk_minutes,
  commute_transfers,
  commute_fare,
  commute_route_json,

  created_at,
  updated_at
`;
/** 🔹 세션 시작 */
async function createReadingSession(params) {
    const { userId, userBookId, bookId, startPage, endPage, plannedPages, sessionType = 'commute', commuteProfileId = null, 
    // ✅ commute 선택정보
    originPlaceId, destinationPlaceId, selectedRouteId, commuteTotalMinutes = null, commuteWalkMinutes = null, commuteTransfers = null, commuteFare = null, commuteRouteJson = null, } = params;
    const nowIso = new Date().toISOString();
    const pages = plannedPages !== null && plannedPages !== void 0 ? plannedPages : Math.max(1, endPage - startPage + 1);
    // ✅ commute일 때는 선택정보가 들어오는지 검증(원하면 routes에서 이미 검증했으니 약하게 할 수도 있음)
    const isCommute = sessionType === 'commute';
    const insertRow = {
        user_id: userId,
        book_id: bookId,
        user_book_id: userBookId,
        commute_profile_id: commuteProfileId,
        started_at: nowIso,
        ended_at: null,
        effective_minutes: null,
        planned_start_page: startPage,
        planned_end_page: endPage,
        planned_pages: pages,
        actual_start_page: null,
        actual_end_page: null,
        actual_pages: null,
        session_type: sessionType,
        created_at: nowIso,
        updated_at: nowIso,
    };
    if (isCommute) {
        insertRow.origin_place_id = originPlaceId !== null && originPlaceId !== void 0 ? originPlaceId : null;
        insertRow.destination_place_id = destinationPlaceId !== null && destinationPlaceId !== void 0 ? destinationPlaceId : null;
        insertRow.selected_route_id = selectedRouteId !== null && selectedRouteId !== void 0 ? selectedRouteId : null;
        insertRow.commute_total_minutes = commuteTotalMinutes;
        insertRow.commute_walk_minutes = commuteWalkMinutes;
        insertRow.commute_transfers = commuteTransfers;
        insertRow.commute_fare = commuteFare;
        insertRow.commute_route_json = commuteRouteJson;
    }
    const { data, error } = await db_1.supabase
        .from('reading_sessions')
        .insert(insertRow)
        .select(SESSION_SELECT)
        .single();
    if (error || !data) {
        console.error('[createReadingSession] insert error', error);
        throw error !== null && error !== void 0 ? error : new Error('Failed to create reading session');
    }
    return mapRowToSession(data);
}
/** 🔹 세션 종료 + user_books.current_page 반영 */
async function finishReadingSession(params) {
    var _a, _b, _c, _d, _e;
    const { userId, sessionId, actualEndPage, durationMinutes } = params;
    // 1) 세션 조회
    const { data: sessionRow, error: sessionError } = await db_1.supabase
        .from('reading_sessions')
        .select(SESSION_SELECT)
        .eq('id', sessionId)
        .eq('user_id', userId)
        .maybeSingle();
    if (sessionError) {
        console.error('[finishReadingSession] load session error', sessionError);
        throw new Error('Failed to load reading session');
    }
    if (!sessionRow) {
        throw new Error('Reading session not found');
    }
    const s = sessionRow;
    const nowIso = new Date().toISOString();
    const actualStartPage = (_b = (_a = s.actual_start_page) !== null && _a !== void 0 ? _a : s.planned_start_page) !== null && _b !== void 0 ? _b : 1;
    const safeActualEndPage = Math.max(actualStartPage, actualEndPage);
    const actualPages = Math.max(0, safeActualEndPage - actualStartPage + 1);
    // 2) reading_sessions 업데이트
    const { data: updatedRows, error: updateError } = await db_1.supabase
        .from('reading_sessions')
        .update({
        actual_start_page: actualStartPage,
        actual_end_page: safeActualEndPage,
        actual_pages: actualPages,
        effective_minutes: durationMinutes,
        ended_at: nowIso,
        updated_at: nowIso,
    })
        .eq('id', sessionId)
        .eq('user_id', userId)
        .select(SESSION_SELECT);
    if (updateError || !updatedRows || updatedRows.length === 0) {
        console.error('[finishReadingSession] update session error', updateError);
        throw updateError !== null && updateError !== void 0 ? updateError : new Error('Failed to update reading session');
    }
    const updated = updatedRows[0];
    // 3) user_books 업데이트 (진도 반영)
    const { data: userBookRow, error: userBookError } = await db_1.supabase
        .from('user_books')
        .select('id, user_id, current_page, end_page, status, completed_at')
        .eq('id', updated.user_book_id)
        .eq('user_id', userId)
        .maybeSingle();
    if (userBookError) {
        console.error('[finishReadingSession] load user_book error', userBookError);
    }
    if (userBookRow) {
        const ub = userBookRow;
        const prevCurrent = (_c = ub.current_page) !== null && _c !== void 0 ? _c : 0;
        const newCurrent = Math.max(prevCurrent, safeActualEndPage);
        let newStatus = (_d = ub.status) !== null && _d !== void 0 ? _d : 'reading';
        let completedAt = (_e = ub.completed_at) !== null && _e !== void 0 ? _e : null;
        if (ub.end_page && newCurrent >= ub.end_page) {
            newStatus = 'completed';
            completedAt = nowIso;
        }
        else if (newCurrent > 0 && ub.status === 'planned') {
            newStatus = 'reading';
        }
        const updateUserBook = {
            current_page: newCurrent,
            status: newStatus,
            updated_at: nowIso,
        };
        if (completedAt && !ub.completed_at) {
            updateUserBook.completed_at = completedAt;
        }
        const { error: ubUpdateError } = await db_1.supabase
            .from('user_books')
            .update(updateUserBook)
            .eq('id', updated.user_book_id)
            .eq('user_id', userId);
        if (ubUpdateError) {
            console.error('[finishReadingSession] update user_book error', ubUpdateError);
        }
    }
    return mapRowToSession(updated);
}
