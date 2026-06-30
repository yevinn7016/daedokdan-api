import { Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { AuthedRequest } from './auth';

/**
 * JWT가 있으면 req.user 설정, 없거나 무효해도 요청은 통과
 */
export const optionalAuthMiddleware: RequestHandler = (
  req,
  _res: Response,
  next: NextFunction,
) => {
  const authedReq = req as AuthedRequest;
  const header = req.header('Authorization');

  if (!header) {
    return next();
  }

  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as Record<string, unknown>;
    const userId = payload.userId ?? payload.id ?? payload.sub;

    if (userId) {
      authedReq.user = {
        id: String(userId),
        email: typeof payload.email === 'string' ? payload.email : undefined,
      };
    }
  } catch {
    // optional auth: invalid token is ignored
  }

  return next();
};
