
import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';

export const atmosRouter = Router();

// ======================================================
// CONFIGURAÇÕES
// ======================================================

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

const consultaSchema = z.object({
    spaceId: z.string().min(1),
    data: dataSchema,
    inicio: horaSchema.optional(),
    fim: horaSchema.optional(),
});

const reservaSchema = z.object({
    spaceId: z.string().min(1),
    data: dataSchema,
    inicio: horaSchema,
    fim: horaSchema,
    guests: z.number().int().min(1),
    notes: z.string().max(1000).optional(),
});

type Banco = Prisma.TransactionClient | typeof prisma;

type Categoria = 'ATMOS' | 'SALA';

type TipoEspaco =
    | 'BALCAO'
    | 'MESA'
    | 'PRIVADO'
    | 'SALA';

type EspacoBase = {
    id: string;
    name: string;
    category: Categoria;
    capacity: number;
};

type Intervalo = {
    startsAt: Date;
    endsAt: Date;
};

type RegistroAgenda = Intervalo & {
    spaceId: string;
};

class ErroReserva extends Error {
    constructor(
        public codigo: 'SPACE' | 'CAPACITY' | 'CONFLICT',
        mensagem: string
    ) {
        super(mensagem);
        this.name = 'ErroReserva';
    }
}

// ======================================================
// FUNÇÕES DE DATA E HORÁRIO
// ======================================================

function minutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
}

function converterData(
    data: string,
    hora: string
): Date {
    // Horário de São Paulo: UTC-03:00.
    return new Date(`${data}T${hora}:00-03:00`);
}

function dataExiste(data: string): boolean {
    const [ano, mes, dia] = data.split('-').map(Number);

    const verificacao = new Date(
        Date.UTC(ano, mes - 1, dia)
    );

    return (
        verificacao.getUTCFullYear() === ano &&
        verificacao.getUTCMonth() === mes - 1 &&
        verificacao.getUTCDate() === dia
    );
}

function validarPeriodo(
    data: string,
    inicio: string,
    fim: string
): string | null {
    if (!dataExiste(data)) {
        return 'Data inválida.';
    }

    const dataUTC = new Date(`${data}T12:00:00Z`);

    if (dataUTC.getUTCDay() === 0) {
        return 'Não aceitamos reservas aos domingos.';
    }

    const inicioMin = minutos(inicio);
    const fimMin = minutos(fim);

    if (
        inicioMin < HORA_ABERTURA ||
        fimMin > HORA_FECHAMENTO
    ) {
        return 'O funcionamento é das 09h00 às 21h00.';
    }

    if (fimMin <= inicioMin) {
        return 'O horário final deve ser posterior ao inicial.';
    }

    const inicioData = converterData(data, inicio);
    const fimData = converterData(data, fim);

    if (
        Number.isNaN(inicioData.getTime()) ||
        Number.isNaN(fimData.getTime())
    ) {
        return 'Data ou horário inválido.';
    }

    if (inicioData <= new Date()) {
        return 'Selecione uma data e horário futuros.';
    }

    return null;
}

// ======================================================
// IDENTIFICAÇÃO DOS AMBIENTES
// ======================================================

function normalizarNome(nome: string): string {
    return nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

function identificarTipo(
    espaco: Pick<EspacoBase, 'name' | 'category'>
): TipoEspaco | null {
    if (espaco.category === 'SALA') {
        return 'SALA';
    }

    const nome = normalizarNome(espaco.name);

    if (nome === 'BALCAO') return 'BALCAO';
    if (nome === 'MESA') return 'MESA';
    if (nome === 'PRIVADO') return 'PRIVADO';

    return null;
}

function capacidadeMaxima(tipo: TipoEspaco): number | null {
    switch (tipo) {
        case 'BALCAO':
            return 2;
        case 'MESA':
            return 10;
        case 'PRIVADO':
            return 30;
        case 'SALA':
            return null;
    }
}

function limiteSimultaneo(tipo: TipoEspaco): number {
    return tipo === 'BALCAO' ? 3 : 1;
}

// ======================================================
// REGRAS DE SOBREPOSIÇÃO
// ======================================================

function sobrepoe(
    intervalo: Intervalo,
    inicio: Date,
    fim: Date
): boolean {
    return (
        intervalo.startsAt < fim &&
        intervalo.endsAt > inicio
    );
}

/**
 * Calcula o maior número de reservas simultâneas
 * dentro do período solicitado.
 *
 * Exemplo:
 * 12h-13h = 1 reserva
 * 14h-15h = 1 reserva
 *
 * Uma nova reserva das 12h às 15h não deve ser
 * interpretada como 2 reservas simultâneas.
 */
function calcularPicoSimultaneo(
    intervalos: Intervalo[],
    inicio: Date,
    fim: Date
): number {
    const eventos: Array<{
        instante: number;
        variacao: number;
    }> = [];

    for (const intervalo of intervalos) {
        if (!sobrepoe(intervalo, inicio, fim)) {
            continue;
        }

        eventos.push({
            instante: Math.max(
                intervalo.startsAt.getTime(),
                inicio.getTime()
            ),
            variacao: 1,
        });

        eventos.push({
            instante: Math.min(
                intervalo.endsAt.getTime(),
                fim.getTime()
            ),
            variacao: -1,
        });
    }

    eventos.sort(
        (a, b) =>
            a.instante - b.instante ||
            a.variacao - b.variacao
    );

    let simultaneas = 0;
    let pico = 0;

    for (const evento of eventos) {
        simultaneas += evento.variacao;
        pico = Math.max(pico, simultaneas);
    }

    return pico;
}

// ======================================================
// CONSULTA DA AGENDA
// ======================================================

async function consultarAgenda(
    banco: Banco,
    espaco: EspacoBase,
    inicio: Date,
    fim: Date
) {
    // ATMOS precisa consultar Balcão, Mesa e Privado,
    // pois existem regras de exclusividade entre eles.
    //
    // SALA consulta somente a própria sala.

    const relacionados =
        espaco.category === 'ATMOS'
            ? await banco.space.findMany({
                where: {
                    category: 'ATMOS',
                },
                select: {
                    id: true,
                    name: true,
                    category: true,
                },
            })
            : [
                {
                    id: espaco.id,
                    name: espaco.name,
                    category: espaco.category,
                },
            ];

    const ids = relacionados.map(item => item.id);

    const [reservas, bloqueios] = await Promise.all([
        banco.reservation.findMany({
            where: {
                spaceId: { in: ids },
                status: {
                    not: 'CANCELLED',
                },
                startsAt: {
                    lt: fim,
                },
                endsAt: {
                    gt: inicio,
                },
            },
            select: {
                spaceId: true,
                startsAt: true,
                endsAt: true,
            },
        }),

        banco.blockedPeriod.findMany({
            where: {
                spaceId: { in: ids },
                startsAt: {
                    lt: fim,
                },
                endsAt: {
                    gt: inicio,
                },
            },
            select: {
                spaceId: true,
                startsAt: true,
                endsAt: true,
            },
        }),
    ]);

    const tipos = new Map<string, TipoEspaco | null>(
        relacionados.map(item => [
            item.id,
            identificarTipo(item),
        ])
    );

    return {
        reservas,
        bloqueios,
        tipos,
    };
}

// ======================================================
// MOTOR DE DISPONIBILIDADE
// ======================================================

async function verificarDisponibilidade(
    banco: Banco,
    espaco: EspacoBase,
    inicio: Date,
    fim: Date,
    pessoas: number
) {
    const tipo = identificarTipo(espaco);

    if (!tipo) {
        return {
            disponivel: false,
            motivo:
                `O ambiente "${espaco.name}" não possui uma regra de reserva configurada.`,
            vagasRestantes: 0,
        };
    }

    const limitePessoas =
        capacidadeMaxima(tipo) ?? espaco.capacity;

    const capacidadePermitida = Math.min(
        limitePessoas,
        espaco.capacity
    );

    if (
        !Number.isInteger(pessoas) ||
        pessoas < 1 ||
        pessoas > capacidadePermitida
    ) {
        return {
            disponivel: false,
            motivo:
                `Este ambiente permite até ${capacidadePermitida} pessoas por reserva.`,
            vagasRestantes: 0,
        };
    }

    const agenda = await consultarAgenda(
        banco,
        espaco,
        inicio,
        fim
    );

    // Bloqueio administrativo do próprio espaço.
    const bloqueado = agenda.bloqueios.some(
        bloqueio =>
            bloqueio.spaceId === espaco.id &&
            sobrepoe(bloqueio, inicio, fim)
    );

    if (bloqueado) {
        return {
            disponivel: false,
            motivo:
                'Este ambiente possui um bloqueio administrativo neste período.',
            vagasRestantes: 0,
        };
    }

    // Privado é exclusivo:
    // não pode coincidir com Balcão ou Mesa.
    //
    // Balcão e Mesa podem funcionar simultaneamente.
    const conflitoExclusividade = agenda.reservas.some(
        reserva => {
            if (!sobrepoe(reserva, inicio, fim)) {
                return false;
            }

            const tipoReservado = agenda.tipos.get(
                reserva.spaceId
            );

            if (tipo === 'PRIVADO') {
                return (
                    tipoReservado === 'BALCAO' ||
                    tipoReservado === 'MESA' ||
                    tipoReservado === 'PRIVADO'
                );
            }

            if (
                tipo === 'BALCAO' ||
                tipo === 'MESA'
            ) {
                return tipoReservado === 'PRIVADO';
            }

            return false;
        }
    );

    if (conflitoExclusividade) {
        return {
            disponivel: false,
            motivo:
                tipo === 'PRIVADO'
                    ? 'O espaço Privado não pode ser reservado enquanto Balcão ou Mesa estiverem ocupados.'
                    : 'O espaço Privado está reservado neste período.',
            vagasRestantes: 0,
        };
    }

    const reservasDoEspaco = agenda.reservas.filter(
        reserva => reserva.spaceId === espaco.id
    );

    const pico = calcularPicoSimultaneo(
        reservasDoEspaco,
        inicio,
        fim
    );

    const restantes = Math.max(
        0,
        limiteSimultaneo(tipo) - pico
    );

    if (restantes <= 0) {
        return {
            disponivel: false,
            motivo:
                tipo === 'BALCAO'
                    ? 'O Balcão atingiu o limite de três reservas simultâneas.'
                    : 'Este horário já está reservado.',
            vagasRestantes: 0,
        };
    }

    return {
        disponivel: true,
        motivo: 'Horário disponível para reserva.',
        vagasRestantes: restantes,
    };
}

// ======================================================
// GET /atmos/espacos?category=ATMOS
// GET /atmos/espacos?category=SALA
// ======================================================

atmosRouter.get('/espacos', async (req, res) => {
    try {
        const categoria = String(
            req.query.category || ''
        ).toUpperCase();

        if (
            categoria !== 'ATMOS' &&
            categoria !== 'SALA'
        ) {
            return res.status(400).json({
                message:
                    'Categoria inválida. Utilize ATMOS ou SALA.',
            });
        }

        const espacos = await prisma.space.findMany({
            where: {
                active: true,
                category: categoria,
            },
            select: {
                id: true,
                name: true,
                description: true,
                capacity: true,
                category: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        return res.json(espacos);
    } catch (error) {
        console.error(
            '[BMClub] Erro ao carregar espaços:',
            error
        );

        return res.status(500).json({
            message: 'Erro ao carregar espaços.',
        });
    }
});

// ======================================================
// GET /atmos/disponibilidade
//
// Parâmetros:
// spaceId
// data
// inicio (opcional)
// fim (opcional)
//
// Retorna disponibilidade e intervalos da agenda.
// ======================================================

atmosRouter.get(
    '/disponibilidade',
    async (req, res) => {
        const entrada = consultaSchema.safeParse(
            req.query
        );

        if (!entrada.success) {
            return res.status(400).json({
                message: 'Parâmetros inválidos.',
            });
        }

        const {
            spaceId,
            data,
            inicio,
            fim,
        } = entrada.data;

        if (!dataExiste(data)) {
            return res.status(400).json({
                message: 'Data inválida.',
            });
        }

        if (
            (inicio && !fim) ||
            (!inicio && fim)
        ) {
            return res.status(400).json({
                message:
                    'Informe os horários de início e término.',
            });
        }

        try {
            const espaco = await prisma.space.findFirst({
                where: {
                    id: spaceId,
                    active: true,
                },
            });

            if (!espaco) {
                return res.status(404).json({
                    message:
                        'Espaço ou sala não encontrado.',
                });
            }

            const inicioDia = converterData(
                data,
                '00:00'
            );

            const fimDia = new Date(
                inicioDia.getTime() +
                24 * 60 * 60 * 1000
            );

            const agenda = await consultarAgenda(
                prisma,
                espaco,
                inicioDia,
                fimDia
            );

            const intervalosOcupados = [
                ...agenda.reservas.map(reserva => ({
                    inicio:
                        reserva.startsAt.toISOString(),
                    fim:
                        reserva.endsAt.toISOString(),
                    tipo: 'RESERVA',
                    ambiente:
                        agenda.tipos.get(reserva.spaceId) ??
                        'OUTRO',
                    spaceId: reserva.spaceId,
                })),

                ...agenda.bloqueios.map(bloqueio => ({
                    inicio:
                        bloqueio.startsAt.toISOString(),
                    fim:
                        bloqueio.endsAt.toISOString(),
                    tipo: 'BLOQUEIO',
                    ambiente:
                        agenda.tipos.get(bloqueio.spaceId) ??
                        'OUTRO',
                    spaceId: bloqueio.spaceId,
                })),
            ];

            let resultadoDisponibilidade = null;

            if (inicio && fim) {
                const erroPeriodo = validarPeriodo(
                    data,
                    inicio,
                    fim
                );

                if (erroPeriodo) {
                    resultadoDisponibilidade = {
                        disponivel: false,
                        motivo: erroPeriodo,
                        vagasRestantes: 0,
                    };
                } else {
                    resultadoDisponibilidade =
                        await verificarDisponibilidade(
                            prisma,
                            espaco,
                            converterData(data, inicio),
                            converterData(data, fim),
                            1
                        );
                }
            }

            return res.json({
                spaceId,
                data,
                abertura: '09:00',
                fechamento: '21:00',
                intervalosOcupados,
                ...(resultadoDisponibilidade ?? {}),
            });
        } catch (error) {
            console.error(
                '[BMClub] Erro ao consultar disponibilidade:',
                error
            );

            return res.status(500).json({
                message:
                    'Erro ao consultar disponibilidade.',
            });
        }
    }
);

// ======================================================
// POST /atmos/reservar
//
// Regras:
// BALCÃO: 2 pessoas / até 3 reservas simultâneas
// MESA: 10 pessoas / 1 reserva simultânea
// PRIVADO: 30 pessoas / exclusivo
// SALA: capacidade cadastrada / 1 reserva
// ======================================================

atmosRouter.post(
    '/reservar',
    requireAuth,
    async (req, res) => {
        const entrada = reservaSchema.safeParse(
            req.body
        );

        if (!entrada.success) {
            return res.status(400).json({
                message:
                    'Dados da reserva inválidos.',
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
            const reserva = await prisma.$transaction(
                async tx => {
                    // Primeiro localizamos a categoria.
                    const espacoInicial =
                        await tx.space.findUnique({
                            where: {
                                id: dados.spaceId,
                            },
                        });

                    if (!espacoInicial?.active) {
                        throw new ErroReserva(
                            'SPACE',
                            'Espaço indisponível.'
                        );
                    }

                    if (
                        espacoInicial.category === 'ATMOS'
                    ) {
                        // Bloqueia todos os espaços ATMOS.
                        // Evita duas reservas concorrentes
                        // ultrapassarem os limites.
                        await tx.$queryRaw`
              SELECT id
              FROM Space
              WHERE category = 'ATMOS'
              ORDER BY id
              FOR UPDATE
            `;
                    } else {
                        // Salas são independentes.
                        await tx.$queryRaw`
              SELECT id
              FROM Space
              WHERE id = ${dados.spaceId}
              FOR UPDATE
            `;
                    }

                    // Reconsulta depois de obter o lock.
                    const espaco =
                        await tx.space.findUnique({
                            where: {
                                id: dados.spaceId,
                            },
                        });

                    if (!espaco?.active) {
                        throw new ErroReserva(
                            'SPACE',
                            'Espaço indisponível.'
                        );
                    }

                    const disponibilidade =
                        await verificarDisponibilidade(
                            tx,
                            espaco,
                            startsAt,
                            endsAt,
                            dados.guests
                        );

                    if (!disponibilidade.disponivel) {
                        throw new ErroReserva(
                            'CONFLICT',
                            disponibilidade.motivo
                        );
                    }

                    return tx.reservation.create({
                        data: {
                            spaceId: dados.spaceId,
                            userId: req.auth!.sub,
                            startsAt,
                            endsAt,
                            guests: dados.guests,
                            notes: dados.notes,
                            status: 'CONFIRMED',
                        },
                    });
                },
                {
                    isolationLevel: 'ReadCommitted',
                    timeout: 15000,
                }
            );

            return res.status(201).json({
                message:
                    'Reserva confirmada com sucesso.',
                reserva,
            });
        } catch (error) {
            console.error(
                '[BMClub] Erro ao confirmar reserva:',
                error
            );

            if (error instanceof ErroReserva) {
                if (error.codigo === 'SPACE') {
                    return res.status(404).json({
                        message: error.message,
                    });
                }

                if (error.codigo === 'CAPACITY') {
                    return res.status(400).json({
                        message: error.message,
                    });
                }

                return res.status(409).json({
                    message: error.message,
                });
            }

            return res.status(500).json({
                message:
                    'Não foi possível concluir a reserva.',
            });
        }
    }
);
