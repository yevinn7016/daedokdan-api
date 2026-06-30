import fetch from 'node-fetch';
import { supabase } from '../core/db';

/**
 * 사용자 성인 인증 여부 조회
 * - AUTH_SERVICE_URL 설정 시 auth 내부 API 호출
 * - 미설정 시 동일 Supabase users.adult_verified 직접 조회 (로컬 개발용)
 */
export async function isUserAdultVerified(userId: string): Promise<boolean> {
  const authServiceUrl = process.env.AUTH_SERVICE_URL;

  if (authServiceUrl) {
    try {
      const res = await fetch(
        `${authServiceUrl}/api/internal/users/${userId}/adult-status`,
        {
          headers: {
            'X-Internal-Api-Key': process.env.INTERNAL_API_KEY ?? '',
          },
        },
      );

      if (!res.ok) {
        console.error('[authClient] adult-status failed', res.status);
        return false;
      }

      const data = (await res.json()) as { adultVerified?: boolean };
      return Boolean(data.adultVerified);
    } catch (err) {
      console.error('[authClient] adult-status error', err);
      return false;
    }
  }

  const { data, error } = await supabase
    .from('users')
    .select('adult_verified')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[authClient] users.adult_verified query error', error);
    return false;
  }

  return Boolean(data?.adult_verified);
}
