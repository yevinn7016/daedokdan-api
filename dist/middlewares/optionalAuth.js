"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * JWT가 있으면 req.user 설정, 없거나 무효해도 요청은 통과
 */
const optionalAuthMiddleware = (req, _res, next) => {
    var _a, _b;
    const authedReq = req;
    const header = req.header('Authorization');
    if (!header) {
        return next();
    }
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) {
        return next();
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = (_b = (_a = payload.userId) !== null && _a !== void 0 ? _a : payload.id) !== null && _b !== void 0 ? _b : payload.sub;
        if (userId) {
            authedReq.user = {
                id: String(userId),
                email: typeof payload.email === 'string' ? payload.email : undefined,
            };
        }
    }
    catch {
        // optional auth: invalid token is ignored
    }
    return next();
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
