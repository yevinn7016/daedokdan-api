// src/index.ts
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import booksRouter from './routes/books';
import searchRouter from './routes/search';
import readingRouter from './routes/reading';
import commuteRoutes from './routes/commute';
import pushRoutes from './routes/push';

// 🔥 push scheduler 추가
import { startPushScheduler } from './services/pushScheduler';

const app = express();

/* =========================
   Middleware
========================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   Health Check
========================= */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

/* =========================
   Routes
========================= */

// 📚 책 관련
app.use('/api', booksRouter);

// 🔍 검색 관련
app.use('/api/search', searchRouter);

// 📖 독서 관련
app.use('/api/reading', readingRouter);

import { startYoutubeScheduler } from "./services/youtubeScheduler";

// 기존 코드 아래에 추가
startYoutubeScheduler();

import bookPickRoutes from "./routes/bookPick";

app.use("/api/book-picks", bookPickRoutes);



// 🔥 스케줄러 시작
startYoutubeScheduler();
// 🚆 통근 관련
app.use('/api/commute', commuteRoutes);

// 🔔 푸시 알림 관련 (🔥 추가)
app.use('/api/push', pushRoutes);
import rankingRoutes from "./routes/ranking";

app.use("/api/ranking", rankingRoutes);
/* =========================
   Scheduler (🔥 추가)
========================= */
startPushScheduler();

/* =========================
   Server Start
========================= */
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 daedokdan-api running on http://localhost:${PORT}`);
  console.log('🔗 search routes mounted at /api/search');
  console.log('📖 reading routes mounted at /api/reading');
  console.log('🔔 push routes mounted at /api/push');
});