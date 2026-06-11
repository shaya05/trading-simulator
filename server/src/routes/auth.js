import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      displayName: user.displayName || ''
    },
    env.jwtSecret,
    { expiresIn: '7d' }
  );
}

router.post('/register', asyncHandler(async (request, response) => {
  const { email, password, displayName } = request.body;

  if (!email || !password) {
    return response.status(400).json({ message: 'Email and password are required' });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return response.status(409).json({ message: 'Email is already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email: email.toLowerCase(),
    displayName: displayName || '',
    passwordHash
  });

  const token = createToken(user);
  return response.status(201).json({ token, user: user.toJSON() });
}));

router.post('/login', asyncHandler(async (request, response) => {
  const { email, password } = request.body;

  if (!email || !password) {
    return response.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return response.status(401).json({ message: 'Invalid email or password' });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return response.status(401).json({ message: 'Invalid email or password' });
  }

  const token = createToken(user);
  return response.json({ token, user: user.toJSON() });
}));

router.get('/me', requireAuth, asyncHandler(async (request, response) => {
  const user = await User.findById(request.user.sub);
  if (!user) {
    return response.status(404).json({ message: 'User not found' });
  }

  return response.json({ user: user.toJSON() });
}));

export default router;