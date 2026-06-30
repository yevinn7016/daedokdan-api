import { AuthedRequest } from '../middlewares/auth';
import { isUserAdultVerified } from '../clients/authClient';

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
