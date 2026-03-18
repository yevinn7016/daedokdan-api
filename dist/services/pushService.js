"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPush = sendPush;
exports.sendPushToAll = sendPushToAll;
const userDeviceRepository_1 = require("../repositories/userDeviceRepository");
async function getFirebaseAdmin() {
    // firebase env가 없는 환경에서도 서버가 부팅/리스닝 되도록 lazy-load
    const mod = await Promise.resolve().then(() => __importStar(require('../clients/firebaseClient')));
    return mod.firebaseAdmin;
}
async function sendToTokens(tokens, payload) {
    if (!tokens.length) {
        console.log('🔕 No FCM tokens to send');
        return;
    }
    const firebaseAdmin = await getFirebaseAdmin();
    const response = await firebaseAdmin.messaging().sendEachForMulticast({
        tokens,
        notification: {
            title: payload.title,
            body: payload.body,
        },
    });
    const invalidTokens = [];
    response.responses.forEach((result, index) => {
        if (!result.success && result.error) {
            const code = result.error.code;
            if (code === 'messaging/registration-token-not-registered' ||
                code === 'messaging/invalid-registration-token') {
                invalidTokens.push(tokens[index]);
            }
            console.error(`❌ Push send failed for token[${index}]`, result.error);
        }
    });
    if (invalidTokens.length) {
        await Promise.all(invalidTokens.map((token) => (0, userDeviceRepository_1.deleteDeviceToken)(token)));
        console.log(`🧹 Removed invalid FCM tokens: ${invalidTokens.length}`);
    }
    console.log(`✅ Push send complete. success=${response.successCount}, failure=${response.failureCount}`);
}
async function sendPush(userId, payload) {
    const tokens = await (0, userDeviceRepository_1.getUserTokens)(userId);
    await sendToTokens(tokens, payload);
}
async function sendPushToAll(payload) {
    const tokens = await (0, userDeviceRepository_1.getAllTokens)();
    if (!tokens.length) {
        console.log('🔕 No tokens for broadcast');
        return;
    }
    const chunkSize = 500; // FCM multicast limit
    for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        await sendToTokens(chunk, payload);
    }
}
