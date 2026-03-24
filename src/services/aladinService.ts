import axios from "axios";
import { config } from "../core/config";

const BASE_URL = "https://www.aladin.co.kr/ttb/api/ItemList.aspx";

export async function fetchBooks(
  categoryId: number,
  queryType: "Bestseller" | "ItemNewAll" = "Bestseller",
  maxResults: number = 10,
  start: number = 1
) {
  const res = await axios.get(BASE_URL, {
    params: {
      TTBKey: config.aladinTtbKey,
      QueryType: queryType,
      CategoryId: categoryId,
      MaxResults: maxResults,
      start,
      SearchTarget: "Book",
      Output: "JS",
      Version: "20131101",
    },
  });

  const items = Array.isArray(res.data?.item) ? res.data.item : [];
  return items.map((item: any) => ({
    aladin_item_id: item.itemId,
    isbn13: item.isbn13,
    title: item.title,
    authors: item.author ? item.author.split(",") : [],
    publisher: item.publisher,
    published_date: item.pubDate,
    page_count: 0, // 알라딘 기본 없음 → 추후 detail API로 보완
    language: "ko",
    categories: [item.categoryName],
    thumbnail_url: item.cover,
    google_books_id: null,
  }));
}

export async function fetchBooksByCategory(categoryId: number) {
  return fetchBooks(categoryId, "Bestseller", 15);
}