// src/services/recommendationService.ts
import { supabase } from '../core/db';
import { getUserBasePpm } from '../repositories/userRepository';

export interface RecommendPortionInput {
  userId: string;
  bookId: string;
  availableMinutes: number; // 여기서는 T_eff(유효통근분 or 타이머 시간)으로 해석
}

export interface RecommendPortionResult {
  userBookId: string;
  bookId: string;
  title: string;
  authors: string | null;
  coverUrl: string | null;
  currentPage: number;
  startPage: number;
  endPage: number;
  pagesToRead: number;
  pageCount: number;
  remainingPages: number;
  availableMinutes: number;
  usedPpm: number;
  isAlreadyCompleted: boolean;

  // 🔽 정식 산정식 디버깅용 (원하면 프론트에서 안 써도 됨)
  difficultyFactor?: number;
  slackFactor?: number;
}

// 🔹 난이도 계수(D) 계산: 카테고리/장르 기반 초기 맵핑
function getDifficultyFactor(categories: string[] | null | undefined): number {
  if (!categories || categories.length === 0) {
    return 1.0; // 기본값
  }

  const catStr = categories.join(' / '); // ex) "국내도서>소설>한국소설"

  if (catStr.includes('만화') || catStr.toLowerCase().includes('comic')) {
    return 1.3; // 만화
  }
  if (catStr.includes('시') || catStr.includes('시집')) {
    return 1.1; // 시집
  }
  if (catStr.includes('에세이')) {
    return 0.95; // 에세이
  }
  if (catStr.includes('인문') || catStr.includes('경제') || catStr.includes('경영')) {
    return 0.9; // 인문·경제
  }
  if (catStr.includes('학술') || catStr.includes('전문서') || catStr.includes('교재')) {
    return 0.8; // 학술/전문서
  }
  if (catStr.includes('소설')) {
    return 1.0; // 일반 소설
  }

  return 1.0; // fallback
}


// 🔹 여유 계수(ε) 계산: 최근 1주 reading_sessions 기반 자동 조정
async function getSlackFactor(userId: string): Promise<number> {
  const baseEpsilon = 0.9;
  const minEpsilon = 0.85;
  const maxEpsilon = 0.95;

  // 1) 최근 7일 기준 시간 계산
  const now = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(now.getDate() - 7);

  // 2) 최근 7일 간의 세션 데이터 가져오기
  const { data, error } = await supabase
    .from('reading_sessions')
    .select('planned_pages, actual_pages, started_at')
    .eq('user_id', userId)
    .gte('started_at', oneWeekAgo.toISOString());

  if (error) {
    console.error('[getSlackFactor] reading_sessions query error', error.message, error.details);
    return baseEpsilon;
  }

  if (!data || data.length === 0) {
    // 최근 세션이 없으면 기본값
    return baseEpsilon;
  }

  // 3) 유효한 세션만 필터링 (planned_pages > 0 && actual_pages not null)
  const validSessions = data.filter((s: any) => {
    const planned = s.planned_pages;
    const actual = s.actual_pages;
    return typeof planned === 'number' && planned > 0 && typeof actual === 'number';
  });

  if (validSessions.length < 3) {
    // 샘플이 너무 적으면 아직 조정하지 않음
    return baseEpsilon;
  }

  // 4) 계획 대비 실제 비율 평균 계산
  let sumRatio = 0;
  for (const s of validSessions) {
    const planned = s.planned_pages as number;
    const actual = s.actual_pages as number;
    const ratio = actual / planned;
    // 너무 이상한 값은 클램프 (0 ~ 2배 사이로)
    const clippedRatio = Math.max(0, Math.min(2, ratio));
    sumRatio += clippedRatio;
  }

  const avgRatio = sumRatio / validSessions.length;

  // 5) avgRatio에 따라 ε 조정
  let delta = 0;
  if (avgRatio < 0.8) {
    // 계획보다 항상 많이 못 채움 → 목표 완화
    delta = -0.03;
  } else if (avgRatio < 0.95) {
    // 살짝 부족 → 약간 완화
    delta = -0.01;
  } else if (avgRatio <= 1.05) {
    // 거의 딱 맞음 → 유지
    delta = 0;
  } else if (avgRatio <= 1.2) {
    // 살짝 초과 → 살짝 상향
    delta = 0.01;
  } else {
    // 많이 초과 → 좀 더 상향
    delta = 0.03;
  }

  let epsilon = baseEpsilon + delta;

  // 6) 0.85 ~ 0.95 범위로 클램프
  if (epsilon < minEpsilon) epsilon = minEpsilon;
  if (epsilon > maxEpsilon) epsilon = maxEpsilon;

  return epsilon;
}


/**
 * 분량 추천 핵심 서비스 (정식 산정식 버전)
 *
 * N = T_eff × PPM × D × ε
 */
export async function recommendPortion({
  userId,
  bookId,
  availableMinutes,
}: RecommendPortionInput): Promise<RecommendPortionResult> {
  if (availableMinutes <= 0) {
    throw new Error('availableMinutes must be > 0');
  }

  // 1) user_books + books 조인해서 현재 진행 상황 + 전체 페이지 수 + 카테고리 가져오기
  const { data: row, error } = await supabase
    .from('user_books')
    .select(
      `
      id,
      status,
      start_page,
      current_page,
      end_page,
      books:book_id (
        id,
        title,
        authors,
        thumbnail_url,
        page_count,
        categories
      )
    `,
    )
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .maybeSingle();

  if (error) {
    console.error(
      '[recommendPortion] user_books query error',
      error.message,
      error.details,
      error.hint,
    );
    throw new Error('failed to load user_book');
  }

  if (!row) {
    throw new Error('user_book not found for this user/book');
  }

  const r: any = row;

  const pageCount: number | null =
    r.end_page ??
    r.books?.page_count ??
    null;

  if (!pageCount || pageCount <= 0) {
    throw new Error('pageCount is not available for this book');
  }

  const currentPage: number = r.current_page ?? 0;
  const title: string = r.books?.title ?? '제목 없음';

  // 이미 완독 상태인지 체크
  const isAlreadyCompleted = currentPage >= pageCount;

  // 2) 사용자 기본 PPM 가져오기 (없으면 기본값 사용)
  const basePpm = await getUserBasePpm(userId);
  const usedPpm = basePpm && basePpm > 0 ? basePpm : 0.8; // 기본 0.8 페이지/분

  // 3) 난이도 계수(D) & 여유 계수(ε) 계산
  const difficultyFactor = getDifficultyFactor(r.books?.categories);
  const slackFactor = await getSlackFactor(userId);

  // 4) 읽을 페이지 수 계산 (정식 산정식)
  //    N = T_eff × PPM × D × ε
  console.log("=========================================");
  console.log("[recommendPortion] 계산 과정");
  console.log("-----------------------------------------");
  console.log(`T_eff (availableMinutes) = ${availableMinutes}`);
  console.log(`PPM (usedPpm)            = ${usedPpm}`);
  console.log(`난이도 계수(D)           = ${difficultyFactor}`);
  console.log(`여유계수(ε)              = ${slackFactor}`);

  const calc = availableMinutes * usedPpm * difficultyFactor * slackFactor;
  console.log("");
  console.log(`→ rawPagesToRead 계산`);
  console.log(`  = round(${availableMinutes} × ${usedPpm} × ${difficultyFactor} × ${slackFactor})`);
  console.log(`  = round(${calc})`);
  console.log("");

  const rawPagesToRead = Math.max(
    1,
    Math.round(availableMinutes * usedPpm * difficultyFactor * slackFactor),
  );

  // 5) 시작/끝 페이지 계산
  const startPage = Math.min(currentPage + 1, pageCount);
  let endPage = Math.min(pageCount, startPage + rawPagesToRead - 1);

  // 이미 끝까지 다 읽은 경우
  let pagesToRead = 0;
  if (startPage > pageCount) {
    endPage = pageCount;
    pagesToRead = 0;
  } else {
    pagesToRead = endPage - startPage + 1;
  }

  const remainingPages = Math.max(0, pageCount - currentPage);

  const result: RecommendPortionResult = {
    userBookId: r.id,
    bookId: r.books?.id ?? bookId,
    title,
    authors: r.books?.authors ?? null,
    coverUrl: r.books?.thumbnail_url ?? null,
    currentPage,
    startPage,
    endPage,
    pagesToRead,
    pageCount,
    remainingPages,
    availableMinutes, // = T_eff
    usedPpm,
    isAlreadyCompleted,
    difficultyFactor,
    slackFactor,
  };

  return result;
}
// src/services/recommendationService.ts

import { findBooksByPageRange } from "../repositories/bookRepository";

function getPageFilter(range: string) {
  switch (range) {
    case "0-100":
      return { min: 0, max: 100 };
    case "100-200":
      return { min: 101, max: 200 };
    case "200-400":
      return { min: 201, max: 400 };
    case "400+":
      return { min: 401, max: undefined };
    default:
      return { min: 0, max: 100 };
  }
}

// 랜덤 섞기
function shuffle<T>(array: T[]): T[] {
  return array.sort(() => Math.random() - 0.5);
}

export async function getBooksByPageRange(
  range: string,
  limit: number = 10
) {
  const { min, max } = getPageFilter(range);

  const books = await findBooksByPageRange(min, max, 50);

  return shuffle(books).slice(0, limit);
}
