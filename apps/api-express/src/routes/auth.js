import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPrisma } from '@vahan360/db';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

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

  res.json({
    token,
    user: { id: user.id, username: user.username },
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: { id: req.user.sub, username: req.user.username },
  });
});

export default router;
