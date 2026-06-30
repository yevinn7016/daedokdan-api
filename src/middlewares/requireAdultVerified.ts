import { Response } from 'express';
import { isUserAdultVerified } from '../clients/authClient';
import { isAdultContentHidden } from '../utils/adultBookFilter';

/**
 * 성인 도서 접근 시 인증 여부 확인.
 * HIDE_ADULT_BOOKS 모드(기본)면 404, 미인증이면 403.
 */
export async function requireAdultVerified(
  res: Response,
  userId: string | undefined,
  isAdult: boolean,
): Promise<boolean> {
  if (!isAdult) {
    return true;
  }

  if (isAdultContentHidden()) {
    res.status(404).json({ message: 'Book not found' });
    return false;
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
