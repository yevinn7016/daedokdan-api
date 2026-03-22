import cron from "node-cron";
import { updateYoutubeVideos } from "./youtubeService";

export function startYoutubeScheduler() {
  console.log("🕒 YouTube 스케줄러 시작");

  cron.schedule("0 * * * *", async () => {
    console.log("🔄 YouTube 업데이트 실행");
    await updateYoutubeVideos();
  });
}
// src/services/recommendationService.ts

import { findBooksByPageRange } from "../repositories/bookRepository";

function getPageFilter(range: string) {
  switch (range) {
    case "0-100":
      return { min: 0, max: 100 };
    case "100-200":
      return { min: 101, max: 200 };
    case "200-400":
      return { min: 201, max: 400 };
    case "400+":
      return { min: 401, max: undefined };
    default:
      return { min: 0, max: 100 };
  }
}

// 랜덤 섞기
function shuffle<T>(array: T[]): T[] {
  return array.sort(() => Math.random() - 0.5);
}

export async function getBooksByPageRange(
  range: string,
  limit: number = 10
) {
  const { min, max } = getPageFilter(range);

  const books = await findBooksByPageRange(min, max, 50);

  return shuffle(books).slice(0, limit);
}