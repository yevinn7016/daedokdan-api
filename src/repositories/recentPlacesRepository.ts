// src/repositories/recentPlacesRepository.ts
import { supabase } from "../core/db";

/**
 * 최근 검색 조회
 */
export const getRecentPlacesByUser = async (userId: string) => {
  const { data, error } = await supabase
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

/**
 * 최근 검색 저장
 */
export const saveRecentPlaceForUser = async ({
  userId,
  name,
  address,
  lat,
  lng,
  type,
}: {
  userId: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  type?: string;
}) => {
  // 1️⃣ 기존 데이터 삭제 (중복 방지)
  const { error: deleteError } = await supabase
    .from("recent_places")
    .delete()
    .eq("user_id", userId)
    .eq("name", name);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  // 2️⃣ 새로 insert
  const { error: insertError } = await supabase
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