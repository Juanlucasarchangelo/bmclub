import { Router } from 'express';
import { z } from 'zod'; import argon2 from 'argon2'; import jwt from 'jsonwebtoken';
import crypto from 'node:crypto'; import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
export const authRouter = Router();

authRouter.post('/', async (req, res) => {
    const p = z.object({ email: z.string().email(), password: z.string().min(6) }).safeParse(req.body);
    if (!p.success) return res.status(400).json({ message: 'Dados inválidos' }); const user = await prisma.user.findUnique({ where: { email: p.data.email.toLowerCase() } });
    if (!user || !await argon2.verify(user.passwordHash, p.data.password))
        return res.status(401).json({ message: 'E-mail ou senha inválidos' });
    const accessToken = jwt.sign({ sub: user.id, role: user.role },
        env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = crypto.randomBytes(48).toString('hex');
    await prisma.refreshToken.create({ data: { tokenHash: await argon2.hash(refreshToken), userId: user.id, expiresAt: new Date(Date.now() + 30 * 864e5) } });
    res.json({ accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
});
