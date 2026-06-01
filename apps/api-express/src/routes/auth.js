import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPrisma } from '@vahanplus/db';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import {
  getClearSessionCookieOptions,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '../session.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const normalizedUsername = String(username ?? '').trim();
  if (!normalizedUsername || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { username: normalizedUsername } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ sub: user.id, username: user.username }, config.jwtSecret, {
    expiresIn: '8h',
  });

  res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

  res.json({
    user: { id: user.id, username: user.username },
  });
});

router.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, getClearSessionCookieOptions());
  res.status(204).send();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: { id: req.user.sub, username: req.user.username },
  });
});

export default router;
