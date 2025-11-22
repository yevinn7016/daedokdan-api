// src/repositories/recentBooksRepository.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const MAX_RECENT_BOOKS = 20;

/**
 * 최근 본 책 추가
 * - 같은 책이 이미 있으면 지우고 다시 넣어서 맨 위로
 * - user당 최대 MAX_RECENT_BOOKS 개만 유지
 */
export async function addRecentBook(userId: string, bookId: string) {
  // 같은 책 있으면 삭제
  await supabase
    .from('user_recent_books')
    .delete()
    .eq('user_id', userId)
    .eq('book_id', bookId);

  // 새로 추가
  const { error: insertErr } = await supabase
    .from('user_recent_books')
    .insert({ user_id: userId, book_id: bookId });

  if (insertErr) throw insertErr;

  // 최대 개수 초과 시 오래된 것 삭제
  const { data, error: fetchErr } = await supabase
    .from('user_recent_books')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (fetchErr) throw fetchErr;
  if (!data) return;

  if (data.length > MAX_RECENT_BOOKS) {
    const idsToDelete = data.slice(MAX_RECENT_BOOKS).map((row) => row.id);
    await supabase
      .from('user_recent_books')
      .delete()
      .in('id', idsToDelete);
  }
}

/**
 * 최근 본 책 리스트 조회
 */
export async function getRecentBooks(userId: string, limit = 10) {
  const { data: recentRows, error: recentErr } = await supabase
    .from('user_recent_books')
    .select('book_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (recentErr) throw recentErr;
  if (!recentRows || recentRows.length === 0) return [];

  const ids = recentRows.map((r) => r.book_id);

  const { data: books, error: booksErr } = await supabase
    .from('books')
    .select('*')
    .in('id', ids);

  if (booksErr) throw booksErr;

  const bookMap = new Map<string, any>();
  (books ?? []).forEach((b) => bookMap.set(b.id, b));

  return recentRows
    .map((row) => ({
      book: bookMap.get(row.book_id),
      created_at: row.created_at,
    }))
    .filter((item) => !!item.book);
}

/**
 * 특정 책만 최근 목록에서 제거
 */
export async function deleteRecentBook(userId: string, bookId: string) {
  const { error } = await supabase
    .from('user_recent_books')
    .delete()
    .eq('user_id', userId)
    .eq('book_id', bookId);

  if (error) throw error;
}

/**
 * 최근 본 책 전체 제거
 */
export async function clearRecentBooks(userId: string) {
  const { error } = await supabase
    .from('user_recent_books')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}
