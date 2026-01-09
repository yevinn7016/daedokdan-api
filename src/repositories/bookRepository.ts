// src/repositories/bookRepository.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * 알라딘 ItemSearch 결과를 Supabase books 테이블에 upsert
 */
export async function upsertBooksFromAladinItems(items: any[]) {
  if (!items || items.length === 0) return;

  const rows = items.map((it) => {
    const authors = it.author
      ? String(it.author)
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => !!s)
      : [];

    const categories = it.categoryName
      ? [String(it.categoryName)]
      : [];

    return {
      // books 테이블 컬럼 이름에 맞게 수정
      aladin_item_id: String(it.itemId),
      isbn13: it.isbn13 ?? it.isbn ?? null,
      title: it.title ?? null,
      authors,
      publisher: it.publisher ?? null,
      published_date: it.pubDate ?? null,
      page_count: null, // 상세에서 채움
      language: 'ko',
      categories,
      thumbnail_url: it.cover ?? null,
    };
  });

  const { error } = await supabase
    .from('books')
    .upsert(rows, { onConflict: 'aladin_item_id' });

  if (error) {
    console.error('❌ books upsert error', error);
    throw error;
  }
}
