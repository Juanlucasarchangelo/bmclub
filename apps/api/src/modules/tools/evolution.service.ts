
import { env } from '../../config/env.js';

type EnviarMensagemParams = {
    telefone: string;
    mensagem: string;
};

type EvolutionResponse = {
    key?: {
        id?: string;
        remoteJid?: string;
    };
    status?: string;
};

export async function enviarMensagemEvolution({
    telefone,
    mensagem,
}: EnviarMensagemParams): Promise<EvolutionResponse> {
    const url = `${env.EVOLUTION_API_URL.replace(/\/$/, '')}/message/sendText/${encodeURIComponent(env.EVOLUTION_INSTANCE)}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            apikey: env.EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            number: telefone,
            text: mensagem,
        }),
        signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
        const erro = await response.text();
        throw new Error(
            `Evolution API retornou HTTP ${response.status}: ${erro.slice(0, 300)}`
        );
    }

    return (await response.json()) as EvolutionResponse;
}
