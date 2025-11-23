// src/middlewares/auth.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

// req.user를 쓰기 위한 타입 확장
export interface AuthedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

// ✅ 반드시 함수여야 하고, export 방식이 라우터와 맞아야 함
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

    req.user = {
      id: payload.userId,
      email: payload.email,
    };

    return next();
  } catch (err) {
    console.error('[authMiddleware] jwt verify error', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
