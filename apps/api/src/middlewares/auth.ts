
import {
  Request,
  Response,
  NextFunction,
} from 'express';

import jwt, { JwtPayload } from 'jsonwebtoken';

import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

export type AuthUser = {
  sub: string;
  role: 'MEMBER' | 'COMPANY' | 'ADMIN';
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

/**
 * Valida o token e consulta o usuário no banco.
 * Usuários bloqueados ou excluídos não podem acessar
 * nenhuma rota protegida, mesmo com JWT válido.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Não autenticado.',
    });
  }

  const token = authorization.slice(7);

  try {
    // 1. Verificar assinatura e validade do JWT
    const decoded = jwt.verify(
      token,
      env.JWT_SECRET
    );

    if (
      typeof decoded === 'string' ||
      !decoded.sub ||
      typeof decoded.sub !== 'string'
    ) {
      return res.status(401).json({
        message: 'Token inválido.',
      });
    }

    // 2. Consultar usuário atual no MySQL
    const usuario = await prisma.user.findUnique({
      where: {
        id: decoded.sub,
      },
      select: {
        id: true,
        role: true,
        active: true,
        deletedAt: true,
      },
    });

    if (!usuario) {
      return res.status(401).json({
        message: 'Usuário não encontrado.',
      });
    }

    // 3. Verificar bloqueio e exclusão
    if (!usuario.active || usuario.deletedAt) {
      return res.status(403).json({
        message: 'Conta bloqueada ou desativada.',
      });
    }

    // 4. Usar perfil atualizado do banco,
    // não o perfil antigo contido no token.
    req.auth = {
      sub: usuario.id,
      role: usuario.role,
    };

    next();
  } catch (error) {
    // Erros de JWT
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      return res.status(401).json({
        message: 'Token inválido ou expirado.',
      });
    }

    // Erros de banco ou servidor
    console.error('Erro de autenticação:', error);

    return res.status(500).json({
      message: 'Erro interno de autenticação.',
    });
  }
}

/**
 * Restringe acesso por perfil.
 * Deve ser utilizado após requireAuth.
 */
export const requireRole =
  (...roles: AuthUser['role'][]) =>
  (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.auth) {
      return res.status(401).json({
        message: 'Não autenticado.',
      });
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({
        message: 'Acesso negado.',
      });
    }

    next();
  };
