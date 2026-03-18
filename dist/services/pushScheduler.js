"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPushScheduler = startPushScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const pushService_1 = require("./pushService");
let started = false;
function startPushScheduler() {
    if (started)
        return;
    started = true;
    // 매일 오전 8시
    node_cron_1.default.schedule('0 8 * * *', async () => {
        try {
            console.log('⏰ Running daily recommendation push job...');
            await (0, pushService_1.sendPushToAll)({
                title: '📖 오늘의 추천 책',
                body: '오늘 이동 시간에 읽기 좋은 책을 확인해보세요.',
            });
        }
        catch (error) {
            console.error('❌ Recommendation push cron failed:', error);
        }
    }, {
        timezone: 'Asia/Seoul',
    });
    console.log('✅ Push scheduler started');
}
