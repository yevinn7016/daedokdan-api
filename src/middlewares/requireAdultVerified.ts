import { Response } from 'express';
import { isUserAdultVerified } from '../clients/authClient';

/**
 * 성인 도서 접근 시 인증 여부 확인.
 * 접근 불가 시 403 응답을 보내고 false 반환.
 */
export async function requireAdultVerified(
  res: Response,
  userId: string | undefined,
  isAdult: boolean,
): Promise<boolean> {
  if (!isAdult) {
    return true;
  }

  if (!userId) {
    res.status(403).json({
      error: 'ADULT_VERIFICATION_REQUIRED',
      message: '성인 인증이 필요합니다.',
    });
    return false;
  }

  const verified = await isUserAdultVerified(userId);
  if (!verified) {
    res.status(403).json({
      error: 'ADULT_VERIFICATION_REQUIRED',
      message: '성인 인증이 필요합니다.',
    });
    return false;
  }

  return true;
}
