/** Render 등에서 stdout 로그로 확인 — `.env` / Render Dashboard에 `API_DEBUG_LOGS=1` */

function envTruthy(v: string | undefined): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

export function apiDebugEnabled(): boolean {
  return envTruthy(process.env.API_DEBUG_LOGS);
}

export function apiDebugLog(tag: string, message: string, extra?: Record<string, unknown>): void {
  if (!apiDebugEnabled()) return;
  const payload = extra && Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : '';
  console.log(`[API_DEBUG][${tag}] ${message}${payload}`);
}
