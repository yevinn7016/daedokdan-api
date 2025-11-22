// src/routes/reading.ts
import express, { Request, Response } from 'express';
import * as userBooksRepository from '../repositories/userBooksRepository';
console.log("🔥 userBooksRepository exports:", userBooksRepository);
import {
  getBookshelfByUserId,
  getCurrentReadingByUserId,addBookToShelf,  
} from '../repositories/userBooksRepository';
import { recommendPortion } from '../services/recommendationService';
const router = express.Router();

// TODO: 실제 프로젝트의 User 타입/미들웨어에 맞게 수정
interface AuthedRequest extends Request {
  user?: {
    id: string;
    // 필요하면 email 등 추가
  };
}

/**
 * GET /api/reading/current
 * 현재 읽는 책 목록 (status = 'reading')
 */
router.get(
  '/current',
  async (req: AuthedRequest, res: Response) => {
    try {
      // 실제로는 JWT 미들웨어에서 세팅해주도록
      const userId =
        req.user?.id ?? (req.header('x-user-id') as string | undefined);

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: userId not found' });
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
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId =
        req.user?.id ?? (req.header('x-user-id') as string | undefined);

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: userId not found' });
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
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId =
        req.user?.id ?? (req.header('x-user-id') as string | undefined);

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: userId not found' });
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
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId =
        req.user?.id ?? (req.header('x-user-id') as string | undefined);

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: userId not found' });
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
      // 서비스에서 던진 에러 메시지가 있으면 그대로 내려줌 (디버깅용)
      const message = err?.message ?? 'Internal server error';
      return res.status(500).json({ message });
    }
  },
);


export default router;
