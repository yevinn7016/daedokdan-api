// src/services/rankingService.ts


import { fetchBestSellers } from "../clients/aladinClient";

export async function getBookRanking() {
  const items = await fetchBestSellers();

  // ✅ 여기 추가
  if (!items || !Array.isArray(items)) {
    console.error("❌ items 없음:", items);
    return [];
  }

return items.map((item: any, index: number) => ({
    rank: index + 1,
    bookId: item.isbn13?.[0] ?? "",
    title: item.title?.[0] ?? "",
    authors: item.author?.[0] ?? "",
    coverUrl: item.cover?.[0] ?? "",
  }));
}