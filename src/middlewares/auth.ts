// src/middlewares/auth.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

export const authMiddleware: RequestHandler = (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  const header = req.header('Authorization');
  if (!header) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Invalid Authorization header format' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // ✅ 디버깅용: payload 확인
    console.log('[authMiddleware] decoded payload:', payload);

    // ✅ 여러 가능성 고려해서 userId 뽑기
    const userId = payload.userId ?? payload.id ?? payload.sub;

    if (!userId) {
      return res.status(401).json({ message: 'Invalid token payload: no user id' });
    }

    req.user = {
      id: userId,
      email: payload.email,
    };

    return next();
  } catch (err) {
    console.error('[authMiddleware] jwt verify error', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
