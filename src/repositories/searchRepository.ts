// src/repositories/searchRepository.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const MAX_RECENT_SEARCHES = 20;

export async function saveRecentSearch(userId: string, rawQuery: string) {
  const query = rawQuery.trim();
  if (!query) return;

  // 같은 검색어 있으면 삭제
  await supabase
    .from('search_queries')
    .delete()
    .eq('user_id', userId)
    .eq('query', query);

  // 새로 삽입
  const { error: insertErr } = await supabase
    .from('search_queries')
    .insert({ user_id: userId, query });
  if (insertErr) throw insertErr;

  // 개수 제한
  const { data, error: fetchErr } = await supabase
    .from('search_queries')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (fetchErr) throw fetchErr;
  if (!data) return;

  if (data.length > MAX_RECENT_SEARCHES) {
    const idsToDelete = data.slice(MAX_RECENT_SEARCHES).map((row) => row.id);
    await supabase.from('search_queries').delete().in('id', idsToDelete);
  }
}

export async function getRecentSearches(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('search_queries')
    .select('query, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function deleteRecentSearch(userId: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;

  const { error } = await supabase
    .from('search_queries')
    .delete()
    .eq('user_id', userId)
    .eq('query', trimmed);

  if (error) throw error;
}

export async function clearRecentSearches(userId: string) {
  const { error } = await supabase
    .from('search_queries')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}
