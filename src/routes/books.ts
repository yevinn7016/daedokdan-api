// src/routes/books.ts
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

import { searchBooksFromAladin, getBookDetailFromAladin } from '../clients/aladinClient';
import { fetchGoogleBook } from '../clients/googleBooksClient';
import { upsertBooksFromAladinItems } from '../repositories/bookRepository';
import { saveRecentSearch } from '../repositories/searchRepository';
import { addRecentBook } from '../repositories/recentBooksRepository';

// ✅ 토큰 기반 인증 미들웨어
import { authMiddleware } from '../middlewares/auth';


const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const router = Router();

// 인증된 요청 타입 (선택)
interface AuthedRequest extends Request {
  user?: {
    id: string;
  };
}

/**
 * GET /api/search/books?q=검색어
 * - 알라딘 Keyword 검색 + Supabase books upsert
 * - 최근 검색어 저장
 */
router.get(
  '/search/books',
  authMiddleware, // ✅ 로그인 필수
  async (req: AuthedRequest, res: Response) => {
    try {
      const q = (req.query.q as string) || '';
      if (!q.trim()) {
        return res.status(400).json({ message: 'q(query) is required' });
      }

      const raw = await searchBooksFromAladin(q, 10);
      const items = raw.item || [];

      await upsertBooksFromAladinItems(items);

      const mapped = items.map((it: any) => ({
        aladin_item_id: String(it.itemId),
        title: it.title,
        author: it.author,
        publisher: it.publisher,
        pubDate: it.pubDate,
        cover: it.cover,
        description: it.description,
        link: it.link,
        isbn: it.isbn13 || it.isbn,
      }));

      const userId = req.user?.id;
      if (!userId) {
        // authMiddleware가 있기 때문에 여기에 들어올 일은 거의 없지만 방어코드
        return res.status(401).json({ message: 'Unauthorized: userId not found' });
      }

      // 최근 검색어는 실패해도 메인 응답은 보내기 위해 fire-and-forget
      saveRecentSearch(userId, q).catch((err) =>
        console.error('❌ failed to save recent search', err),
      );

      return res.json({
        total: raw.totalResults,
        items: mapped,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Aladin search failed' });
    }
  },
);

/**
 * GET /api/books/:itemId
 * - 알라딘 + 구글북스 하이브리드 상세
 * - book_details 저장 + books 업데이트 + 최근 본 책 기록 + 판매처 링크 포함
 */
router.get(
  '/books/:itemId',
  authMiddleware, // ✅ 최근 본 책 기록 때문에 로그인 필요하게 처리
  async (req: AuthedRequest, res: Response) => {
    const { itemId } = req.params;

    try {
      const { data: book, error: bookErr } = await supabase
        .from('books')
        .select('*')
        .eq('aladin_item_id', itemId)
        .maybeSingle();

      if (bookErr) {
        console.error('❌ books select error', bookErr);
        return res.status(500).json({ message: 'Database error (books)' });
      }

      if (!book) {
        return res.status(404).json({
          message:
            'Book not found in local DB. 먼저 /api/search/books 로 검색해서 저장해야 합니다.',
        });
      }

      const bookId = (book as any).id as string;
      const isbn13 = (book as any).isbn13 as string | null;
      const title = (book as any).title as string | null;
      const authorsFromDb = (book as any).authors as string[] | null;

      const userIdForRecent = req.user?.id;
      if (!userIdForRecent) {
        return res.status(401).json({ message: 'Unauthorized: userId not found' });
      }

      addRecentBook(userIdForRecent, bookId).catch((err) =>
        console.error('❌ failed to add recent book', err),
      );

      const { data: detailRow, error: detailErr } = await supabase
        .from('book_details')
        .select('*')
        .eq('book_id', bookId)
        .maybeSingle();

      if (detailErr) {
        console.error('❌ book_details select error', detailErr);
      }

      // 알라딘 상세
      const raw = await getBookDetailFromAladin(itemId);
      const detailItem = raw.item && raw.item[0];

      if (!detailItem) {
        return res.status(404).json({ message: 'No detail info from Aladin' });
      }

      // 페이지 수 / 서브 정보
      const subInfo = detailItem.subInfo ?? {};
      const authorsArr: any[] = Array.isArray(detailItem.authors)
        ? detailItem.authors
        : [];

      const aladinPageCount: number | null =
        typeof subInfo.itemPage === 'number'
          ? subInfo.itemPage
          : subInfo.itemPage
          ? Number(subInfo.itemPage)
          : null;

      // 작가 소개: 루트 authorInfo 혹은 authors[].authorInfo
      let authorIntro: string | null = null;
      if (typeof detailItem.authorInfo === 'string' && detailItem.authorInfo.trim()) {
        authorIntro = detailItem.authorInfo.trim();
      }
      if (!authorIntro) {
        for (const a of authorsArr) {
          if (typeof a.authorInfo === 'string' && a.authorInfo.trim()) {
            authorIntro = a.authorInfo.trim();
            break;
          }
        }
      }

      // 책 소개
      const rawFullDesc =
        subInfo.fullDescription ??
        detailItem.fullDescription ??
        detailItem.description ??
        null;

      const aladinDescription: string | null =
        typeof rawFullDesc === 'string' && rawFullDesc.trim()
          ? rawFullDesc
          : null;

      // 출판사 서평
      const rawPublisherReview =
        subInfo.fullDescription2 ??
        detailItem.fullDescription2 ??
        detailItem.publisherReview ??
        null;

      const aladinPublisherReview: string | null =
        typeof rawPublisherReview === 'string' && rawPublisherReview.trim()
          ? rawPublisherReview
          : null;

      // 구글북스 보강
      const googleBook = await fetchGoogleBook({
        isbn13,
        title,
        authors: authorsFromDb,
      });

      const finalDescription: string | null =
        aladinDescription ??
        (googleBook?.description && googleBook.description.trim()
          ? googleBook.description
          : null) ??
        (detailRow?.description ?? null);

      const finalAuthorIntro: string | null =
        (authorIntro && authorIntro.trim()) ??
        (detailRow?.author_intro ?? null) ??
        null;

      const finalPublisherReview: string | null =
        aladinPublisherReview ??
        (detailRow?.publisher_review ?? null) ??
        null;

      let finalPageCount: number | null = (book as any).page_count ?? null;
      if (!finalPageCount && aladinPageCount) {
        finalPageCount = aladinPageCount;
      }
      if (!finalPageCount && googleBook?.page_count) {
        finalPageCount = googleBook.page_count;
      }

      // 카테고리 merge
      const mergedCategories = Array.from(
        new Set([
          ...(((book as any).categories as string[] | null) ?? []),
          ...(googleBook?.categories ?? []),
        ]),
      );

      // books 업데이트
      const bookUpdate: any = {};

      if (!(book as any).page_count && finalPageCount) {
        bookUpdate.page_count = finalPageCount;
      }
      if (mergedCategories.length > 0) {
        bookUpdate.categories = mergedCategories;
      }
      if (!(book as any).thumbnail_url && googleBook?.thumbnail_url) {
        bookUpdate.thumbnail_url = googleBook.thumbnail_url;
      }
      if (!(book as any).language && googleBook?.language) {
        bookUpdate.language = googleBook.language;
      }
      if (!(book as any).google_books_id && googleBook?.google_id) {
        bookUpdate.google_books_id = googleBook.google_id;
      }

      if (Object.keys(bookUpdate).length > 0) {
        const { error: bookUpdateErr } = await supabase
          .from('books')
          .update(bookUpdate)
          .eq('id', bookId);

        if (bookUpdateErr) {
          console.error('❌ books update error (merge)', bookUpdateErr);
        }
      }

      // book_details upsert
      const { error: upsertErr } = await supabase
        .from('book_details')
        .upsert(
          {
            book_id: bookId,
            description: finalDescription,
            author_intro: finalAuthorIntro,
            publisher_review: finalPublisherReview,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: 'book_id' },
        );

      if (upsertErr) {
        console.error('❌ book_details upsert error', upsertErr);
      }

      // 판매처 링크
      const purchaseLinks = {
        aladin: detailItem.link ?? null,
        yes24: isbn13 ? `https://www.yes24.com/search?query=${isbn13}` : null,
        kyobo: isbn13
          ? `https://product.kyobobook.co.kr/search?keyword=${isbn13}`
          : null,
        google_books: googleBook?.google_id
          ? `https://books.google.com/books?id=${googleBook.google_id}`
          : null,
        naver: isbn13
          ? `https://search.shopping.naver.com/book/search?query=${isbn13}`
          : null,
      };

      return res.json({
        ...book,
        aladin_link: detailItem.link ?? null,
        page_count: finalPageCount,
        categories: mergedCategories,
        thumbnail_url:
          (book as any).thumbnail_url ?? googleBook?.thumbnail_url ?? null,
        language: (book as any).language ?? googleBook?.language ?? 'ko',
        google_books_id:
          (book as any).google_books_id ?? googleBook?.google_id ?? null,
        purchase_links: purchaseLinks,
        detail: {
          description: finalDescription,
          author_intro: finalAuthorIntro,
          publisher_review: finalPublisherReview,
        },
      });
    } catch (err) {
      console.error('❌ /api/books/:itemId error', err);
      return res.status(500).json({ message: 'Book detail fetch failed' });
    }
  },
);

export default router;
