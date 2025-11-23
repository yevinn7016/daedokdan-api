// src/routes/reading.ts
import express, { Request, Response } from 'express';
import * as userBooksRepository from '../repositories/userBooksRepository';
console.log('🔥 userBooksRepository exports:', userBooksRepository);
import {
  getBookshelfByUserId,
  getCurrentReadingByUserId,
  addBookToShelf,
} from '../repositories/userBooksRepository';
import { recommendPortion } from '../services/recommendationService';
import * as readingSessionsRepository from '../repositories/readingSessionsRepository';

console.log('🔥 readingSessionsRepository exports:', readingSessionsRepository);
const { createReadingSession, finishReadingSession } = readingSessionsRepository;

// ✅ auth 미들웨어 (books.ts, search.ts와 동일한 named import)
import { authMiddleware } from '../middlewares/auth';

const router = express.Router();

// 인증된 요청 타입
interface AuthedRequest extends Request {
  user?: {
    id: string;
  };
}

/**
 * GET /api/reading/current
 * 현재 읽는 책 목록 (status = 'reading')
 */
router.get(
  '/current',
  authMiddleware,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ message: 'Unauthorized: userId not found' });
      }

      const items = await getCurrentReadingByUserId(userId);
      return res.json({ items });
    } catch (err) {
      console.error('[GET /api/reading/current] error', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
);

/**
 * GET /api/reading/bookshelf
 * 책장 전체 (status별 그룹)
 */
router.get(
  '/bookshelf',
  authMiddleware,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ message: 'Unauthorized: userId not found' });
      }

      const bookshelf = await getBookshelfByUserId(userId);
      return res.json(bookshelf);
    } catch (err) {
      console.error('[GET /api/reading/bookshelf] error', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
);

/**
 * POST /api/reading/bookshelf
 * 내 서재에 책 담기
 */
router.post(
  '/bookshelf',
  authMiddleware,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ message: 'Unauthorized: userId not found' });
      }

      const { book_id } = req.body as { book_id?: string };

      if (!book_id) {
        return res.status(400).json({ message: 'book_id is required' });
      }

      const result = await addBookToShelf(userId, book_id);
      return res.status(result.alreadyExists ? 200 : 201).json(result);
    } catch (err) {
      console.error('[POST /api/reading/bookshelf] error', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
);

/**
 * POST /api/reading/recommend
 * body: { book_id, available_minutes }
 */
router.post(
  '/recommend',
  authMiddleware,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ message: 'Unauthorized: userId not found' });
      }

      const {
        book_id,
        bookId,
        available_minutes,
        availableMinutes,
      } = req.body as {
        book_id?: string;
        bookId?: string;
        available_minutes?: number;
        availableMinutes?: number;
      };

      const effectiveBookId = book_id ?? bookId;
      const effectiveMinutes = available_minutes ?? availableMinutes;

      if (!effectiveBookId) {
        return res.status(400).json({ message: 'book_id is required' });
      }

      if (
        effectiveMinutes == null ||
        typeof effectiveMinutes !== 'number' ||
        effectiveMinutes <= 0
      ) {
        return res
          .status(400)
          .json({ message: 'available_minutes must be a positive number' });
      }

      const result = await recommendPortion({
        userId,
        bookId: effectiveBookId,
        availableMinutes: effectiveMinutes,
      });

      return res.json(result);
    } catch (err: any) {
      console.error('[POST /api/reading/recommend] error', err);
      const message = err?.message ?? 'Internal server error';
      return res.status(500).json({ message });
    }
  },
);

/**
 * POST /api/reading/sessions
 * 읽기 세션 시작
 */
router.post(
  '/sessions',
  authMiddleware,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ message: 'Unauthorized: userId not found' });
      }

      const {
        user_book_id,
        book_id,
        start_page,
        end_page,
        planned_pages,
        session_type,
        commute_profile_id,
      } = req.body as {
        user_book_id?: string;
        book_id?: string;
        start_page?: number;
        end_page?: number;
        planned_pages?: number;
        session_type?: 'commute' | 'timer';
        commute_profile_id?: string | null;
      };

      if (!user_book_id) {
        return res.status(400).json({ message: 'user_book_id is required' });
      }
      if (!book_id) {
        return res.status(400).json({ message: 'book_id is required' });
      }
      if (
        start_page == null ||
        end_page == null ||
        typeof start_page !== 'number' ||
        typeof end_page !== 'number'
      ) {
        return res
          .status(400)
          .json({ message: 'start_page and end_page must be numbers' });
      }

      const session = await createReadingSession({
        userId,
        userBookId: user_book_id,
        bookId: book_id,
        startPage: start_page,
        endPage: end_page,
        plannedPages: planned_pages,
        sessionType: session_type,
        commuteProfileId: commute_profile_id,
      });

      return res.status(201).json(session);
    } catch (err) {
      console.error('[POST /api/reading/sessions] error', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
);

/**
 * PATCH /api/reading/sessions/:sessionId/finish
 * 읽기 세션 종료
 */
router.patch(
  '/sessions/:sessionId/finish',
  authMiddleware,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ message: 'Unauthorized: userId not found' });
      }

      const { sessionId } = req.params;
      const { end_page, actual_minutes } = req.body as {
        end_page?: number;
        actual_minutes?: number;
      };

      if (!sessionId) {
        return res.status(400).json({ message: 'sessionId is required' });
      }
      if (end_page == null || typeof end_page !== 'number' || end_page <= 0) {
        return res
          .status(400)
          .json({ message: 'end_page must be a positive number' });
      }
      if (
        actual_minutes == null ||
        typeof actual_minutes !== 'number' ||
        actual_minutes <= 0
      ) {
        return res
          .status(400)
          .json({ message: 'actual_minutes must be a positive number' });
      }

      const session = await finishReadingSession({
        userId,
        sessionId,
        actualEndPage: end_page,
        durationMinutes: actual_minutes,
      });

      return res.json(session);
    } catch (err: any) {
      console.error('[PATCH /api/reading/sessions/:id/finish] error', err);
      const message = err?.message ?? 'Internal server error';
      return res.status(500).json({ message });
    }
  },
);

export default router;
