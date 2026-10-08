
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';

export const atmosRouter = Router();

const HORA_ABERTURA = 9 * 60;
const HORA_FECHAMENTO = 21 * 60;

const dataSchema = z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Data inválida'
);

const horaSchema = z.string().regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    'Horário inválido'
);

function minutos(hora: string) {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
}

function converterData(data: string, hora: string) {
    // Horário local de São Paulo (UTC-03:00).
    return new Date(`${data}T${hora}:00-03:00`);
}

function validarPeriodo(
    data: string,
    inicio: string,
    fim: string
) {
    const inicioMin = minutos(inicio);
    const fimMin = minutos(fim);

    const inicioData = converterData(data, inicio);
    const fimData = converterData(data, fim);

    if (
        Number.isNaN(inicioData.getTime()) ||
        Number.isNaN(fimData.getTime())
    ) {
        return 'Data ou horário inválido.';
    }

    // Verifica se a data realmente existe.
    const partes = data.split('-').map(Number);

    const dataUTC = new Date(
        Date.UTC(partes[0], partes[1] - 1, partes[2])
    );

    if (
        dataUTC.getUTCFullYear() !== partes[0] ||
        dataUTC.getUTCMonth() !== partes[1] - 1 ||
        dataUTC.getUTCDate() !== partes[2]
    ) {
        return 'Data inválida.';
    }

    // Domingo = 0.
    if (dataUTC.getUTCDay() === 0) {
        return 'O Atmos Club não aceita reservas aos domingos.';
    }

    if (
        inicioMin < HORA_ABERTURA ||
        fimMin > HORA_FECHAMENTO
    ) {
        return 'O funcionamento é das 09h00 às 21h00.';
    }

    if (fimMin <= inicioMin) {
        return 'O horário final deve ser posterior ao inicial.';
    }

    if (inicioData <= new Date()) {
        return 'Selecione uma data e horário futuros.';
    }

    return null;
}

// Localiza qualquer espaço ou sala ativa cadastrada.
async function localizarEspaco(id: string) {
    return prisma.space.findFirst({
        where: {
            id,
            active: true,
        },
    });
}

// ======================================================
// GET /atmos/espacos
// Lista TODOS os espaços e salas ativos da tabela Space.
// ======================================================

atmosRouter.get('/espacos', async (_req, res) => {
    try {
        const espacos = await prisma.space.findMany({
            where: {
                active: true,
            },
            select: {
                id: true,
                name: true,
                description: true,
                capacity: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        return res.json(espacos);
    } catch (error) {
        console.error(
            'Erro ao carregar espaços Atmos:',
            error
        );

        return res.status(500).json({
            message: 'Erro ao carregar espaços Atmos.',
        });
    }
});

// ======================================================
// GET /atmos/disponibilidade?spaceId=...&data=YYYY-MM-DD
// Consulta reservas e bloqueios de qualquer sala/espaço.
// ======================================================

atmosRouter.get('/disponibilidade', async (req, res) => {
    const entrada = z.object({
        spaceId: z.string().min(1),
        data: dataSchema,
    }).safeParse(req.query);

    if (!entrada.success) {
        return res.status(400).json({
            message: 'Parâmetros inválidos.',
        });
    }

    try {
        const { spaceId, data } = entrada.data;

        const espaco = await localizarEspaco(spaceId);

        if (!espaco) {
            return res.status(404).json({
                message: 'Espaço ou sala não encontrado.',
            });
        }

        const inicioDia = converterData(data, '00:00');

        const fimDia = new Date(
            inicioDia.getTime() + 24 * 60 * 60 * 1000
        );

        const [reservas, bloqueios] = await Promise.all([
            prisma.reservation.findMany({
                where: {
                    spaceId,
                    status: {
                        not: 'CANCELLED',
                    },
                    startsAt: {
                        lt: fimDia,
                    },
                    endsAt: {
                        gt: inicioDia,
                    },
                },
                select: {
                    startsAt: true,
                    endsAt: true,
                },
            }),

            prisma.blockedPeriod.findMany({
                where: {
                    spaceId,
                    startsAt: {
                        lt: fimDia,
                    },
                    endsAt: {
                        gt: inicioDia,
                    },
                },
                select: {
                    startsAt: true,
                    endsAt: true,
                },
            }),
        ]);

        return res.json({
            spaceId,
            data,
            abertura: '09:00',
            fechamento: '21:00',
            intervalosOcupados: [
                ...reservas,
                ...bloqueios,
            ].map((item) => ({
                inicio: item.startsAt.toISOString(),
                fim: item.endsAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error(
            'Erro ao consultar disponibilidade:',
            error
        );

        return res.status(500).json({
            message: 'Erro ao consultar disponibilidade.',
        });
    }
});

// ======================================================
// POST /atmos/reservar
// Permite reservar qualquer espaço ou sala ativa.
// ======================================================

atmosRouter.post('/reservar', requireAuth, async (req, res) => {
    const entrada = z.object({
        spaceId: z.string().min(1),
        data: dataSchema,
        inicio: horaSchema,
        fim: horaSchema,
        guests: z.number().int().min(1),
        notes: z.string().max(1000).optional(),
    }).safeParse(req.body);

    if (!entrada.success) {
        return res.status(400).json({
            message: 'Dados da reserva inválidos.',
        });
    }

    const dados = entrada.data;

    const erroPeriodo = validarPeriodo(
        dados.data,
        dados.inicio,
        dados.fim
    );

    if (erroPeriodo) {
        return res.status(400).json({
            message: erroPeriodo,
        });
    }

    const startsAt = converterData(
        dados.data,
        dados.inicio
    );

    const endsAt = converterData(
        dados.data,
        dados.fim
    );

    try {
        const resultado = await prisma.$transaction(
            async (tx) => {
                // Bloqueia a linha do espaço durante a transação
                // para evitar reservas simultâneas conflitantes.
                // Esta consulta utiliza MySQL, como no código original.

                const linhas = await tx.$queryRaw<
                    Array<{ id: string }>
                >`
                    SELECT id
                    FROM Space
                    WHERE id = ${dados.spaceId}
                    FOR UPDATE
                `;

                if (!linhas.length) {
                    throw new Error('SPACE');
                }

                const espaco = await tx.space.findUnique({
                    where: {
                        id: dados.spaceId,
                    },
                });

                // Não há mais uma lista fixa de espaços.
                // Qualquer registro ativo pode ser reservado.
                if (!espaco?.active) {
                    throw new Error('SPACE');
                }

                // Usa a capacidade cadastrada no banco.
                if (dados.guests > espaco.capacity) {
                    throw new Error('CAPACITY');
                }

                // Verifica reservas conflitantes.
                const conflito =
                    await tx.reservation.findFirst({
                        where: {
                            spaceId: dados.spaceId,
                            status: {
                                not: 'CANCELLED',
                            },
                            startsAt: {
                                lt: endsAt,
                            },
                            endsAt: {
                                gt: startsAt,
                            },
                        },
                    });

                // Verifica períodos bloqueados.
                const bloqueio =
                    await tx.blockedPeriod.findFirst({
                        where: {
                            spaceId: dados.spaceId,
                            startsAt: {
                                lt: endsAt,
                            },
                            endsAt: {
                                gt: startsAt,
                            },
                        },
                    });

                if (conflito || bloqueio) {
                    throw new Error('CONFLICT');
                }

                return tx.reservation.create({
                    data: {
                        spaceId: dados.spaceId,
                        userId: req.auth!.sub,
                        startsAt,
                        endsAt,
                        guests: dados.guests,
                        notes: dados.notes,
                    },
                });
            },
            {
                isolationLevel: 'ReadCommitted',
                timeout: 10000,
            }
        );

        return res.status(201).json({
            message: 'Reserva confirmada com sucesso.',
            reserva: resultado,
        });
    } catch (error) {
        console.error(
            'Erro na reserva Atmos:',
            error
        );

        const codigo =
            error instanceof Error ? error.message : '';

        if (codigo === 'CONFLICT') {
            return res.status(409).json({
                message: 'Esse horário já está ocupado.',
            });
        }

        if (codigo === 'CAPACITY') {
            return res.status(400).json({
                message: 'Capacidade máxima excedida.',
            });
        }

        if (codigo === 'SPACE') {
            return res.status(404).json({
                message: 'Espaço ou sala indisponível.',
            });
        }

        return res.status(500).json({
            message: 'Não foi possível concluir a reserva.',
        });
    }
});
