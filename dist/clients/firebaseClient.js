"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.firebaseAdmin = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const config_1 = require("../core/config");
function assertFirebaseConfigured() {
    if (!config_1.config.firebaseProjectId || !config_1.config.firebaseClientEmail || !config_1.config.firebasePrivateKey) {
        throw new Error('Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.');
    }
}
if (!firebase_admin_1.default.apps.length) {
    assertFirebaseConfigured();
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert({
            projectId: config_1.config.firebaseProjectId,
            clientEmail: config_1.config.firebaseClientEmail,
            // .env에서는 개행이 "\\n"으로 들어오는 경우가 많아서 실제 개행으로 복원
            privateKey: config_1.config.firebasePrivateKey.replace(/\\n/g, '\n'),
        }),
    });
}
exports.firebaseAdmin = firebase_admin_1.default;
