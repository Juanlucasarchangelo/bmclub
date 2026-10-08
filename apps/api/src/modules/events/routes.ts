
import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';

export const eventsRouter = Router();

// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

function obterId(
  parametro: string | string[] | undefined
): string | null {
  if (typeof parametro !== 'string') {
    return null;
  }

  const id = parametro.trim();
  return id.length > 0 ? id : null;
}

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

// ======================================================
// VALIDAÇÃO DOS DADOS
// ======================================================

const eventoSchema = z.object({
  title: z.string().trim().min(1).max(200),

  description: z.string().max(5000).nullable().optional(),

  location: z.string().trim().min(1).max(255),

  startsAt: z.string().datetime({ offset: true }),

  endsAt: z.string().datetime({ offset: true }),

  capacity: z.number().int().min(1),

  coverUrl: z.string().url().nullable().optional(),

  status: z.enum([
    'DRAFT',
    'PUBLISHED',
    'CANCELLED',
    'FINISHED',
  ]).default('PUBLISHED'),
});

const editarEventoSchema = eventoSchema.partial();

// ======================================================
// MIDDLEWARE ADMIN
// ======================================================

async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.auth?.sub;

    if (!userId) {
      return res.status(401).json({
        message: 'Usuário não autenticado.',
      });
    }

    const usuario = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        role: true,
      },
    });

    if (!usuario || usuario.role !== 'ADMIN') {
      return res.status(403).json({
        message:
          'Apenas administradores podem gerenciar eventos.',
      });
    }

    next();
  } catch (error) {
    console.error(
      'Erro ao verificar administrador:',
      error
    );

    return res.status(500).json({
      message: 'Erro ao verificar permissões.',
    });
  }
}

// ======================================================
// LISTAR EVENTOS
// GET /eventos
//
// Visitantes: apenas publicados.
// ADMIN autenticado: todos os eventos.
//
// A autenticação é opcional nesta rota.
// ======================================================

eventsRouter.get('/', async (req, res) => {
  try {
    let admin = false;

    const authorization = req.headers.authorization;

    if (authorization?.startsWith('Bearer ')) {
      // Utiliza o middleware existente para identificar
      // o usuário, sem bloquear visitantes.
      await new Promise<void>((resolve) => {
        requireAuth(
          req,
          res,
          () => resolve()
        );
      });

      if (req.auth?.sub) {
        const usuario = await prisma.user.findUnique({
          where: {
            id: req.auth.sub,
          },
          select: {
            role: true,
          },
        });

        admin = usuario?.role === 'ADMIN';
      }
    }

    if (res.headersSent) return;

    const eventos = await prisma.event.findMany({
      where: admin
        ? {}
        : { status: 'PUBLISHED' },
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

    const resultado = eventos.map(evento => {
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

// ======================================================
// CADASTRAR EVENTO
// POST /eventos
// EXCLUSIVO ADMIN
// ======================================================

eventsRouter.post(
  '/',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const entrada = eventoSchema.safeParse(req.body);

    if (!entrada.success) {
      return res.status(400).json({
        message: 'Dados do evento inválidos.',
        errors: entrada.error.flatten(),
      });
    }

    const dados = entrada.data;

    const startsAt = new Date(dados.startsAt);
    const endsAt = new Date(dados.endsAt);

    if (endsAt <= startsAt) {
      return res.status(400).json({
        message:
          'O horário de término deve ser posterior ao início.',
      });
    }

    try {
      const evento = await prisma.event.create({
        data: {
          title: dados.title,
          description: dados.description ?? null,
          location: dados.location,
          startsAt,
          endsAt,
          capacity: dados.capacity,
          coverUrl: dados.coverUrl ?? null,
          status: dados.status,
        },
      });

      return res.status(201).json({
        message: 'Evento cadastrado com sucesso.',
        evento,
      });
    } catch (error) {
      console.error('Erro ao cadastrar evento:', error);

      return res.status(500).json({
        message: 'Não foi possível cadastrar o evento.',
      });
    }
  }
);

// ======================================================
// EDITAR EVENTO
// PATCH /eventos/:id
// EXCLUSIVO ADMIN
// ======================================================

eventsRouter.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const eventId = obterId(req.params.id);

    if (!eventId) {
      return res.status(400).json({
        message: 'ID do evento inválido.',
      });
    }

    const entrada = editarEventoSchema.safeParse(
      req.body
    );

    if (!entrada.success) {
      return res.status(400).json({
        message: 'Dados de edição inválidos.',
        errors: entrada.error.flatten(),
      });
    }

    const dados = entrada.data;

    try {
      const existente = await prisma.event.findUnique({
        where: {
          id: eventId,
        },
      });

      if (!existente) {
        return res.status(404).json({
          message: 'Evento não encontrado.',
        });
      }

      const startsAt = dados.startsAt
        ? new Date(dados.startsAt)
        : existente.startsAt;

      const endsAt = dados.endsAt
        ? new Date(dados.endsAt)
        : existente.endsAt;

      if (endsAt <= startsAt) {
        return res.status(400).json({
          message:
            'O horário de término deve ser posterior ao início.',
        });
      }

      const capacidade =
        dados.capacity ?? existente.capacity;

      const vagasOcupadas =
        await prisma.eventRegistration.aggregate({
          where: {
            eventId,
            status: 'CONFIRMED',
          },
          _sum: {
            seats: true,
          },
        });

      const ocupadas =
        vagasOcupadas._sum.seats ?? 0;

      if (capacidade < ocupadas) {
        return res.status(400).json({
          message:
            `A capacidade não pode ser inferior às ${ocupadas} vagas já confirmadas.`,
        });
      }

      const evento = await prisma.event.update({
        where: {
          id: eventId,
        },
        data: {
          ...dados,
          startsAt,
          endsAt,
        },
      });

      return res.json({
        message: 'Evento atualizado com sucesso.',
        evento,
      });
    } catch (error) {
      console.error('Erro ao editar evento:', error);

      return res.status(500).json({
        message: 'Não foi possível editar o evento.',
      });
    }
  }
);

// ======================================================
// DASHBOARD DE EVENTOS
// GET /eventos/dashboard
// ======================================================

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
        message:
          'Erro ao carregar dashboard de eventos.',
      });
    }
  }
);

// ======================================================
// CONFIRMAR PRESENÇA
// POST /eventos/:id/confirmar-presenca
// ======================================================

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
        async tx => {
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
              registro => registro.userId === userId
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

// ======================================================
// BUSCAR UM EVENTO
// GET /eventos/:id
// ======================================================

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
          registro => registro.userId === userId
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


/* =========================================================
   EXCLUIR EVENTO (CANCELAMENTO LÓGICO)
   DELETE /eventos/:id
   EXCLUSIVO ADMIN
========================================================= */

eventsRouter.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const eventId = obterId(req.params.id);

    if (!eventId) {
      return res.status(400).json({
        message: 'ID do evento inválido.',
      });
    }

    try {
      const existente = await prisma.event.findUnique({
        where: {
          id: eventId,
        },
      });

      if (!existente) {
        return res.status(404).json({
          message: 'Evento não encontrado.',
        });
      }

      if (existente.status === 'CANCELLED') {
        return res.status(409).json({
          message: 'Este evento já está cancelado.',
        });
      }

      const evento = await prisma.event.update({
        where: {
          id: eventId,
        },
        data: {
          status: 'CANCELLED',
        },
      });

      return res.json({
        message: 'Evento excluído da agenda com sucesso.',
        evento,
      });
    } catch (error) {
      console.error('Erro ao excluir evento:', error);

      return res.status(500).json({
        message: 'Não foi possível excluir o evento.',
      });
    }
  }
);

