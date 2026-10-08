
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';

export const reservationsRouter = Router();

// Todas as rotas exigem autenticação
reservationsRouter.use(requireAuth);


/* =========================================================
   RESERVAS UNIFICADAS
   GET /reservations/todas

   ADMIN   → Todos os usuários
   COMPANY → Usuários da própria empresa
   MEMBER  → Somente o próprio usuário
========================================================= */

reservationsRouter.get('/todas', async (req, res) => {
    try {
        const usuario = await prisma.user.findUnique({
            where: { id: req.auth!.sub },
            select: {
                id: true,
                role: true,
                companyId: true,
            },
        });

        if (!usuario) {
            return res.status(401).json({
                message: 'Usuário não encontrado.',
            });
        }

        if (
            usuario.role === 'COMPANY' &&
            !usuario.companyId
        ) {
            return res.status(403).json({
                message: 'Empresa não vinculada ao usuário.',
            });
        }

        const filtroUsuario =
            usuario.role === 'ADMIN'
                ? {}
                : usuario.role === 'COMPANY'
                    ? {
                        user: {
                            companyId: usuario.companyId!,
                        },
                    }
                    : {
                        userId: usuario.id,
                    };

        // 1. Reservas de espaços
        const reservasEspacos =
            await prisma.reservation.findMany({
                where: filtroUsuario,
                include: {
                    space: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            company: {
                                select: { name: true },
                            },
                        },
                    },
                },
            });

        // 2. Inscrições em eventos
        const reservasEventos =
            await prisma.eventRegistration.findMany({
                where: filtroUsuario,
                include: {
                    event: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            location: true,
                            startsAt: true,
                            endsAt: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            company: {
                                select: { name: true },
                            },
                        },
                    },
                },
            });

        // 3. Padronizar reservas de espaços
        const espacos = reservasEspacos.map((reserva) => ({
            id: reserva.id,
            tipo: 'ESPACO' as const,
            titulo: reserva.space.name,
            descricao: reserva.space.description,
            local: reserva.space.name,
            startsAt: reserva.startsAt,
            endsAt: reserva.endsAt,
            status: reserva.status,
            quantidade: reserva.guests,
            notes: reserva.notes,
            usuario: reserva.user,
            referenciaId: reserva.space.id,
            createdAt: reserva.createdAt,
        }));

        // 4. Padronizar inscrições em eventos
        const eventos = reservasEventos.map((registro) => ({
            id: registro.id,
            tipo: 'EVENTO' as const,
            titulo: registro.event.title,
            descricao: registro.event.description,
            local: registro.event.location,
            startsAt: registro.event.startsAt,
            endsAt: registro.event.endsAt,
            status: registro.status,
            quantidade: registro.seats,
            notes: null,
            usuario: registro.user,
            referenciaId: registro.event.id,
            createdAt: registro.createdAt,
        }));

        // 5. Unificar e ordenar por data
        const reservas = [...espacos, ...eventos].sort(
            (a, b) =>
                new Date(b.startsAt).getTime() -
                new Date(a.startsAt).getTime()
        );

        return res.json({
            total: reservas.length,
            totalEspacos: espacos.length,
            totalEventos: eventos.length,
            reservas,
        });
    } catch (error) {
        console.error('Erro ao buscar reservas:', error);

        return res.status(500).json({
            message: 'Não foi possível carregar as reservas.',
        });
    }
});


/* =========================================================
   LISTAR RESERVAS
   GET /reservations/mine

   ADMIN   → Todas as reservas
   COMPANY → Reservas da própria empresa
   MEMBER  → Apenas reservas próprias
========================================================= */

reservationsRouter.get('/mine', async (req, res) => {
    try {
        const userId = req.auth!.sub;

        const usuario = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                role: true,
                companyId: true,
            },
        });

        if (!usuario) {
            return res.status(401).json({
                message: 'Usuário não encontrado.',
            });
        }

        // Filtro aplicado diretamente no MySQL pelo Prisma
        const filtro =
            usuario.role === 'ADMIN'
                ? {}
                : usuario.role === 'COMPANY'
                    ? usuario.companyId
                        ? { user: { companyId: usuario.companyId } }
                        : null
                    : { userId: usuario.id };

        if (!filtro) {
            return res.status(403).json({
                message: 'Usuário sem empresa vinculada.',
            });
        }

        const reservas = await prisma.reservation.findMany({
            where: filtro,

            include: {
                space: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        capacity: true,
                    },
                },

                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        companyId: true,
                        company: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },

            orderBy: {
                startsAt: 'desc',
            },
        });

        return res.json(reservas);
    } catch (error) {
        console.error('Erro ao listar reservas:', error);

        return res.status(500).json({
            message: 'Erro ao buscar reservas.',
        });
    }
});


/* =========================================================
   CRIAR RESERVA
   POST /reservations

   Preserva as regras existentes:
   - Espaço precisa estar ativo
   - Quantidade de convidados dentro da capacidade
   - Não pode haver conflito com outra reserva
   - Não pode haver bloqueio no período
   - Reserva vinculada ao usuário autenticado
========================================================= */

reservationsRouter.post('/', async (req, res) => {
    const validacao = z.object({
        spaceId: z.string().min(1),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
        guests: z.number().int().min(1).default(1),
        notes: z.string().max(1000).optional(),
    }).safeParse(req.body);

    if (
        !validacao.success ||
        validacao.data.endsAt <= validacao.data.startsAt
    ) {
        return res.status(400).json({
            message: 'Reserva inválida.',
        });
    }

    try {
        const dados = validacao.data;
        const userId = req.auth!.sub;

        const reserva = await prisma.$transaction(async (tx) => {
            // Verificar espaço
            const espaco = await tx.space.findUnique({
                where: {
                    id: dados.spaceId,
                },
            });

            if (!espaco || !espaco.active) {
                throw new Error('SPACE');
            }

            // Verificar capacidade
            if (dados.guests > espaco.capacity) {
                throw new Error('CAPACITY');
            }

            // Verificar conflito de horário
            const conflito = await tx.reservation.findFirst({
                where: {
                    spaceId: dados.spaceId,
                    status: {
                        not: 'CANCELLED',
                    },
                    startsAt: {
                        lt: dados.endsAt,
                    },
                    endsAt: {
                        gt: dados.startsAt,
                    },
                },
            });

            // Verificar bloqueios administrativos
            const bloqueio = await tx.blockedPeriod.findFirst({
                where: {
                    spaceId: dados.spaceId,
                    startsAt: {
                        lt: dados.endsAt,
                    },
                    endsAt: {
                        gt: dados.startsAt,
                    },
                },
            });

            if (conflito || bloqueio) {
                throw new Error('CONFLICT');
            }

            // Criar reserva
            return tx.reservation.create({
                data: {
                    spaceId: dados.spaceId,
                    startsAt: dados.startsAt,
                    endsAt: dados.endsAt,
                    guests: dados.guests,
                    notes: dados.notes,
                    userId,
                },
            });
        });

        return res.status(201).json(reserva);
    } catch (error) {
        console.error('Erro ao criar reserva:', error);

        const mensagem =
            error instanceof Error ? error.message : '';

        if (mensagem === 'CONFLICT') {
            return res.status(409).json({
                message: 'Horário indisponível.',
            });
        }

        if (mensagem === 'CAPACITY') {
            return res.status(400).json({
                message: 'Capacidade do espaço excedida.',
            });
        }

        if (mensagem === 'SPACE') {
            return res.status(400).json({
                message: 'Espaço inexistente ou indisponível.',
            });
        }

        return res.status(500).json({
            message: 'Não foi possível realizar a reserva.',
        });
    }
});


/* =========================================================
   CANCELAR RESERVA
   PATCH /reservations/:id/cancel

   ADMIN   → Pode cancelar qualquer reserva
   COMPANY → Pode cancelar reservas da própria empresa
   MEMBER  → Pode cancelar apenas as próprias reservas

   Regra adicional:
   - Não cancelar reservas já iniciadas
   - Não cancelar novamente uma reserva cancelada
========================================================= */

reservationsRouter.patch('/:id/cancel', async (req, res) => {
    try {
        const userId = req.auth!.sub;
        const reservaId = req.params.id;

        const usuario = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                role: true,
                companyId: true,
            },
        });

        if (!usuario) {
            return res.status(401).json({
                message: 'Usuário não encontrado.',
            });
        }

        const filtro =
            usuario.role === 'ADMIN'
                ? {}
                : usuario.role === 'COMPANY'
                    ? usuario.companyId
                        ? { user: { companyId: usuario.companyId } }
                        : null
                    : { userId: usuario.id };

        if (!filtro) {
            return res.status(403).json({
                message: 'Usuário sem empresa vinculada.',
            });
        }

        const reserva = await prisma.reservation.findFirst({
            where: {
                id: reservaId,
                ...filtro,
            },
        });

        if (!reserva) {
            return res.status(404).json({
                message: 'Reserva não encontrada ou sem permissão.',
            });
        }

        if (reserva.status === 'CANCELLED') {
            return res.status(409).json({
                message: 'Esta reserva já está cancelada.',
            });
        }

        if (reserva.startsAt <= new Date()) {
            return res.status(409).json({
                message: 'Não é possível cancelar uma reserva já iniciada.',
            });
        }

        const resultado = await prisma.reservation.updateMany({
            where: {
                id: reserva.id,
                status: {
                    not: 'CANCELLED',
                },
                startsAt: {
                    gt: new Date(),
                },
            },
            data: {
                status: 'CANCELLED',
            },
        });

        if (resultado.count === 0) {
            return res.status(409).json({
                message: 'A reserva não pode mais ser cancelada.',
            });
        }

        const reservaAtualizada = await prisma.reservation.findUnique({
            where: {
                id: reserva.id,
            },
        });

        return res.json({
            message: 'Reserva cancelada com sucesso.',
            reserva: reservaAtualizada,
        });
    } catch (error) {
        console.error('Erro ao cancelar reserva:', error);

        return res.status(500).json({
            message: 'Não foi possível cancelar a reserva.',
        });
    }
});
