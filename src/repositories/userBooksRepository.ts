// src/repositories/userBooksRepository.ts
import { supabase } from '../core/db';

export type BookStatus = 'planned' | 'reading' | 'completed' | 'dropped';

export interface CurrentReadingItem {
  userBookId: string;
  bookId: string;
  title: string;
  authors: string | null;
  coverUrl: string | null;
  currentPage: number;
  startPage: number | null;
  endPage: number | null;
  pageCount: number | null;
  progress: number; // 0~100
}

export interface BookshelfItem extends CurrentReadingItem {
  status: BookStatus;
  completedAt: string | null;
  startedAt: string | null;
}

export interface BookshelfGrouped {
  reading: BookshelfItem[];
  planned: BookshelfItem[];
  completed: BookshelfItem[];
  dropped: BookshelfItem[];
}

/* -------------------------------------------------------------------------- */
/*                         현재 읽는 책 목록 (READING)                        */
/* -------------------------------------------------------------------------- */
export async function getCurrentReadingByUserId(
  userId: string,
): Promise<CurrentReadingItem[]> {
  const { data, error } = await supabase
    .from('user_books')
    .select(
      `
      id,
      status,
      start_page,
      current_page,
      end_page,
      started_at,
      completed_at,
      updated_at,
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
    .eq('status', 'reading')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error(
      '[userBooksRepository] getCurrentReadingByUserId error',
      error.message,
      error.details,
      error.hint,
    );
    throw error;
  }

  if (!data) return [];

  return (data as any[]).map((row: any) => {
    const pageCount: number | null =
      row.end_page ??
      row.books?.page_count ??
      null;

    const currentPage: number = row.current_page ?? 0;

    const progress =
      pageCount && pageCount > 0 ? (currentPage / pageCount) * 100 : 0;

    const item: CurrentReadingItem = {
      userBookId: row.id,
      bookId: row.books?.id,
      title: row.books?.title ?? '제목 없음',
      authors: row.books?.authors ?? null,
      coverUrl: row.books?.thumbnail_url ?? null,
      startPage: row.start_page ?? null,
      currentPage,
      endPage: row.end_page ?? null,
      pageCount,
      progress,
    };

    return item;
  });
}

/* -------------------------------------------------------------------------- */
/*                           책장 전체 조회 (BOOKSHELF)                       */
/* -------------------------------------------------------------------------- */
export async function getBookshelfByUserId(
  userId: string,
): Promise<BookshelfGrouped> {
  const { data, error } = await supabase
    .from('user_books')
    .select(
      `
      id,
      status,
      start_page,
      current_page,
      end_page,
      started_at,
      completed_at,
      updated_at,
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
    .order('updated_at', { ascending: false });

  if (error) {
    console.error(
      '[userBooksRepository] getBookshelfByUserId error',
      error.message,
      error.details,
      error.hint,
    );
  }

  const grouped: BookshelfGrouped = {
    reading: [],
    planned: [],
    completed: [],
    dropped: [],
  };

  (data as any[] | null ?? []).forEach((row: any) => {
    const status: BookStatus = row.status;

    const pageCount: number | null =
      row.end_page ??
      row.books?.page_count ??
      null;

    const currentPage: number = row.current_page ?? 0;

    const progress =
      pageCount && pageCount > 0 ? (currentPage / pageCount) * 100 : 0;

    const item: BookshelfItem = {
      userBookId: row.id,
      bookId: row.books?.id,
      title: row.books?.title ?? '제목 없음',
      authors: row.books?.authors ?? null,
      coverUrl: row.books?.thumbnail_url ?? null,
      startPage: row.start_page ?? null,
      currentPage,
      endPage: row.end_page ?? null,
      pageCount,
      progress,
      status,
      completedAt: row.completed_at ?? null,
      startedAt: row.started_at ?? null,
    };

    if (!grouped[status]) {
      (grouped as any)[status] = [];
    }
    grouped[status].push(item);
  });

  return grouped;
}

/* -------------------------------------------------------------------------- */
/*                      책을 내 서재에 담기 (ADD TO BOOKSHELF)               */
/* -------------------------------------------------------------------------- */
export async function addBookToShelf(
  userId: string,
  bookId: string,
): Promise<{ item: BookshelfItem; alreadyExists: boolean }> {
  // 1) 이미 담겨 있는지 확인
  const { data: existing } = await supabase
    .from('user_books')
    .select(
      `
      id,
      status,
      start_page,
      current_page,
      end_page,
      started_at,
      completed_at,
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

  if (existing) {
    const row: any = existing;

    const pageCount: number | null =
      row.end_page ??
      row.books?.page_count ??
      null;

    const currentPage: number = row.current_page ?? 0;

    const progress =
      pageCount && pageCount > 0 ? (currentPage / pageCount) * 100 : 0;

    const item: BookshelfItem = {
      userBookId: row.id,
      bookId: row.books?.id,
      title: row.books?.title ?? '제목 없음',
      authors: row.books?.authors ?? null,
      coverUrl: row.books?.thumbnail_url ?? null,
      startPage: row.start_page ?? null,
      currentPage,
      endPage: row.end_page ?? null,
      pageCount,
      progress,
      status: row.status,
      completedAt: row.completed_at ?? null,
      startedAt: row.started_at ?? null,
    };

    return { item, alreadyExists: true };
  }

  // 2) books 테이블 정보 가져오기
  const { data: bookRows, error: bookError } = await supabase
    .from('books')
    .select('id, title, authors, thumbnail_url, page_count')
    .eq('id', bookId);

  if (bookError || !bookRows || bookRows.length === 0) {
    console.error('[addBookToShelf] book not found', bookError);
    throw bookError ?? new Error('Book not found');
  }

  const book: any = (bookRows as any[])[0];
  const endPage: number | null = book.page_count ?? null;

  // 3) user_books에 insert
  const { data: insertedRows, error: insertError } = await supabase
    .from('user_books')
    .insert({
      user_id: userId,
      book_id: bookId,
      status: 'planned',
      start_page: 1,
      current_page: 0,
      end_page: endPage,
    })
    .select(
      `
      id,
      status,
      start_page,
      current_page,
      end_page,
      started_at,
      completed_at
    `,
    );

  if (insertError || !insertedRows || insertedRows.length === 0) {
    console.error('[addBookToShelf] insert error', insertError);
    throw insertError ?? new Error('Failed to insert user_book');
  }

  const inserted: any = (insertedRows as any[])[0];

  const item: BookshelfItem = {
    userBookId: inserted.id,
    bookId: book.id,
    title: book.title ?? '제목 없음',
    authors: book.authors ?? null,
    coverUrl: book.thumbnail_url ?? null,
    startPage: inserted.start_page ?? null,
    currentPage: inserted.current_page ?? 0,
    endPage: inserted.end_page ?? null,
    pageCount: book.page_count ?? null,
    progress: 0,
    status: inserted.status,
    completedAt: inserted.completed_at ?? null,
    startedAt: inserted.started_at ?? null,
  };

  return { item, alreadyExists: false };
}
