"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveRecentRouteForUser = exports.getRecentRoutesByUser = void 0;
// src/repositories/recentRoutesRepository.ts
const db_1 = require("../core/db");
/**
 * 최근 경로 조회
 */
const getRecentRoutesByUser = async (userId) => {
    const { data, error } = await db_1.supabase
        .from("recent_routes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
    if (error)
        throw new Error(error.message);
    return data;
};
exports.getRecentRoutesByUser = getRecentRoutesByUser;
/**
 * 최근 경로 저장
 */
const saveRecentRouteForUser = async ({ userId, origin, destination, }) => {
    // 1️⃣ 기존 동일 경로 삭제 (중복 방지)
    await db_1.supabase
        .from("recent_routes")
        .delete()
        .eq("user_id", userId)
        .eq("origin_lat", origin.lat)
        .eq("origin_lng", origin.lng)
        .eq("destination_lat", destination.lat)
        .eq("destination_lng", destination.lng);
    // 2️⃣ insert
    const { error } = await db_1.supabase.from("recent_routes").insert([
        {
            user_id: userId,
            origin_name: origin.name,
            origin_lat: origin.lat,
            origin_lng: origin.lng,
            destination_name: destination.name,
            destination_lat: destination.lat,
            destination_lng: destination.lng,
        },
    ]);
    if (error)
        throw new Error(error.message);
};
exports.saveRecentRouteForUser = saveRecentRouteForUser;
