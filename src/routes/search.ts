// src/routes/search.ts
import { Router, Request, Response } from 'express';
import {
  getRecentSearches,
  deleteRecentSearch,
  clearRecentSearches,
} from '../repositories/searchRepository';
import {
  getRecentBooks,
  deleteRecentBook,
  clearRecentBooks,
} from '../repositories/recentBooksRepository';

// ✅ 토큰 기반 인증 미들웨어
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// 인증된 요청 타입 (선택)
interface AuthedRequest extends Request {
  user?: {
    id: string;
  };
}

/**
 * GET /api/search/recent
 * - 최근 검색어 텍스트 리스트
 */
router.get('/recent', authMiddleware, async (req: AuthedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    // authMiddleware가 있으니 거의 안 들어오지만 방어용
    return res.json({ items: [] });
  }

  const limit = Number(req.query.limit ?? 10);

  try {
    const items = await getRecentSearches(userId, limit);
    return res.json({ items });
  } catch (err) {
    console.error('❌ getRecentSearches error', err);
    return res.status(500).json({ message: 'Failed to fetch recent searches' });
  }
});

/**
 * DELETE /api/search/recent
 * - query 파라미터가 있으면 해당 검색어만 삭제
 * - 없으면 전체 삭제
 */
router.delete('/recent', authMiddleware, async (req: AuthedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const q = (req.query.query as string | undefined) ?? undefined;

  try {
    if (q) {
      await deleteRecentSearch(userId, q);
    } else {
      await clearRecentSearches(userId);
    }
    return res.status(204).send();
  } catch (err) {
    console.error('❌ delete/clear recent searches error', err);
    return res.status(500).json({ message: 'Failed to delete recent searches' });
  }
});

/**
 * GET /api/search/recent-books
 * - 최근 본 책 카드 리스트
 */
router.get(
  '/recent-books',
  authMiddleware,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ items: [] });
    }

    const limit = Number(req.query.limit ?? 10);

    try {
      const items = await getRecentBooks(userId, limit);
      return res.json({ items });
    } catch (err) {
      console.error('❌ getRecentBooks error', err);
      return res.status(500).json({ message: 'Failed to fetch recent books' });
    }
  },
);

/**
 * DELETE /api/search/recent-books/:bookId
 * - 특정 책만 최근 목록에서 제거
 */
router.delete(
  '/recent-books/:bookId',
  authMiddleware,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { bookId } = req.params;

    try {
      await deleteRecentBook(userId, bookId);
      return res.status(204).send();
    } catch (err) {
      console.error('❌ deleteRecentBook error', err);
      return res.status(500).json({ message: 'Failed to delete recent book' });
    }
  },
);

/**
 * DELETE /api/search/recent-books
 * - 최근 본 책 전체 제거
 */
router.delete(
  '/recent-books',
  authMiddleware,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      await clearRecentBooks(userId);
      return res.status(204).send();
    } catch (err) {
      console.error('❌ clearRecentBooks error', err);
      return res.status(500).json({ message: 'Failed to clear recent books' });
    }
  },
);

export default router;
