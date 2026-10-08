import { Router } from 'express';
import { z } from 'zod';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';

export const authRouter = Router();


/* =========================================================
   LOGIN
   POST /auth/login
========================================================= */

authRouter.post('/login', async (req, res) => {
    try {
        // Validação dos dados recebidos
        const dados = z
            .object({
                email: z.string().email(),
                password: z.string().min(6),
            })
            .safeParse(req.body);

        if (!dados.success) {
            return res.status(400).json({
                message: 'Informe um e-mail e uma senha válidos.',
            });
        }

        const email = dados.data.email
            .trim()
            .toLowerCase();

        // Busca usuário no banco
        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (!user) {
            return res.status(401).json({
                message: 'E-mail ou senha inválidos.',
            });
        }

        // Confere a senha
        const senhaCorreta = await argon2.verify(
            user.passwordHash,
            dados.data.password
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                message: 'E-mail ou senha inválidos.',
            });
        }

        // Access Token
        const accessToken = jwt.sign(
            {
                sub: user.id,
                role: user.role,
            },
            env.JWT_SECRET,
            {
                expiresIn: '180m',
            }
        );

        // Refresh Token
        const refreshToken =
            crypto.randomBytes(48).toString('hex');

        const refreshTokenHash =
            await argon2.hash(refreshToken);

        await prisma.refreshToken.create({
            data: {
                tokenHash: refreshTokenHash,
                userId: user.id,

                expiresAt: new Date(
                    Date.now() + 30 * 24 * 60 * 60 * 1000
                ),
            },
        });

        // Retorno para o frontend
        return res.json({
            message: 'Login realizado com sucesso.',

            accessToken,

            refreshToken,

            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Erro ao realizar login:', error);

        return res.status(500).json({
            message: 'Erro interno ao realizar login.',
        });
    }
});