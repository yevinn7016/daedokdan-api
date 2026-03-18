"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
// src/core/db.ts
const supabase_js_1 = require("@supabase/supabase-js");
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 .env에 없습니다.');
}
const supabaseUrl = (_a = process.env.SUPABASE_URL) !== null && _a !== void 0 ? _a : '';
const supabaseServiceRoleKey = (_b = process.env.SUPABASE_SERVICE_ROLE_KEY) !== null && _b !== void 0 ? _b : '';
console.log('[db.ts] SUPABASE_URL =', supabaseUrl);
console.log('[db.ts] SERVICE_ROLE_KEY length =', supabaseServiceRoleKey.length);
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey);
console.log('[db.ts] supabase created? type =', typeof exports.supabase);
