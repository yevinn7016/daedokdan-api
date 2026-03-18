"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveRecentSearch = saveRecentSearch;
exports.getRecentSearches = getRecentSearches;
exports.deleteRecentSearch = deleteRecentSearch;
exports.clearRecentSearches = clearRecentSearches;
// src/repositories/searchRepository.ts
require("dotenv/config");
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = (_a = process.env.SUPABASE_URL) !== null && _a !== void 0 ? _a : '';
const supabaseServiceRoleKey = (_b = process.env.SUPABASE_SERVICE_ROLE_KEY) !== null && _b !== void 0 ? _b : '';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey);
const MAX_RECENT_SEARCHES = 20;
async function saveRecentSearch(userId, rawQuery) {
    const query = rawQuery.trim();
    if (!query)
        return;
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
    if (insertErr)
        throw insertErr;
    // 개수 제한
    const { data, error: fetchErr } = await supabase
        .from('search_queries')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (fetchErr)
        throw fetchErr;
    if (!data)
        return;
    if (data.length > MAX_RECENT_SEARCHES) {
        const idsToDelete = data.slice(MAX_RECENT_SEARCHES).map((row) => row.id);
        await supabase.from('search_queries').delete().in('id', idsToDelete);
    }
}
async function getRecentSearches(userId, limit = 10) {
    const { data, error } = await supabase
        .from('search_queries')
        .select('query, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data !== null && data !== void 0 ? data : [];
}
async function deleteRecentSearch(userId, query) {
    const trimmed = query.trim();
    if (!trimmed)
        return;
    const { error } = await supabase
        .from('search_queries')
        .delete()
        .eq('user_id', userId)
        .eq('query', trimmed);
    if (error)
        throw error;
}
async function clearRecentSearches(userId) {
    const { error } = await supabase
        .from('search_queries')
        .delete()
        .eq('user_id', userId);
    if (error)
        throw error;
}
