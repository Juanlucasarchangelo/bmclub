
import { Router } from 'express';
import { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';

export const eventsRouter = Router();

/**
 * Normaliza os parâmetros de rota.
 */
function obterId(
  parametro: string | string[] | undefined
): string | null {
  if (typeof parametro !== 'string') {
    return null;
  }

  const id = parametro.trim();

  return id.length > 0 ? id : null;
}

/**
 * Calcula as vagas ocupadas por inscrições confirmadas.
 */
function calcularVagas(
  capacity: number,
  registrations: Array<{ seats: number }>
) {
  const seatsUsed = registrations.reduce(
    (total, registro) => total + registro.seats,
    0
  );

  return {
    seatsUsed,
    seatsAvailable: Math.max(capacity - seatsUsed, 0),
  };
}

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
      const vagas = calcularVagas(
        evento.capacity,
        evento.registrations
      );

      const { registrations, ...dadosEvento } = evento;

      return {
        ...dadosEvento,
        ...vagas,
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
      console.error(
        'Erro no dashboard de eventos:',
        error
      );

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
    const eventId = obterId(req.params.id);

    if (!eventId) {
      return res.status(400).json({
        message: 'ID do evento inválido.',
      });
    }

    const userId = req.auth!.sub;

    try {
      const resultado = await prisma.$transaction(
        async (tx) => {
          /*
           * Bloqueia a linha do evento durante a confirmação.
           * Assim, confirmações simultâneas para o mesmo
           * evento são processadas em sequência.
           */
          const linhas = await tx.$queryRaw<
            Array<{ id: string }>
          >`
            SELECT id
            FROM Event
            WHERE id = ${eventId}
            FOR UPDATE
          `;

          if (linhas.length === 0) {
            return {
              httpStatus: 404,
              body: {
                message: 'Evento não encontrado.',
              },
            };
          }

          const evento = await tx.event.findUnique({
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

          if (!evento) {
            return {
              httpStatus: 404,
              body: {
                message: 'Evento não encontrado.',
              },
            };
          }

          if (evento.status !== 'PUBLISHED') {
            return {
              httpStatus: 400,
              body: {
                message:
                  'Este evento não está disponível para confirmação.',
              },
            };
          }

          const jaConfirmado =
            evento.registrations.some(
              (registro) => registro.userId === userId
            );

          if (jaConfirmado) {
            return {
              httpStatus: 409,
              body: {
                message:
                  'Sua presença já está confirmada.',
                presencaConfirmada: true,
              },
            };
          }

          const vagas = calcularVagas(
            evento.capacity,
            evento.registrations
          );

          if (vagas.seatsAvailable < 1) {
            return {
              httpStatus: 409,
              body: {
                message: 'Evento lotado.',
              },
            };
          }

          await tx.eventRegistration.upsert({
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

          return {
            httpStatus: 201,
            body: {
              message:
                'Presença confirmada com sucesso.',
              presencaConfirmada: true,
              seatsUsed: vagas.seatsUsed + 1,
              seatsAvailable: Math.max(
                evento.capacity - vagas.seatsUsed - 1,
                0
              ),
            },
          };
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.ReadCommitted,
          timeout: 10000,
        }
      );

      return res
        .status(resultado.httpStatus)
        .json(resultado.body);
    } catch (error) {
      console.error(
        'Erro ao confirmar presença:',
        error
      );

      return res.status(500).json({
        message:
          'Não foi possível confirmar presença.',
      });
    }
  }
);

/* =========================================================
   BUSCAR UM EVENTO
   GET /eventos/:id
========================================================= */

eventsRouter.get(
  '/:id',
  requireAuth,
  async (req, res) => {
    const eventId = obterId(req.params.id);

    if (!eventId) {
      return res.status(400).json({
        message: 'ID do evento inválido.',
      });
    }

    try {
      const userId = req.auth!.sub;

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

      if (!evento) {
        return res.status(404).json({
          message: 'Evento não encontrado.',
        });
      }

      const vagas = calcularVagas(
        evento.capacity,
        evento.registrations
      );

      const presencaConfirmada =
        evento.registrations.some(
          (registro) => registro.userId === userId
        );

      const { registrations, ...dadosEvento } = evento;

      return res.json({
        ...dadosEvento,
        ...vagas,
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
