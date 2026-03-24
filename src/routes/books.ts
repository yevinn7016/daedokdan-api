// src/routes/books.ts
import { Router, Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';


import {
  searchBooksFromAladin,
  getBookDetailFromAladin,
  getBookDetailByIsbnFromAladin,
} from '../clients/aladinClient';
import { fetchGoogleBook } from '../clients/googleBooksClient';
import { upsertBooksFromAladinItems } from '../repositories/bookRepository';
import { saveRecentSearch } from '../repositories/searchRepository';
import { addRecentBook } from '../repositories/recentBooksRepository';

// ✅ 토큰 기반 인증 미들웨어 (named import)
import { authMiddleware } from '../middlewares/auth';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const router = Router();

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
  authMiddleware,
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
        return res.status(401).json({ message: 'Unauthorized: userId not found' });
      }

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
// src/routes/books.ts

import express from "express";
import { getBooksByPageRange } from "../services/recommendationService";



// GET /api/books/by-pages?range=0-100
router.get("/by-pages", async (req, res) => {
  try {
    const { range = "0-100", limit = "10" } = req.query;

    const books = await getBooksByPageRange(
      String(range),
      Number(limit)
    );

    res.json({
      success: true,
      data: { books },
      error: null,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message,
    });
  }
});

/**
 * GET /api/books/:itemId
 * - 알라딘 + 구글북스 하이브리드 상세
 * - book_details 저장 + books 업데이트 + 최근 본 책 기록 + 판매처 링크 포함
 */
router.get(
  '/:itemId',
  authMiddleware,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const { itemId } = req.params;
    if (!/^\d+$/.test(itemId)) {
      return next();
    }

    try {
      let detailItem: any | null = null;

      const { data: initialBook, error: bookErr } = await supabase
        .from('books')
        .select('*')
        .or(`aladin_item_id.eq.${itemId},isbn13.eq.${itemId}`)
        .maybeSingle();

      if (bookErr) {
        console.error('❌ books select error', bookErr);
        return res.status(500).json({ message: 'Database error (books)' });
      }

      let book: any = initialBook;
      if (!book) {
        // DB에 없으면 알라딘 상세로 즉시 조회 후 books upsert 시도
        let bootstrapRaw = await getBookDetailFromAladin(itemId);
        if ((!bootstrapRaw?.item || bootstrapRaw.item.length === 0) && /^\d{13}$/.test(itemId)) {
          bootstrapRaw = await getBookDetailByIsbnFromAladin(itemId);
        }
        detailItem = bootstrapRaw.item && bootstrapRaw.item[0];

        if (!detailItem) {
          return res.status(404).json({ message: 'No detail info from Aladin' });
        }

        await upsertBooksFromAladinItems([detailItem]);

        const { data: hydratedBook, error: hydrateErr } = await supabase
          .from('books')
          .select('*')
          .or(`aladin_item_id.eq.${itemId},isbn13.eq.${itemId}`)
          .maybeSingle();

        if (hydrateErr) {
          console.error('❌ books reselect error after upsert', hydrateErr);
          return res.status(500).json({ message: 'Database error (books)' });
        }

        if (!hydratedBook) {
          return res.status(404).json({ message: 'Failed to persist book from Aladin' });
        }

        book = hydratedBook;
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

      // 알라딘 상세 (초기 부트스트랩에서 이미 조회했다면 재사용)
      if (!detailItem) {
        const lookupId = String((book as any).aladin_item_id ?? itemId);
        let raw = await getBookDetailFromAladin(lookupId);
        if ((!raw?.item || raw.item.length === 0) && (book as any).isbn13) {
          raw = await getBookDetailByIsbnFromAladin(String((book as any).isbn13));
        }
        detailItem = raw.item && raw.item[0];
      }

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

      // 작가 소개
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

import { fetchBooks, fetchBooksByCategory } from "../services/aladinService";
import { upsertBooks } from "../repositories/bookRepository";



/**
 * 📚 카테고리별 책 조회 API
 * GET /api/books/category?categoryId=51391
 */
router.get("/category", async (req, res) => {
  try {
    const categoryId = Number(req.query.categoryId);

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        error: "categoryId required",
      });
    }

    // 1️⃣ 알라딘에서 가져오기
    const booksFromAladin = await fetchBooksByCategory(categoryId);

    // 2️⃣ DB 저장 (중복 방지)
    const savedBooks = await upsertBooks(booksFromAladin);

    // 3️⃣ 응답 구조 맞추기
    const result = savedBooks.map((book: any) => ({
      id: book.id,
      isbn13: book.isbn13,
      title: book.title,
      authors: book.authors,
      publisher: book.publisher,
      published_date: book.published_date,
      page_count: book.page_count,
      language: book.language,
      categories: book.categories,
      thumbnail_url: book.thumbnail_url,
      google_books_id: book.google_books_id,
      created_at: book.created_at,
      aladin_item_id: book.aladin_item_id,
    }));

    res.json({
      success: true,
      data: {
        books: result,
      },
      error: null,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

import { CATEGORY_MAP } from "../config/categoryMap";


router.get("/sections", async (req, res) => {
  try {
    const categoryKey = req.query.category as keyof typeof CATEGORY_MAP;

    const category = CATEGORY_MAP[categoryKey];

    if (!category) {
      return res.status(400).json({
        success: false,
        error: "invalid category",
      });
    }

    const ids = category.ids;

    // 🔥 병렬 호출
    const results = await Promise.all(
      ids.map(async (id: number) => {
        const [newBooks, bestBooks] = await Promise.all([
          fetchBooks(id, "ItemNewAll"),
          fetchBooks(id, "Bestseller"),
        ]);

        return {
          newBooks,
          bestBooks,
        };
      })
    );

    // 🔥 합치기
    const newBooks = results.flatMap((r) => r.newBooks).slice(0, 20);
    const bestBooks = results.flatMap((r) => r.bestBooks).slice(0, 20);

    res.json({
      success: true,
      data: {
        category: category.name,
        sections: [
          {
            title: `${category.name} 신작`,
            books: newBooks,
          },
          {
            title: `${category.name} 베스트`,
            books: bestBooks,
          },
        ],
      },
    });

  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
export default router;