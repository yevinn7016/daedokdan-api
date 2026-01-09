// src/repositories/readingSessionsRepository.ts
import { supabase } from '../core/db';

export type SessionType = 'commute' | 'timer';

export interface ReadingSession {
  id: string;
  userId: string;
  bookId: string;
  userBookId: string;
  commuteProfileId: string | null;

  startedAt: string | null;
  endedAt: string | null;
  effectiveMinutes: number | null;

  plannedStartPage: number | null;
  plannedEndPage: number | null;
  plannedPages: number | null;

  actualStartPage: number | null;
  actualEndPage: number | null;
  actualPages: number | null;

  sessionType: SessionType;

  // ✅ 통근 경로 선택 저장 정보 (세션마다)
  originPlaceId: string | null;
  destinationPlaceId: string | null;
  selectedRouteId: string | null;

  commuteTotalMinutes: number | null;
  commuteWalkMinutes: number | null;
  commuteTransfers: number | null;
  commuteFare: number | null;
  commuteRouteJson: any | null;

  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateSessionInput {
  userId: string;
  userBookId: string;
  bookId: string;
  startPage: number;
  endPage: number;
  plannedPages?: number; // 없으면 end-start+1
  sessionType?: SessionType; // 기본 'commute'
  commuteProfileId?: string | null;

  // ✅ commute일 때만 사용 (placeId 기반)
  originPlaceId?: string;
  destinationPlaceId?: string;
  selectedRouteId?: string;

  commuteTotalMinutes?: number | null;
  commuteWalkMinutes?: number | null;
  commuteTransfers?: number | null;
  commuteFare?: number | null;
  commuteRouteJson?: any;
}

export interface FinishSessionInput {
  userId: string;
  sessionId: string;
  actualEndPage: number;
  durationMinutes: number; // effective_minutes
}

function mapRowToSession(row: any): ReadingSession {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    userBookId: row.user_book_id,
    commuteProfileId: row.commute_profile_id ?? null,

    startedAt: row.started_at ?? null,
    endedAt: row.ended_at ?? null,
    effectiveMinutes: row.effective_minutes != null ? Number(row.effective_minutes) : null,

    plannedStartPage: row.planned_start_page ?? null,
    plannedEndPage: row.planned_end_page ?? null,
    plannedPages: row.planned_pages ?? null,

    actualStartPage: row.actual_start_page ?? null,
    actualEndPage: row.actual_end_page ?? null,
    actualPages: row.actual_pages ?? null,

    sessionType: row.session_type,

    // ✅ commute 선택정보
    originPlaceId: row.origin_place_id ?? null,
    destinationPlaceId: row.destination_place_id ?? null,
    selectedRouteId: row.selected_route_id ?? null,

    commuteTotalMinutes: row.commute_total_minutes != null ? Number(row.commute_total_minutes) : null,
    commuteWalkMinutes: row.commute_walk_minutes != null ? Number(row.commute_walk_minutes) : null,
    commuteTransfers: row.commute_transfers != null ? Number(row.commute_transfers) : null,
    commuteFare: row.commute_fare != null ? Number(row.commute_fare) : null,
    commuteRouteJson: row.commute_route_json ?? null,

    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
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
export async function createReadingSession(params: CreateSessionInput): Promise<ReadingSession> {
  const {
    userId,
    userBookId,
    bookId,
    startPage,
    endPage,
    plannedPages,
    sessionType = 'commute',
    commuteProfileId = null,

    // ✅ commute 선택정보
    originPlaceId,
    destinationPlaceId,
    selectedRouteId,
    commuteTotalMinutes = null,
    commuteWalkMinutes = null,
    commuteTransfers = null,
    commuteFare = null,
    commuteRouteJson = null,
  } = params;

  const nowIso = new Date().toISOString();
  const pages = plannedPages ?? Math.max(1, endPage - startPage + 1);

  // ✅ commute일 때는 선택정보가 들어오는지 검증(원하면 routes에서 이미 검증했으니 약하게 할 수도 있음)
  const isCommute = sessionType === 'commute';

  const insertRow: Record<string, any> = {
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
    insertRow.origin_place_id = originPlaceId ?? null;
    insertRow.destination_place_id = destinationPlaceId ?? null;
    insertRow.selected_route_id = selectedRouteId ?? null;

    insertRow.commute_total_minutes = commuteTotalMinutes;
    insertRow.commute_walk_minutes = commuteWalkMinutes;
    insertRow.commute_transfers = commuteTransfers;
    insertRow.commute_fare = commuteFare;
    insertRow.commute_route_json = commuteRouteJson;
  }

  const { data, error } = await supabase
    .from('reading_sessions')
    .insert(insertRow)
    .select(SESSION_SELECT)
    .single();

  if (error || !data) {
    console.error('[createReadingSession] insert error', error);
    throw error ?? new Error('Failed to create reading session');
  }

  return mapRowToSession(data);
}

/** 🔹 세션 종료 + user_books.current_page 반영 */
export async function finishReadingSession(params: FinishSessionInput): Promise<ReadingSession> {
  const { userId, sessionId, actualEndPage, durationMinutes } = params;

  // 1) 세션 조회
  const { data: sessionRow, error: sessionError } = await supabase
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

  const s: any = sessionRow;
  const nowIso = new Date().toISOString();

  const actualStartPage = s.actual_start_page ?? s.planned_start_page ?? 1;

  const safeActualEndPage = Math.max(actualStartPage, actualEndPage);
  const actualPages = Math.max(0, safeActualEndPage - actualStartPage + 1);

  // 2) reading_sessions 업데이트
  const { data: updatedRows, error: updateError } = await supabase
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
    throw updateError ?? new Error('Failed to update reading session');
  }

  const updated: any = updatedRows[0];

  // 3) user_books 업데이트 (진도 반영)
  const { data: userBookRow, error: userBookError } = await supabase
    .from('user_books')
    .select('id, user_id, current_page, end_page, status, completed_at')
    .eq('id', updated.user_book_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (userBookError) {
    console.error('[finishReadingSession] load user_book error', userBookError);
  }

  if (userBookRow) {
    const ub: any = userBookRow;
    const prevCurrent = ub.current_page ?? 0;
    const newCurrent = Math.max(prevCurrent, safeActualEndPage);

    let newStatus: string = ub.status ?? 'reading';
    let completedAt: string | null = ub.completed_at ?? null;

    if (ub.end_page && newCurrent >= ub.end_page) {
      newStatus = 'completed';
      completedAt = nowIso;
    } else if (newCurrent > 0 && ub.status === 'planned') {
      newStatus = 'reading';
    }

    const updateUserBook: Record<string, any> = {
      current_page: newCurrent,
      status: newStatus,
      updated_at: nowIso,
    };
    if (completedAt && !ub.completed_at) {
      updateUserBook.completed_at = completedAt;
    }

    const { error: ubUpdateError } = await supabase
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
