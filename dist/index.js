"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const books_1 = __importDefault(require("./routes/books"));
const search_1 = __importDefault(require("./routes/search"));
const reading_1 = __importDefault(require("./routes/reading"));
const commute_1 = __importDefault(require("./routes/commute"));
const push_1 = __importDefault(require("./routes/push"));
// 🔥 push scheduler 추가
const pushScheduler_1 = require("./services/pushScheduler");
const app = (0, express_1.default)();
/* =========================
   Middleware
========================= */
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
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
app.use('/api', books_1.default);
// 🔍 검색 관련
app.use('/api/search', search_1.default);
// 📖 독서 관련
app.use('/api/reading', reading_1.default);
// 🚆 통근 관련
app.use('/api/commute', commute_1.default);
// 🔔 푸시 알림 관련 (🔥 추가)
app.use('/api/push', push_1.default);
const ranking_1 = __importDefault(require("./routes/ranking"));
app.use("/api/ranking", ranking_1.default);
/* =========================
   Scheduler (🔥 추가)
========================= */
(0, pushScheduler_1.startPushScheduler)();
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
