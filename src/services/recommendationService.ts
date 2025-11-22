// src/services/recommendationService.ts
import { supabase } from '../core/db';
import { getUserBasePpm } from '../repositories/userRepository';

export interface RecommendPortionInput {
  userId: string;
  bookId: string;
  availableMinutes: number;
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
}

/**
 * 분량 추천 핵심 서비스
 */
export async function recommendPortion({
  userId,
  bookId,
  availableMinutes,
}: RecommendPortionInput): Promise<RecommendPortionResult> {
  if (availableMinutes <= 0) {
    throw new Error('availableMinutes must be > 0');
  }

  // 1) user_books + books 조인해서 현재 진행 상황 + 전체 페이지 수 가져오기
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
        page_count
      )
    `,
    )
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .maybeSingle();

  if (error) {
    console.error('[recommendPortion] user_books query error', error.message, error.details, error.hint);
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
  const usedPpm = basePpm && basePpm > 0 ? basePpm : 0.8; // 기본 0.8 페이지/분 정도 (예시)

  // 3) 읽을 페이지 수 계산
  const rawPagesToRead = Math.max(1, Math.round(availableMinutes * usedPpm));

  // 4) 시작/끝 페이지 계산
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
  availableMinutes,
  usedPpm,
  isAlreadyCompleted,
};


  return result;
}
