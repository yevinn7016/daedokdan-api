// src/index.ts
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import booksRouter from './routes/books';
import searchRouter from './routes/search';
import readingRouter from './routes/reading';
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// 📚 책 관련 (알라딘 검색, 상세 등)
app.use('/api', booksRouter);          // => /api/search/books, /api/books/:itemId ...

// 🔍 검색 기록 / 최근 본 책 관련
app.use('/api/search', searchRouter);  // => /api/search/recent, /api/search/recent-books ...
app.use('/api/reading', readingRouter);
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 daedokdan-api running on http://localhost:${PORT}`);
  console.log('🔗 search routes mounted at /api/search');
  console.log('📖 reading routes mounted at /api/reading');
});

