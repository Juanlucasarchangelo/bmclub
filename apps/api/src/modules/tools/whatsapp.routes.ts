
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import {
    requireAuth,
    requireRole,
} from '../../middlewares/auth.js';

import { enviarMensagemEvolution } from './evolution.service.js';

export const whatsappToolsRouter = Router();

whatsappToolsRouter.use(
    requireAuth,
    requireRole('ADMIN')
);

// ==================================================
// CONFIGURAÇÃO DE PROCESSAMENTO
// ==================================================

// Intervalo operacional entre tentativas.
// Não garante proteção contra bloqueios do WhatsApp.
const INTERVALO_ENVIOS_MS = 2000;

// Apenas um processador de campanhas por processo Node.
// Para múltiplas instâncias do backend, utilizar uma
// fila compartilhada com controle distribuído.
let processandoFila = false;

function aguardar(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==================================================
// NORMALIZAÇÃO DE TELEFONES
// ==================================================

function normalizarTelefone(
    valor: string
): string | null {
    let telefone = valor.replace(/\D/g, '');

    if (
        telefone.length === 10 ||
        telefone.length === 11
    ) {
        telefone = `55${telefone}`;
    }

    if (
        telefone.length < 12 ||
        telefone.length > 15 ||
        !telefone.startsWith('55')
    ) {
        return null;
    }

    return telefone;
}

// ==================================================
// HISTÓRICO DE CAMPANHAS
// GET /campanhas
// ==================================================

whatsappToolsRouter.get(
    '/campanhas',
    async (_req, res) => {
        try {
            const campanhas =
                await prisma.whatsAppCampaign.findMany({
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 30,
                    select: {
                        id: true,
                        title: true,
                        templateName: true,
                        status: true,
                        createdAt: true,
                        _count: {
                            select: {
                                recipients: true,
                            },
                        },
                    },
                });

            return res.json(
                campanhas.map((campanha) => ({
                    id: campanha.id,
                    title: campanha.title,
                    templateName: campanha.templateName,
                    status: campanha.status,
                    createdAt: campanha.createdAt,
                    total: campanha._count.recipients,
                }))
            );
        } catch (error) {
            console.error(
                'Listar campanhas:',
                error
            );

            return res.status(500).json({
                message:
                    'Erro ao consultar campanhas.',
            });
        }
    }
);

// ==================================================
// DETALHES DA CAMPANHA
// GET /campanhas/:id
// ==================================================

whatsappToolsRouter.get(
    '/campanhas/:id',
    async (req, res) => {
        try {
            const id = z
                .string()
                .min(1)
                .safeParse(req.params.id);

            if (!id.success) {
                return res.status(400).json({
                    message: 'Identificador inválido.',
                });
            }

            const campanha =
                await prisma.whatsAppCampaign.findUnique({
                    where: {
                        id: id.data,
                    },
                    include: {
                        recipients: {
                            orderBy: {
                                createdAt: 'asc',
                            },
                            take: 500,
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                status: true,
                                providerMessageId: true,
                                error: true,
                            },
                        },
                        _count: {
                            select: {
                                recipients: true,
                            },
                        },
                    },
                });

            if (!campanha) {
                return res.status(404).json({
                    message:
                        'Campanha não encontrada.',
                });
            }

            const contagem =
                await prisma.whatsAppRecipient.groupBy({
                    by: ['status'],
                    where: {
                        campaignId: campanha.id,
                    },
                    _count: {
                        _all: true,
                    },
                });

            const resumo: Record<string, number> = {};

            for (const item of contagem) {
                resumo[item.status] =
                    item._count._all;
            }

            return res.json({
                ...campanha,
                total: campanha._count.recipients,
                resumo,
                recipients: campanha.recipients,
                exibidos: campanha.recipients.length,
            });
        } catch (error) {
            console.error(
                'Detalhar campanha:',
                error
            );

            return res.status(500).json({
                message:
                    'Erro ao consultar a campanha.',
            });
        }
    }
);

// ==================================================
// VALIDAÇÃO DA CAMPANHA
// ==================================================

const campanhaSchema = z.object({
    requestId: z.string().uuid(),

    title: z
        .string()
        .trim()
        .min(3)
        .max(140),

    message: z
        .string()
        .trim()
        .min(1)
        .max(4000)
        .refine(
            (valor) => valor.includes('$nome'),
            'Inclua $nome na mensagem.'
        ),

    templateName: z
        .string()
        .trim()
        .regex(/^[a-z0-9_]{1,120}$/),

    language: z
        .string()
        .trim()
        .regex(/^[a-z]{2}_[A-Z]{2}$/),

    consentConfirmed: z.literal(true),
    templateConfirmed: z.literal(true),

    consentSource: z
        .string()
        .trim()
        .min(3)
        .max(255),

    // Sem limite fixo de destinatários no schema.
    // Os limites práticos dependem de memória,
    // tamanho do HTTP e capacidade do banco.
    contacts: z
        .array(
            z.object({
                nome: z
                    .string()
                    .trim()
                    .min(1)
                    .max(150),

                telefone: z
                    .string()
                    .max(30),
            })
        )
        .min(1),
});

// ==================================================
// PROCESSAR UMA CAMPANHA
// ==================================================

async function processarCampanha(
    campanhaId: string
): Promise<void> {
    await prisma.whatsAppCampaign.update({
        where: {
            id: campanhaId,
        },
        data: {
            status: 'PROCESSING',
        },
    });

    let aceitos = 0;
    let incertos = 0;

    while (true) {
        const destinatario =
            await prisma.whatsAppRecipient.findFirst({
                where: {
                    campaignId: campanhaId,
                    status: 'PENDING',
                },
                orderBy: {
                    createdAt: 'asc',
                },
            });

        if (!destinatario) {
            break;
        }

        // O estado PROCESSING é gravado antes
        // da chamada externa. Se o processo cair,
        // esse destinatário não será reenviado
        // automaticamente.
        await prisma.whatsAppRecipient.update({
            where: {
                id: destinatario.id,
            },
            data: {
                status: 'PROCESSING',
            },
        });

        try {
            const resultado =
                await enviarMensagemEvolution({
                    telefone: destinatario.phone,
                    mensagem:
                        destinatario.personalizedText,
                });

            if (resultado.key?.id) {
                await prisma.whatsAppRecipient.update({
                    where: {
                        id: destinatario.id,
                    },
                    data: {
                        status: 'ACCEPTED',
                        providerMessageId:
                            resultado.key.id,
                        error: null,
                    },
                });

                aceitos++;
            } else {
                await prisma.whatsAppRecipient.update({
                    where: {
                        id: destinatario.id,
                    },
                    data: {
                        status: 'UNKNOWN',
                        error:
                            'Evolution API respondeu sem identificador da mensagem.',
                    },
                });

                incertos++;
            }
        } catch (error) {
            const mensagemErro =
                error instanceof Error
                    ? error.message.slice(0, 1000)
                    : 'Erro desconhecido.';

            console.error(
                `Evolution API - destinatário ${destinatario.id}:`,
                mensagemErro
            );

            // Um timeout não prova que o envio falhou.
            // Portanto não há reenvio automático.
            await prisma.whatsAppRecipient.update({
                where: {
                    id: destinatario.id,
                },
                data: {
                    status: 'UNKNOWN',
                    error: mensagemErro,
                },
            });

            incertos++;
        }

        await aguardar(INTERVALO_ENVIOS_MS);
    }

    // Inclui registros já processados, caso o
    // processamento tenha sido retomado manualmente.
    const pendentes =
        await prisma.whatsAppRecipient.count({
            where: {
                campaignId: campanhaId,
                status: {
                    in: ['PENDING', 'PROCESSING'],
                },
            },
        });

    const desconhecidos =
        await prisma.whatsAppRecipient.count({
            where: {
                campaignId: campanhaId,
                status: 'UNKNOWN',
            },
        });

    const aceitosTotal =
        await prisma.whatsAppRecipient.count({
            where: {
                campaignId: campanhaId,
                status: 'ACCEPTED',
            },
        });

    let statusFinal = 'UNKNOWN';

    if (pendentes > 0) {
        statusFinal = 'INTERRUPTED';
    } else if (desconhecidos === 0) {
        statusFinal = 'EVOLUTION_ACCEPTED';
    } else if (aceitosTotal > 0) {
        statusFinal = 'PARTIAL';
    }

    await prisma.whatsAppCampaign.update({
        where: {
            id: campanhaId,
        },
        data: {
            status: statusFinal,
        },
    });

    console.log(
        `Campanha ${campanhaId} concluída. ` +
        `Aceitos nesta execução: ${aceitos}. ` +
        `Incertos nesta execução: ${incertos}. ` +
        `Status: ${statusFinal}.`
    );
}

// ==================================================
// FILA SEQUENCIAL DE CAMPANHAS
// ==================================================

async function processarFila(): Promise<void> {
    if (processandoFila) {
        return;
    }

    processandoFila = true;

    try {
        while (true) {
            const proxima =
                await prisma.whatsAppCampaign.findFirst({
                    where: {
                        status: 'QUEUED',
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                    select: {
                        id: true,
                    },
                });

            if (!proxima) {
                break;
            }

            try {
                await processarCampanha(
                    proxima.id
                );
            } catch (error) {
                console.error(
                    `Falha no processamento da campanha ${proxima.id}:`,
                    error
                );

                // Não reenviar automaticamente uma
                // campanha que pode ter sido parcialmente
                // processada.
                await prisma.whatsAppCampaign.update({
                    where: {
                        id: proxima.id,
                    },
                    data: {
                        status: 'INTERRUPTED',
                    },
                }).catch((erroAtualizacao) => {
                    console.error(
                        'Falha ao registrar interrupção:',
                        erroAtualizacao
                    );
                });
            }
        }
    } catch (error) {
        console.error(
            'Falha geral na fila WhatsApp:',
            error
        );
    } finally {
        processandoFila = false;
    }
}

function iniciarFila(): void {
    void processarFila();
}

// ==================================================
// CRIAR CAMPANHA
// POST /campanhas
// ==================================================

whatsappToolsRouter.post(
    '/campanhas',
    async (req, res) => {
        const parsed =
            campanhaSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                message:
                    parsed.error.issues[0]?.message ||
                    'Dados da campanha inválidos.',
            });
        }

        const dados = parsed.data;

        const vistos = new Set<string>();

        const contatos: Array<{
            name: string;
            phone: string;
            text: string;
        }> = [];

        for (const contato of dados.contacts) {
            const telefone =
                normalizarTelefone(
                    contato.telefone
                );

            if (
                !telefone ||
                vistos.has(telefone)
            ) {
                continue;
            }

            vistos.add(telefone);

            contatos.push({
                name: contato.nome,
                phone: telefone,
                text: dados.message
                    .split('$nome')
                    .join(contato.nome),
            });
        }

        if (!contatos.length) {
            return res.status(400).json({
                message:
                    'Nenhum telefone válido encontrado.',
            });
        }

        try {
            // ==================================================
            // IDEMPOTÊNCIA
            // ==================================================

            const anterior =
                await prisma.whatsAppCampaign.findUnique({
                    where: {
                        requestId: dados.requestId,
                    },
                    select: {
                        id: true,
                        status: true,
                        createdById: true,
                        _count: {
                            select: {
                                recipients: true,
                            },
                        },
                    },
                });

            if (anterior) {
                if (
                    anterior.createdById !==
                    req.auth!.sub
                ) {
                    return res.status(409).json({
                        message:
                            'Identificador já utilizado.',
                    });
                }

                return res.json({
                    id: anterior.id,
                    status: anterior.status,
                    total:
                        anterior._count.recipients,
                    repeated: true,
                    message:
                        'Esta campanha já foi registrada. Nenhum envio duplicado foi criado.',
                });
            }

            // ==================================================
            // REGISTRAR CAMPANHA NO MYSQL
            // ==================================================

            const campanha =
                await prisma.whatsAppCampaign.create({
                    data: {
                        requestId: dados.requestId,
                        title: dados.title,
                        templateName:
                            dados.templateName,
                        language: dados.language,
                        messagePreview: dados.message,
                        consentSource:
                            dados.consentSource,
                        status: 'QUEUED',
                        createdById: req.auth!.sub,

                        recipients: {
                            create: contatos.map(
                                (contato) => ({
                                    name: contato.name,
                                    phone: contato.phone,
                                    personalizedText:
                                        contato.text,
                                    status: 'PENDING',
                                })
                            ),
                        },
                    },
                    select: {
                        id: true,
                        status: true,
                    },
                });

            // O HTTP responde sem esperar
            // o processamento de todos os contatos.
            res.status(202).json({
                id: campanha.id,
                status: campanha.status,
                total: contatos.length,
                message:
                    `Campanha registrada com ${contatos.length} contato(s). ` +
                    'Os envios serão processados sequencialmente. ' +
                    'Consulte o histórico para acompanhar o resultado.',
            });

            // Inicia o processamento após a resposta.
            setImmediate(iniciarFila);
            return;
        } catch (error) {
            console.error(
                'Criar campanha WhatsApp:',
                error
            );

            return res.status(500).json({
                message:
                    'Erro ao registrar a campanha. Verifique o histórico antes de tentar novamente.',
            });
        }
    }
);

// ==================================================
// RECUPERAÇÃO DE CAMPANHAS NA FILA
// ==================================================

// Ao reiniciar o servidor, retoma somente campanhas
// que ainda estavam QUEUED (sem iniciar).
//
// Campanhas PROCESSING não são retomadas
// automaticamente, pois algum destinatário
// pode ter sido enviado antes da interrupção.
//
// Para produção com múltiplos processos e
// recuperação avançada, usar fila persistente
// com workers e controle de concorrência.

setTimeout(() => {
    iniciarFila();
}, 3000);
