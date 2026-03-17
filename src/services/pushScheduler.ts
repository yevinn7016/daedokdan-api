import cron from 'node-cron';
import { sendPushToAll } from './pushService';

let started = false;

export function startPushScheduler(): void {
  if (started) return;
  started = true;

  // 매일 오전 8시
  cron.schedule(
    '0 8 * * *',
    async () => {
      try {
        console.log('⏰ Running daily recommendation push job...');
        await sendPushToAll({
          title: '📖 오늘의 추천 책',
          body: '오늘 이동 시간에 읽기 좋은 책을 확인해보세요.',
        });
      } catch (error) {
        console.error('❌ Recommendation push cron failed:', error);
      }
    },
    {
      timezone: 'Asia/Seoul',
    }
  );

  console.log('✅ Push scheduler started');
}