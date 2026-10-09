
import { Router } from 'express';
import { z } from 'zod';
import argon2 from 'argon2';
import { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';

export const profileRouter = Router();

// Todas as rotas exigem usuário autenticado.
profileRouter.use(requireAuth);

// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

function apenasNumeros(valor: string) {
    return valor.replace(/\D/g, '');
}

function cpfValido(valor: string) {
    const cpf = apenasNumeros(valor);

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    for (let tamanho = 9; tamanho <= 10; tamanho++) {
        let soma = 0;

        for (let i = 0; i < tamanho; i++) {
            soma += Number(cpf[i]) * (tamanho + 1 - i);
        }

        const resto = (soma * 10) % 11;
        const digito = resto === 10 ? 0 : resto;

        if (digito !== Number(cpf[tamanho])) {
            return false;
        }
    }

    return true;
}

const dadosPerfil = {
    id: true,
    name: true,
    email: true,
    cpf: true,
    phone: true,
    dietaryRestrictions: true,
    role: true,
    companyId: true,
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.UserSelect;

// ======================================================
// GET /perfil/me
// Consultar dados do usuário logado
// ======================================================

profileRouter.get('/me', async (req, res) => {
    try {
        const userId = req.auth!.sub;

        const usuario = await prisma.user.findUnique({
            where: { id: userId },
            select: dadosPerfil,
        });

        if (!usuario) {
            return res.status(404).json({
                message: 'Usuário não encontrado.',
            });
        }

        return res.json(usuario);
    } catch (error) {
        console.error('Erro ao consultar perfil:', error);

        return res.status(500).json({
            message: 'Não foi possível carregar seu perfil.',
        });
    }
});

// ======================================================
// PATCH /perfil/me
// Atualizar dados pessoais
// ======================================================

const atualizarPerfilSchema = z
    .object({
        name: z.string().trim().min(2).max(150).optional(),

        cpf: z
            .string()
            .trim()
            .nullable()
            .optional()
            .refine(
                (valor) =>
                    valor === undefined ||
                    valor === null ||
                    valor === '' ||
                    cpfValido(valor),
                'Informe um CPF válido.'
            ),

        phone: z
            .string()
            .trim()
            .nullable()
            .optional()
            .refine(
                (valor) => {
                    if (
                        valor === undefined ||
                        valor === null ||
                        valor === ''
                    ) {
                        return true;
                    }

                    const numeros = apenasNumeros(valor);
                    return numeros.length === 10 || numeros.length === 11;
                },
                'Informe um telefone válido com DDD.'
            ),

        dietaryRestrictions: z
            .string()
            .trim()
            .max(5000)
            .nullable()
            .optional(),
    })
    .strict()
    .refine(
        (dados) => Object.keys(dados).length > 0,
        'Informe pelo menos um campo para atualizar.'
    );

profileRouter.patch('/me', async (req, res) => {
    try {
        const validacao = atualizarPerfilSchema.safeParse(req.body);

        if (!validacao.success) {
            return res.status(400).json({
                message: 'Verifique os dados informados.',
                errors: validacao.error.flatten(),
            });
        }

        const userId = req.auth!.sub;
        const dados = validacao.data;

        const atualizacao: Prisma.UserUpdateInput = {};

        if (dados.name !== undefined) {
            atualizacao.name = dados.name;
        }

        if (dados.cpf !== undefined) {
            const cpf = dados.cpf
                ? apenasNumeros(dados.cpf)
                : null;

            if (cpf) {
                const existente = await prisma.user.findFirst({
                    where: {
                        cpf,
                        id: { not: userId },
                    },
                    select: { id: true },
                });

                if (existente) {
                    return res.status(409).json({
                        message: 'Este CPF já está cadastrado.',
                    });
                }
            }

            atualizacao.cpf = cpf;
        }

        if (dados.phone !== undefined) {
            atualizacao.phone = dados.phone
                ? apenasNumeros(dados.phone)
                : null;
        }

        if (dados.dietaryRestrictions !== undefined) {
            atualizacao.dietaryRestrictions =
                dados.dietaryRestrictions;
        }

        const usuario = await prisma.user.update({
            where: { id: userId },
            data: atualizacao,
            select: dadosPerfil,
        });

        return res.json({
            message: 'Perfil atualizado com sucesso.',
            user: usuario,
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            return res.status(409).json({
                message: 'Este CPF já está cadastrado.',
            });
        }

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            return res.status(404).json({
                message: 'Usuário não encontrado.',
            });
        }

        console.error('Erro ao atualizar perfil:', error);

        return res.status(500).json({
            message: 'Não foi possível atualizar seu perfil.',
        });
    }
});

// ======================================================
// PATCH /perfil/me/senha
// Alterar senha com validação da senha atual
// ======================================================

const alterarSenhaSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
}).strict();

profileRouter.patch('/me/senha', async (req, res) => {
    try {
        const validacao = alterarSenhaSchema.safeParse(req.body);

        if (!validacao.success) {
            return res.status(400).json({
                message:
                    'Informe a senha atual e uma nova senha com pelo menos 8 caracteres.',
            });
        }

        const userId = req.auth!.sub;

        const usuario = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                passwordHash: true,
            },
        });

        if (!usuario) {
            return res.status(404).json({
                message: 'Usuário não encontrado.',
            });
        }

        const senhaAtualCorreta = await argon2.verify(
            usuario.passwordHash,
            validacao.data.currentPassword
        );

        if (!senhaAtualCorreta) {
            return res.status(400).json({
                message: 'A senha atual está incorreta.',
            });
        }

        if (
            validacao.data.currentPassword ===
            validacao.data.newPassword
        ) {
            return res.status(400).json({
                message:
                    'A nova senha deve ser diferente da senha atual.',
            });
        }

        const novoHash = await argon2.hash(
            validacao.data.newPassword
        );

        await prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: novoHash,
            },
        });

        return res.json({
            message: 'Senha alterada com sucesso.',
        });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);

        return res.status(500).json({
            message: 'Não foi possível alterar sua senha.',
        });
    }
});
