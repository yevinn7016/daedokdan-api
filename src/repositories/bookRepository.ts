// src/repositories/bookRepository.ts
import { supabase } from "../core/db";

/**
 * 알라딘 ItemSearch 결과를 Supabase books 테이블에 upsert
 */
export async function upsertBooksFromAladinItems(items: any[]) {
  if (!items || items.length === 0) return;

  const rows = items.map((it) => {
    const authors = it.author
      ? String(it.author)
          .split(",")
          .map((s: string) => s.trim())
          .filter((s: string) => !!s)
      : [];

    const categories = it.categoryName ? [String(it.categoryName)] : [];

    return {
      aladin_item_id: String(it.itemId),
      isbn13: it.isbn13 ?? it.isbn ?? null,
      title: it.title ?? null,
      authors,
      publisher: it.publisher ?? null,
      published_date: it.pubDate ?? null,
      page_count: null,
      language: "ko",
      categories,
      thumbnail_url: it.cover ?? null,
    };
  });

  const { error } = await supabase
    .from("books")
    .upsert(rows, { onConflict: "aladin_item_id" });

  if (error) {
    console.error("❌ books upsert error", error);
    throw error;
  }
}

export async function findBooksByPageRange(
  min: number,
  max?: number,
  limit: number = 20
) {
  let query = supabase
    .from("books")
    .select("*")
    .gte("page_count", min)
    .limit(limit);

  if (max) {
    query = query.lte("page_count", max);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
