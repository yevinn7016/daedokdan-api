// src/clients/googleBooksClient.ts
import fetch from 'node-fetch';
import 'dotenv/config';

const GOOGLE_BOOKS_BASE_URL = 'https://www.googleapis.com/books/v1/volumes';
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY ?? '';

type GoogleBookQueryInput = {
  isbn13?: string | null;
  title?: string | null;
  authors?: string[] | null;
};

/**
 * Google Books에서 한 권 검색해서 가장 관련도 높은 책 1권만 돌려주는 함수
 */
export async function fetchGoogleBook(
  input: GoogleBookQueryInput
): Promise<null | {
  google_id: string;
  title?: string;
  authors?: string[];
  description?: string;
  page_count?: number;
  categories?: string[];
  thumbnail_url?: string;
  language?: string;
}> {
  let q = '';

  if (input.isbn13) {
    q = `isbn:${input.isbn13}`;
  } else if (input.title) {
    const authorPart =
      input.authors && input.authors.length > 0
        ? `+inauthor:${encodeURIComponent(input.authors[0])}`
        : '';
    q = `intitle:${encodeURIComponent(input.title)}${authorPart}`;
  } else {
    return null;
  }

  const url = new URL(GOOGLE_BOOKS_BASE_URL);
  url.searchParams.set('q', q);
  url.searchParams.set('maxResults', '1');
  if (GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set('key', GOOGLE_BOOKS_API_KEY);
  }

  console.log('🌐 [GoogleBooks] request:', url.toString());

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    console.error('❌ [GoogleBooks] error:', res.status, res.statusText, text);
    return null;
  }

  const data = (await res.json()) as any;

  if (!data.items || data.items.length === 0) return null;

  const item = data.items[0];
  const volume = item.volumeInfo || {};

  return {
    google_id: item.id,
    title: volume.title,
    authors: volume.authors ?? [],
    description: volume.description,
    page_count: volume.pageCount,
    categories: volume.categories ?? [],
    thumbnail_url:
      volume.imageLinks?.thumbnail ?? volume.imageLinks?.smallThumbnail,
    language: volume.language,
  };
}
