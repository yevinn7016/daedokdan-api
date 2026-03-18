"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserBasePpm = getUserBasePpm;
// src/repositories/userRepository.ts
const db_1 = require("../core/db");
/**
 * user_profiles.base_ppm 가져오기
 * - 없거나 0/음수면 null 리턴 (서비스에서 기본값으로 대체)
 */
async function getUserBasePpm(userId) {
    const { data, error } = await db_1.supabase
        .from('user_profiles') // 🔹 users → user_profiles 로 변경
        .select('base_ppm')
        .eq('user_id', userId) // 🔹 컬럼이 user_id 라고 가정 (FK)
        .maybeSingle();
    if (error) {
        console.error('[getUserBasePpm] error', error.message, error.details, error.hint);
        // 프로필이 아직 없거나 컬럼이 없을 수도 있으니, 그냥 null로 처리
        return null;
    }
    if (!data || data.base_ppm == null)
        return null;
    const basePpm = Number(data.base_ppm);
    if (!Number.isFinite(basePpm) || basePpm <= 0)
        return null;
    return basePpm;
}
