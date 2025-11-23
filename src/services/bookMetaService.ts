// src/services/bookMetaService.ts
import { supabase } from '../core/db';
import { getBookDetailFromAladin } from '../clients/aladinClient';

export async function ensureBookPageCountByBookId(bookId: string): Promise<number | null> {
  const { data: book, error } = await supabase
    .from('books')
    .select('id, isbn13, page_count')
    .eq('id', bookId)
    .maybeSingle();

  if (error || !book) {
    console.error('[ensureBookPageCountByBookId] books query error', error);
    return null;
  }

  // 이미 있으면 그대로
  if (book.page_count && book.page_count > 0) {
    return book.page_count;
  }

  // 없으면 알라딘 상세 호출 (isbn13 기준 예시)
  if (!book.isbn13) return null;

  try {
    const detail = await getBookDetailFromAladin(book.isbn13); // 또는 aladin_item_id
    const newPageCount = detail.page ?? null;

    if (!newPageCount || newPageCount <= 0) {
      return null;
    }

    const { error: updateError } = await supabase
      .from('books')
      .update({ page_count: newPageCount })
      .eq('id', bookId);

    if (updateError) {
      console.error('[ensureBookPageCountByBookId] update error', updateError);
    }

    return newPageCount;
  } catch (e) {
    console.error('[ensureBookPageCountByBookId] external API error', e);
    return null;
  }
}
