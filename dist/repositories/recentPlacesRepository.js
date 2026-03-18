"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveRecentPlaceForUser = exports.getRecentPlacesByUser = void 0;
// src/repositories/recentPlacesRepository.ts
const db_1 = require("../core/db");
/**
 * 최근 검색 조회
 */
const getRecentPlacesByUser = async (userId) => {
    const { data, error } = await db_1.supabase
        .from("recent_places")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
    if (error) {
        throw new Error(error.message);
    }
    return data;
};
exports.getRecentPlacesByUser = getRecentPlacesByUser;
/**
 * 최근 검색 저장
 */
const saveRecentPlaceForUser = async ({ userId, name, address, lat, lng, type, }) => {
    // 1️⃣ 기존 데이터 삭제 (중복 방지)
    const { error: deleteError } = await db_1.supabase
        .from("recent_places")
        .delete()
        .eq("user_id", userId)
        .eq("name", name);
    if (deleteError) {
        throw new Error(deleteError.message);
    }
    // 2️⃣ 새로 insert
    const { error: insertError } = await db_1.supabase
        .from("recent_places")
        .insert([
        {
            user_id: userId,
            name,
            address,
            lat,
            lng,
            type,
        },
    ]);
    if (insertError) {
        throw new Error(insertError.message);
    }
};
exports.saveRecentPlaceForUser = saveRecentPlaceForUser;
