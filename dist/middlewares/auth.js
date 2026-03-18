"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    var _a, _b;
    const header = req.header('Authorization');
    if (!header) {
        return res.status(401).json({ message: 'Authorization header missing' });
    }
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'Invalid Authorization header format' });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // ✅ 디버깅용: payload 확인
        console.log('[authMiddleware] decoded payload:', payload);
        // ✅ 여러 가능성 고려해서 userId 뽑기
        const userId = (_b = (_a = payload.userId) !== null && _a !== void 0 ? _a : payload.id) !== null && _b !== void 0 ? _b : payload.sub;
        if (!userId) {
            return res.status(401).json({ message: 'Invalid token payload: no user id' });
        }
        req.user = {
            id: userId,
            email: payload.email,
        };
        return next();
    }
    catch (err) {
        console.error('[authMiddleware] jwt verify error', err);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};
exports.authMiddleware = authMiddleware;
