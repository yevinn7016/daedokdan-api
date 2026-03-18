import cron from "node-cron";
import { updateYoutubeVideos } from "./youtubeService";

export function startYoutubeScheduler() {
  console.log("🕒 YouTube 스케줄러 시작");

  cron.schedule("0 * * * *", async () => {
    console.log("🔄 YouTube 업데이트 실행");
    await updateYoutubeVideos();
  });
}