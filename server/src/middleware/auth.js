import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireAuth(request, response, next) {
  const header = request.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return response.status(401).json({ message: 'Missing Authorization header' });
  }

  try {
    request.user = jwt.verify(token, env.jwtSecret);
    return next();
  } catch {
    return response.status(401).json({ message: 'Invalid or expired token' });
  }
}