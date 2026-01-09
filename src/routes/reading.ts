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
import { getPlaceById } from '../repositories/placesCacheRepository';
// ✅ auth 미들웨어
import { authMiddleware } from '../middlewares/auth';
import { searchPubTransRoutes } from '../services/odsayService';
import { normalizeOdsayRoutes } from '../services/odsayNormalize';
// 🔹 page_count 보정용
import { supabase } from '../core/db';
import { getBookDetailFromAladin, getBookDetailByIsbnFromAladin  } from '../clients/aladinClient';


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
 * POST /api/reading/recommend/commute
 * 
 * body:
 * {
 *   book_id: string,
 *   user_book_id: string,
 *   origin_place_id: string,
 *   destination_place_id: string,
 *   selected_route_id: string
 * }
 */
router.post(
  '/recommend/commute',
  authMiddleware,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: userId not found' });
      }

      const {
        book_id,
        user_book_id,
        origin_place_id,
        destination_place_id,
        selected_route_id,
      } = req.body as {
        book_id?: string;
        user_book_id?: string;
        origin_place_id?: string;
        destination_place_id?: string;
        selected_route_id?: string;
      };

      // 1️⃣ 필수값 체크
      if (!book_id) {
        return res.status(400).json({ message: 'book_id is required' });
      }
      if (!user_book_id) {
        return res.status(400).json({ message: 'user_book_id is required' });
      }
      if (!origin_place_id || !destination_place_id || !selected_route_id) {
        return res.status(400).json({
          message: 'origin_place_id, destination_place_id, selected_route_id are required',
        });
      }

      // 2️⃣ placeId → 좌표 조회
      const origin = await getPlaceById(String(origin_place_id));
      const dest = await getPlaceById(String(destination_place_id));

      if (
        !origin ||
        !dest ||
        origin.lat == null ||
        origin.lng == null ||
        dest.lat == null ||
        dest.lng == null
      ) {
        return res.status(400).json({
          message: 'Invalid placeId. Please search places again.',
        });
      }

      // 3️⃣ ODsay 호출 → 경로 생성
      const raw = await searchPubTransRoutes({
        sx: Number(origin.lng),
        sy: Number(origin.lat),
        ex: Number(dest.lng),
        ey: Number(dest.lat),
        lang: 0,
      });

      const normalized: any = normalizeOdsayRoutes(raw);

      if (normalized?.odsayError) {
        return res.status(502).json({ message: normalized.odsayError });
      }

      const routes = normalized.routes ?? [];
      const selected = routes.find(
        (r: any) => String(r.id) === String(selected_route_id),
      );

      if (!selected) {
        return res.status(400).json({
          message: `selected_route_id not found: ${selected_route_id}`,
        });
      }

      const availableMinutes = Number(selected.totalMinutes);
      if (!availableMinutes || availableMinutes <= 0) {
        return res.status(500).json({
          message: 'Invalid commute time from selected route',
        });
      }

      // 4️⃣ 분량 추천
      const recommendation = await recommendPortion({
        userId: userId,
        bookId: book_id,
        availableMinutes,
      });

      // 5️⃣ 응답
      return res.json({
        ...recommendation,
        meta: {
          userBookId: user_book_id,
          originPlaceId: origin_place_id,
          destinationPlaceId: destination_place_id,
          selectedRouteId: selected_route_id,
          availableMinutes,
          selectedRouteSummary: {
            tag: selected.tag ?? null,
            totalMinutes: selected.totalMinutes ?? null,
            walkMinutes: selected.walkMinutes ?? null,
            transfers: selected.transfers ?? null,
            fare: selected.fare ?? null,
          },
        },
      });
    } catch (err: any) {
      console.error('[POST /api/reading/recommend/commute] error', err);
      return res.status(500).json({
        message: err?.message ?? 'Internal server error',
      });
    }
  },
);



/**
 * POST /api/reading/bookshelf
 * 내 서재에 책 담기
 *
 * body: { book_id: string }
 * response: { item, alreadyExists }
 *  - 여기서 item.pageCount / item.endPage가 비어있으면
 *    알라딘 상세 API로 page_count를 채워서 books / user_books / 응답을 보정한다.
 */
/**
 * POST /api/reading/bookshelf
 * 내 서재에 책 담기 + pageCount 보정
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

      // 1) 기존 로직: 내 책장에 추가
      const result = await addBookToShelf(userId, book_id);
      let { item } = result;

      // -------------------------------
      // 2) pageCount / endPage 보정 로직
      // -------------------------------
      try {
        console.log('📚 [bookshelf] before fix item =', item);

        // 이미 값이 있으면 굳이 안 건드림
        if (item.pageCount && item.pageCount > 0 && item.endPage) {
          return res
            .status(result.alreadyExists ? 200 : 201)
            .json(result);
        }

        // (1) books 테이블에서 isbn13, page_count 가져오기
        const { data: bookRow, error: bookError } = await supabase
          .from('books')
          .select('id, isbn13, page_count')
          .eq('id', item.bookId)
          .maybeSingle();

        console.log('📚 [bookshelf] bookRow from DB =', bookRow, bookError);

        if (!bookRow) {
          // 책 메타도 없으면 더 이상 할 수 있는 게 없음
          return res
            .status(result.alreadyExists ? 200 : 201)
            .json(result);
        }

        let newPageCount: number | null = null;

        // (2) DB에 이미 page_count가 있으면 그걸 쓰자
        if (bookRow.page_count && bookRow.page_count > 0) {
          newPageCount = bookRow.page_count;
          console.log('📚 [bookshelf] use existing page_count =', newPageCount);
        } else if (bookRow.isbn13) {
          // (3) 없으면 알라딘 상세 API 호출
          console.log('📚 [bookshelf] call Aladin with isbn13 =', bookRow.isbn13);

// ...

          const detail: any = await getBookDetailFromAladin(bookRow.isbn13);
          console.log('📚 [bookshelf] Aladin detail =', JSON.stringify(detail, null, 2));

          /**
           * 알라딘 ItemLookUp 응답에서 페이지 수 파싱
           *
           * 케이스별로 최대한 커버:
           * 1) detail.page
           * 2) detail.item.page
           * 3) detail.items[0].page
           * 4) detail.item[0].subInfo.itemPage  ← 지금 로그에 해당되는 케이스
           */
          if (typeof detail?.page === 'number') {
            newPageCount = detail.page;
          } else if (typeof detail?.item?.page === 'number') {
            newPageCount = detail.item.page;
          } else if (
            Array.isArray(detail?.items) &&
            detail.items[0] &&
            typeof detail.items[0].page === 'number'
          ) {
            newPageCount = detail.items[0].page;
          } else if (
            Array.isArray(detail?.item) &&
            detail.item[0] &&
            typeof detail.item[0]?.subInfo?.itemPage === 'number'
          ) {
            newPageCount = detail.item[0].subInfo.itemPage; // ✅ 여기!
          }

          console.log('📚 [bookshelf] parsed newPageCount =', newPageCount);


          console.log('📚 [bookshelf] parsed newPageCount =', newPageCount);

          // (4) DB에 page_count 업데이트
          if (newPageCount && newPageCount > 0) {
            const { error: updateBookError } = await supabase
              .from('books')
              .update({ page_count: newPageCount })
              .eq('id', bookRow.id);

            if (updateBookError) {
              console.error(
                '[bookshelf] books update error',
                updateBookError,
              );
            }
          }
        }

        // (5) user_books.end_page도 비어있고, newPageCount가 있다면 채워주기
        if (
          newPageCount &&
          newPageCount > 0 &&
          (item.endPage == null || item.endPage <= 0)
        ) {
          const { error: updateUserBookError } = await supabase
            .from('user_books')
            .update({ end_page: newPageCount })
            .eq('id', item.userBookId);

          if (updateUserBookError) {
            console.error(
              '[bookshelf] user_books update error',
              updateUserBookError,
            );
          } else {
            item.endPage = newPageCount;
          }
        }

        // (6) 응답 item.pageCount 보정
        if (newPageCount && newPageCount > 0) {
          item.pageCount = newPageCount;
        }

        console.log('📚 [bookshelf] after fix item =', item);

        const finalResult = { ...result, item };
        return res
          .status(finalResult.alreadyExists ? 200 : 201)
          .json(finalResult);
      } catch (fixErr) {
        console.error('[POST /api/reading/bookshelf] fix error', fixErr);
        // 보정에 실패하더라도 기본 result는 보내준다
        return res.status(result.alreadyExists ? 200 : 201).json(result);
      }
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
router.post('/sessions', authMiddleware, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: userId not found' });
    }

    const {
      user_book_id,
      book_id,
      start_page,
      end_page,
      planned_pages,
      session_type,

      // ✅ commute 선택용
      origin_place_id,
      destination_place_id,
      selected_route_id,
    } = req.body as {
      user_book_id?: string;
      book_id?: string;
      start_page?: number;
      end_page?: number;
      planned_pages?: number;
      session_type?: 'commute' | 'timer';

      origin_place_id?: string;
      destination_place_id?: string;
      selected_route_id?: string;
    };

    if (!user_book_id) return res.status(400).json({ message: 'user_book_id is required' });
    if (!book_id) return res.status(400).json({ message: 'book_id is required' });

    if (
      start_page == null ||
      end_page == null ||
      typeof start_page !== 'number' ||
      typeof end_page !== 'number'
    ) {
      return res.status(400).json({ message: 'start_page and end_page must be numbers' });
    }

    const effectiveType: 'commute' | 'timer' = session_type ?? 'timer';

    // ✅ COMMUTE 세션: 선택 경로 저장 포함
    if (effectiveType === 'commute') {
      if (!origin_place_id || !destination_place_id || !selected_route_id) {
        return res.status(400).json({
          message: 'origin_place_id, destination_place_id, selected_route_id are required for commute session',
        });
      }

      const origin = await getPlaceById(String(origin_place_id));
      const dest = await getPlaceById(String(destination_place_id));

      if (!origin || !dest || origin.lat == null || origin.lng == null || dest.lat == null || dest.lng == null) {
        return res.status(400).json({
          message: 'placeId not found or missing lat/lng. Please call /api/commute/places/search first.',
        });
      }

      const raw = await searchPubTransRoutes({
        sx: Number(origin.lng),
        sy: Number(origin.lat),
        ex: Number(dest.lng),
        ey: Number(dest.lat),
        lang: 0,
      });

      const normalized: any = normalizeOdsayRoutes(raw);
      if (normalized?.odsayError) {
        return res.status(502).json({ message: normalized.odsayError });
      }

      const routes = normalized.routes ?? [];
      const selected = routes.find((r: any) => String(r.id) === String(selected_route_id));
      if (!selected) {
        return res.status(400).json({ message: `selected_route_id not found: ${selected_route_id}` });
      }

      const session = await createReadingSession({
        userId,
        userBookId: user_book_id,
        bookId: book_id,
        startPage: start_page,
        endPage: end_page,
        plannedPages: planned_pages,
        sessionType: 'commute',
        commuteProfileId: null,

        // ✅ 저장 필드들 (repo 확장한 최종본 기준)
        originPlaceId: String(origin_place_id),
        destinationPlaceId: String(destination_place_id),
        selectedRouteId: String(selected_route_id),

        commuteTotalMinutes: selected.totalMinutes ?? null,
        commuteWalkMinutes: selected.walkMinutes ?? null,
        commuteTransfers: selected.transfers ?? null,
        commuteFare: selected.fare ?? null,
        commuteRouteJson: selected,
      });

      return res.status(201).json(session);
    }

    // ✅ TIMER 세션 (기존)
    const session = await createReadingSession({
      userId,
      userBookId: user_book_id,
      bookId: book_id,
      startPage: start_page,
      endPage: end_page,
      plannedPages: planned_pages,
      sessionType: 'timer',
      commuteProfileId: null,
    });

    return res.status(201).json(session);
  } catch (err) {
    console.error('[POST /api/reading/sessions] error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PATCH /api/reading/sessions/:sessionId/finish
 * 읽기 세션 종료
 *
 * body: { end_page, actual_minutes }
 */
router.patch('/sessions/:sessionId/finish', authMiddleware, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: userId not found' });
    }

    const { sessionId } = req.params;
    const { end_page, actual_minutes } = req.body as {
      end_page?: number;
      actual_minutes?: number;
    };

    if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });

    if (end_page == null || typeof end_page !== 'number' || end_page <= 0) {
      return res.status(400).json({ message: 'end_page must be a positive number' });
    }

    if (actual_minutes == null || typeof actual_minutes !== 'number' || actual_minutes <= 0) {
      return res.status(400).json({ message: 'actual_minutes must be a positive number' });
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
});

export default router;
