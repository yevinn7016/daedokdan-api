// src/core/db.ts
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 .env에 없습니다.');
}

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

console.log('[db.ts] SUPABASE_URL =', supabaseUrl);
console.log('[db.ts] SERVICE_ROLE_KEY length =', supabaseServiceRoleKey.length);

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

console.log('[db.ts] supabase created? type =', typeof supabase);
