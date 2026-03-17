import { supabase } from "../core/db";

export type UserDeviceRow = {
  id: string;
  user_id: string;
  fcm_token: string;
  created_at: string;
};

// ✅ 토큰 저장 (UPSERT)
export async function saveDeviceToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from("user_devices")
    .upsert(
      {
        user_id: userId,
        fcm_token: token,
      },
      {
        onConflict: "fcm_token",
      }
    );

  if (error) throw error;
}

// ✅ 토큰 삭제
export async function deleteDeviceToken(token: string): Promise<void> {
  const { error } = await supabase
    .from("user_devices")
    .delete()
    .eq("fcm_token", token);

  if (error) throw error;
}

// ✅ 특정 유저 토큰 조회
export async function getUserTokens(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_devices")
    .select("fcm_token")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? []).map((row) => row.fcm_token);
}

// ✅ 전체 토큰 조회
export async function getAllTokens(): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_devices")
    .select("fcm_token")
    .not("fcm_token", "is", null);

  if (error) throw error;

  // 중복 제거
  const tokens = (data ?? []).map((row) => row.fcm_token);
  return [...new Set(tokens)];
}