import { AuthedRequest } from '../middlewares/auth';
import { isUserAdultVerified } from '../clients/authClient';

/**
 * 성인 도서 전면 비노출 모드.
 * 기본값 true — HIDE_ADULT_BOOKS=false 일 때만 인증 완료 사용자에게 노출.
 */
export function isAdultContentHidden(): boolean {
  return process.env.HIDE_ADULT_BOOKS !== 'false';
}

export function filterAdultBooks<T extends { adult?: boolean }>(
  books: T[],
  adultVerified: boolean,
): T[] {
  if (adultVerified) {
    return books;
  }
  return books.filter((book) => !book.adult);
}

export async function resolveAdultVerified(req: AuthedRequest): Promise<boolean> {
  if (isAdultContentHidden()) {
    return false;
  }

  const userId = req.user?.id;
  if (!userId) {
    return false;
  }
  return isUserAdultVerified(userId);
}

export function parseAladinAdult(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return parseAladinAdult(value[0]);
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
}
