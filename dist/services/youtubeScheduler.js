"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startYoutubeScheduler = startYoutubeScheduler;
exports.getBooksByPageRange = getBooksByPageRange;
const node_cron_1 = __importDefault(require("node-cron"));
const youtubeService_1 = require("./youtubeService");
function startYoutubeScheduler() {
    console.log("🕒 YouTube 스케줄러 시작");
    node_cron_1.default.schedule("0 * * * *", async () => {
        console.log("🔄 YouTube 업데이트 실행");
        await (0, youtubeService_1.updateYoutubeVideos)();
    });
}
// src/services/recommendationService.ts
const bookRepository_1 = require("../repositories/bookRepository");
function getPageFilter(range) {
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
function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}
async function getBooksByPageRange(range, limit = 10) {
    const { min, max } = getPageFilter(range);
    const books = await (0, bookRepository_1.findBooksByPageRange)(min, max, 50);
    return shuffle(books).slice(0, limit);
}
