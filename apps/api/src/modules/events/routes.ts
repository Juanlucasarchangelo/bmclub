import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';

export const eventsRouter = Router();


/* =========================================================
   LISTAR EVENTOS PUBLICADOS
   GET /eventos
========================================================= */

eventsRouter.get('/', async (_req, res) => {
    try {
        const eventos = await prisma.event.findMany({
            where: {
                status: 'PUBLISHED',
            },

            orderBy: {
                startsAt: 'asc',
            },

            include: {
                registrations: {
                    where: {
                        status: 'CONFIRMED',
                    },

                    select: {
                        seats: true,
                    },
                },
            },
        });

        const resultado = eventos.map((evento) => {
            const seatsUsed = evento.registrations.reduce(
                (total, registro) => total + registro.seats,
                0
            );

            const { registrations, ...dadosEvento } = evento;

            return {
                ...dadosEvento,

                seatsUsed,

                seatsAvailable: Math.max(
                    evento.capacity - seatsUsed,
                    0
                ),
            };
        });

        return res.json(resultado);
    } catch (error) {
        console.error('Erro ao listar eventos:', error);

        return res.status(500).json({
            message: 'Erro ao listar eventos.',
        });
    }
});


/* =========================================================
   DASHBOARD DE EVENTOS
   GET /eventos/dashboard
========================================================= */

eventsRouter.get(
    '/dashboard',
    requireAuth,
    async (_req, res) => {
        try {
            const eventos = await prisma.event.findMany({
                where: {
                    status: 'PUBLISHED',
                },

                orderBy: {
                    startsAt: 'asc',
                },
            });

            return res.json(eventos);
        } catch (error) {
            console.error('Erro no dashboard de eventos:', error);

            return res.status(500).json({
                message: 'Erro ao carregar dashboard de eventos.',
            });
        }
    }
);


/* =========================================================
   CONFIRMAR PRESENÇA
   POST /eventos/:id/confirmar-presenca
========================================================= */

eventsRouter.post(
    '/:id/confirmar-presenca',
    requireAuth,
    async (req, res) => {
        try {
            const eventId = req.params.id;
            const userId = req.auth!.sub;

            // Busca o evento
            const evento = await prisma.event.findUnique({
                where: {
                    id: eventId,
                },

                include: {
                    registrations: {
                        where: {
                            status: 'CONFIRMED',
                        },

                        select: {
                            userId: true,
                            seats: true,
                        },
                    },
                },
            });

            // Evento não existe
            if (!evento) {
                return res.status(404).json({
                    message: 'Evento não encontrado.',
                });
            }

            // Somente eventos publicados aceitam confirmação
            if (evento.status !== 'PUBLISHED') {
                return res.status(400).json({
                    message: 'Este evento não está disponível para confirmação.',
                });
            }

            // Verifica se este usuário já confirmou
            const jaConfirmado = evento.registrations.some(
                (registro) => registro.userId === userId
            );

            if (jaConfirmado) {
                return res.status(409).json({
                    message: 'Sua presença já está confirmada.',
                    presencaConfirmada: true,
                });
            }

            // Calcula quantidade de vagas ocupadas
            const seatsUsed = evento.registrations.reduce(
                (total, registro) => total + registro.seats,
                0
            );

            // Evento lotado
            if (seatsUsed >= evento.capacity) {
                return res.status(409).json({
                    message: 'Evento lotado.',
                });
            }

            // Cria ou reativa a inscrição do usuário
            await prisma.eventRegistration.upsert({
                where: {
                    eventId_userId: {
                        eventId,
                        userId,
                    },
                },

                update: {
                    status: 'CONFIRMED',
                    seats: 1,
                },

                create: {
                    eventId,
                    userId,
                    status: 'CONFIRMED',
                    seats: 1,
                },
            });

            return res.status(201).json({
                message: 'Presença confirmada com sucesso.',

                presencaConfirmada: true,

                seatsUsed: seatsUsed + 1,

                seatsAvailable: Math.max(
                    evento.capacity - seatsUsed - 1,
                    0
                ),
            });
        } catch (error) {
            console.error('Erro ao confirmar presença:', error);

            return res.status(500).json({
                message: 'Erro ao confirmar presença.',
            });
        }
    }
);


/* =========================================================
   BUSCAR UM EVENTO
   GET /eventos/:id

   Esta rota precisa de login porque também informa
   se o usuário atual já confirmou presença.
========================================================= */

eventsRouter.get(
    '/:id',
    requireAuth,
    async (req, res) => {
        try {
            const userId = req.auth!.sub;

            const evento = await prisma.event.findUnique({
                where: {
                    id: req.params.id,
                },

                include: {
                    registrations: {
                        where: {
                            status: 'CONFIRMED',
                        },

                        select: {
                            userId: true,
                            seats: true,
                        },
                    },
                },
            });

            if (!evento) {
                return res.status(404).json({
                    message: 'Evento não encontrado.',
                });
            }

            const seatsUsed = evento.registrations.reduce(
                (total, registro) => total + registro.seats,
                0
            );

            const presencaConfirmada = evento.registrations.some(
                (registro) => registro.userId === userId
            );

            const { registrations, ...dadosEvento } = evento;

            return res.json({
                ...dadosEvento,

                seatsUsed,

                seatsAvailable: Math.max(
                    evento.capacity - seatsUsed,
                    0
                ),

                presencaConfirmada,
            });
        } catch (error) {
            console.error('Erro ao buscar evento:', error);

            return res.status(500).json({
                message: 'Erro ao buscar evento.',
            });
        }
    }
);