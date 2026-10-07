import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';

export const eventsRouter = Router();

/*
|--------------------------------------------------------------------------
| LISTAR EVENTOS PUBLICADOS
|--------------------------------------------------------------------------
| GET /eventos
|--------------------------------------------------------------------------
*/

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
            const vagasUtilizadas = evento.registrations.reduce(
                (total, inscricao) => total + inscricao.seats,
                0
            );

            const {
                registrations,
                ...dadosEvento
            } = evento;

            return {
                ...dadosEvento,

                seatsUsed: vagasUtilizadas,

                seatsAvailable: Math.max(
                    evento.capacity - vagasUtilizadas,
                    0
                ),
            };
        });

        return res.json(resultado);

    } catch (error) {
        console.error(
            'Erro ao buscar eventos:',
            error
        );

        return res.status(500).json({
            message: 'Erro ao buscar eventos.',
        });
    }
});


/*
|--------------------------------------------------------------------------
| BUSCAR UM EVENTO
|--------------------------------------------------------------------------
| GET /eventos/:id
|--------------------------------------------------------------------------
*/

eventsRouter.get('/:id', async (req, res) => {
    try {
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

        const vagasUtilizadas =
            evento.registrations.reduce(
                (total, inscricao) =>
                    total + inscricao.seats,
                0
            );

        const {
            registrations,
            ...dadosEvento
        } = evento;

        return res.json({
            ...dadosEvento,

            seatsUsed: vagasUtilizadas,

            seatsAvailable: Math.max(
                evento.capacity - vagasUtilizadas,
                0
            ),
        });

    } catch (error) {
        console.error(
            'Erro ao buscar evento:',
            error
        );

        return res.status(500).json({
            message: 'Erro ao buscar evento.',
        });
    }
});


/*
|--------------------------------------------------------------------------
| DASHBOARD
|--------------------------------------------------------------------------
| GET /eventos/dashboard
|--------------------------------------------------------------------------
*/

eventsRouter.get(
    '/dashboard',
    requireAuth,
    async (_req, res) => {
        try {
            const eventos =
                await prisma.event.findMany({
                    where: {
                        status: 'PUBLISHED',
                    },

                    orderBy: {
                        startsAt: 'asc',
                    },
                });

            return res.json(eventos);

        } catch (error) {
            console.error(
                'Erro dashboard eventos:',
                error
            );

            return res.status(500).json({
                message:
                    'Erro ao carregar dashboard de eventos.',
            });
        }
    }
);


/*
|--------------------------------------------------------------------------
| INSCREVER NO EVENTO
|--------------------------------------------------------------------------
| POST /eventos/:id/register
|--------------------------------------------------------------------------
*/

eventsRouter.post(
    '/:id/register',
    requireAuth,
    async (req, res) => {
        try {
            const evento =
                await prisma.event.findUnique({
                    where: {
                        id: req.params.id,
                    },

                    include: {
                        registrations: {
                            where: {
                                status: 'CONFIRMED',
                            },
                        },
                    },
                });

            if (!evento) {
                return res.status(404).json({
                    message: 'Evento não encontrado',
                });
            }

            const vagasUtilizadas =
                evento.registrations.reduce(
                    (total, inscricao) =>
                        total + inscricao.seats,
                    0
                );

            if (
                vagasUtilizadas >= evento.capacity
            ) {
                return res.status(409).json({
                    message: 'Evento lotado',
                });
            }

            const registration =
                await prisma.eventRegistration.upsert({
                    where: {
                        eventId_userId: {
                            eventId: evento.id,
                            userId: req.auth!.sub,
                        },
                    },

                    update: {
                        status: 'CONFIRMED',
                    },

                    create: {
                        eventId: evento.id,
                        userId: req.auth!.sub,
                    },
                });

            return res
                .status(201)
                .json(registration);

        } catch (error) {
            console.error(
                'Erro ao realizar inscrição:',
                error
            );

            return res.status(500).json({
                message:
                    'Erro ao realizar inscrição no evento.',
            });
        }
    }
);