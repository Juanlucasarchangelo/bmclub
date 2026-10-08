
import { Router } from 'express';
import { z } from 'zod';
import argon2 from 'argon2';

import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';

export const adminRouter = Router();

adminRouter.use(requireAuth);

// Todas as rotas deste módulo exigem ADMIN ativo.
adminRouter.use(async (req, res, next) => {
  try {
    const usuario = await prisma.user.findUnique({
      where: { id: req.auth!.sub },
      select: {
        role: true,
        active: true,
        deletedAt: true,
      },
    });

    if (
      !usuario ||
      !usuario.active ||
      usuario.deletedAt ||
      usuario.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'Acesso restrito aos administradores.',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
});

const usuarioSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  deletedAt: true,
  companyId: true,
  company: {
    select: {
      id: true,
      name: true,
    },
  },
  createdAt: true,
} as const;

// LISTAR USUÁRIOS
adminRouter.get('/usuarios', async (_req, res) => {
  try {
    const usuarios = await prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      select: usuarioSelect,
      orderBy: {
        name: 'asc',
      },
    });

    return res.json(usuarios);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Erro ao listar usuários.',
    });
  }
});

// LISTAR EMPRESAS
adminRouter.get('/empresas', async (_req, res) => {
  try {
    const empresas = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return res.json(empresas);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao listar empresas.',
    });
  }
});

// CADASTRAR EMPRESA
adminRouter.post('/empresas', async (req, res) => {
  const entrada = z.object({
    name: z.string().trim().min(2).max(150),
    document: z.string().trim().optional(),
  }).safeParse(req.body);

  if (!entrada.success) {
    return res.status(400).json({
      message: 'Dados da empresa inválidos.',
    });
  }

  try {
    const empresa = await prisma.company.create({
      data: {
        name: entrada.data.name,
        document: entrada.data.document || null,
      },
    });

    return res.status(201).json(empresa);
  } catch (error) {
    return res.status(409).json({
      message: 'Não foi possível cadastrar a empresa. Verifique o documento informado.',
    });
  }
});

const criarUsuarioSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(255),
  password: z.string().min(10).max(128),
  role: z.enum(['MEMBER', 'COMPANY']),
  companyId: z.string().nullable().optional(),
});

// CRIAR USUÁRIO
adminRouter.post('/usuarios', async (req, res) => {
  const entrada = criarUsuarioSchema.safeParse(req.body);

  if (!entrada.success) {
    return res.status(400).json({
      message: 'Dados inválidos. A senha deve ter pelo menos 10 caracteres.',
    });
  }

  const dados = entrada.data;
  const email = dados.email.toLowerCase();

  try {
    if (dados.role === 'COMPANY' && !dados.companyId) {
      return res.status(400).json({
        message: 'Selecione a empresa do usuário.',
      });
    }

    if (dados.companyId) {
      const empresa = await prisma.company.findUnique({
        where: { id: dados.companyId },
      });

      if (!empresa) {
        return res.status(400).json({
          message: 'Empresa não encontrada.',
        });
      }
    }

    const existente = await prisma.user.findUnique({
      where: { email },
    });

    if (existente) {
      return res.status(409).json({
        message: 'Este e-mail já está cadastrado.',
      });
    }

    const passwordHash = await argon2.hash(dados.password);

    const usuario = await prisma.user.create({
      data: {
        name: dados.name,
        email,
        passwordHash,
        role: dados.role,
        companyId: dados.companyId || null,
        active: true,
      },
      select: usuarioSelect,
    });

    return res.status(201).json(usuario);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: 'Não foi possível cadastrar o usuário.',
    });
  }
});

const editarUsuarioSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  companyId: z.string().nullable().optional(),
});

// EDITAR USUÁRIO
adminRouter.patch('/usuarios/:id', async (req, res) => {
  const entrada = editarUsuarioSchema.safeParse(req.body);

  if (!entrada.success) {
    return res.status(400).json({
      message: 'Dados inválidos.',
    });
  }

  try {
    const existente = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!existente || existente.deletedAt) {
      return res.status(404).json({
        message: 'Usuário não encontrado.',
      });
    }

    if (entrada.data.companyId) {
      const empresa = await prisma.company.findUnique({
        where: { id: entrada.data.companyId },
      });

      if (!empresa) {
        return res.status(400).json({
          message: 'Empresa não encontrada.',
        });
      }
    }

    if (
      existente.role === 'COMPANY' &&
      entrada.data.companyId === null
    ) {
      return res.status(400).json({
        message: 'Um usuário COMPANY precisa estar vinculado a uma empresa.',
      });
    }

    const usuario = await prisma.user.update({
      where: { id: existente.id },
      data: entrada.data,
      select: usuarioSelect,
    });

    return res.json(usuario);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: 'Erro ao atualizar usuário.',
    });
  }
});

// BLOQUEAR OU LIBERAR
adminRouter.patch('/usuarios/:id/acesso', async (req, res) => {
  const entrada = z.object({
    active: z.boolean(),
  }).safeParse(req.body);

  if (!entrada.success) {
    return res.status(400).json({
      message: 'Informe active: true ou false.',
    });
  }

  const { active } = entrada.data;
  const id = req.params.id;

  if (id === req.auth!.sub && !active) {
    return res.status(400).json({
      message: 'Você não pode bloquear sua própria conta.',
    });
  }

  try {
    const usuario = await prisma.user.findUnique({
      where: { id },
    });

    if (!usuario || usuario.deletedAt) {
      return res.status(404).json({
        message: 'Usuário não encontrado.',
      });
    }

    const atualizado = await prisma.$transaction(async (tx) => {
      const resultado = await tx.user.update({
        where: { id },
        data: { active },
        select: usuarioSelect,
      });

      if (!active) {
        await tx.refreshToken.updateMany({
          where: {
            userId: id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });
      }

      return resultado;
    });

    return res.json(atualizado);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: 'Erro ao alterar acesso.',
    });
  }
});

// EXCLUSÃO LÓGICA
adminRouter.delete('/usuarios/:id', async (req, res) => {
  const id = req.params.id;

  if (id === req.auth!.sub) {
    return res.status(400).json({
      message: 'Você não pode excluir sua própria conta.',
    });
  }

  try {
    const usuario = await prisma.user.findUnique({
      where: { id },
    });

    if (!usuario || usuario.deletedAt) {
      return res.status(404).json({
        message: 'Usuário não encontrado.',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          active: false,
          deletedAt: new Date(),
        },
      });

      await tx.refreshToken.updateMany({
        where: {
          userId: id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    });

    return res.json({
      message: 'Usuário excluído com sucesso. O histórico foi preservado.',
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: 'Erro ao excluir usuário.',
    });
  }
});
