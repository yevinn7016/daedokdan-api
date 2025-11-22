// src/repositories/bookRepository.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('⚠️ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 .env에 없습니다.');
}

// 이 파일 안에서만 쓰는 supabase 클라이언트
const supabase = createClient(supabaseUrl ?? '', supabaseServiceRoleKey ?? '');

/**
 * 알라딘 검색 결과를 Supabase books 테이블에 upsert
 */
export async function upsertBooksFromAladinItems(items: any[]) {
  if (!items || items.length === 0) return;

  const rows = items.map((it: any) => {
    const authors =
      typeof it.author === 'string'
        ? it.author.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];

    const categories =
      typeof it.categoryName === 'string'
        ? [it.categoryName]
        : [];

    return {
      aladin_item_id: String(it.itemId),
      isbn13: it.isbn13 || it.isbn || null,
      title: it.title,
      authors,
      publisher: it.publisher,
      published_date: it.pubDate ? new Date(it.pubDate) : null,
      page_count: it.subInfo?.itemPage || null,
      language: 'ko',
      categories,
      thumbnail_url: it.cover,
      google_books_id: null,
    };
  });

  const { error } = await supabase
    .from('books')
    .upsert(rows, { onConflict: 'aladin_item_id' });

  if (error) {
    console.error('❌ Supabase books upsert error:', error);
    throw error;
  }
}

/**
 * aladin_item_id 로 books 테이블에서 한 권 가져오기
 */
export async function getBookByAladinItemId(aladinItemId: string) {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('aladin_item_id', aladinItemId)
    .maybeSingle();

  if (error) {
    console.error('❌ getBookByAladinItemId error', error);
    throw error;
  }

  return data; // 없으면 null
}

/**
 * book_id 로 book_details 조회
 */
export async function getBookDetailByBookId(bookId: string) {
  const { data, error } = await supabase
    .from('book_details')
    .select('*')
    .eq('book_id', bookId)
    .maybeSingle();

  if (error) {
    console.error('❌ getBookDetailByBookId error', error);
    throw error;
  }

  return data; // 없으면 null
}

/**
 * book_details upsert
 */
export async function upsertBookDetail(
  bookId: string,
  detail: {
    description: string | null;
    author_intro: string | null;
    publisher_review: string | null;
  }
) {
  const row = {
    book_id: bookId,
    description: detail.description,
    author_intro: detail.author_intro,
    publisher_review: detail.publisher_review,
    last_synced_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('book_details')
    .upsert(row, { onConflict: 'book_id' });

  if (error) {
    console.error('❌ book_details upsert error', error);
    throw error;
  }
}
