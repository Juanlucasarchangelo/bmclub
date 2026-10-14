
'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
} from 'react';

import {
    Upload,
    FileSpreadsheet,
    Send,
    Download,
    MessageCircle,
    ShieldCheck,
    History,
    Users,
} from 'lucide-react';

import { useRouter } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';

type Contato = {
    nome: string;
    telefone: string;
};

type Campanha = {
    id: string;
    title: string;
    templateName: string;
    status: string;
    createdAt: string;
    total: number;
};

type ResultadoEnvio = {
    id: string;
    status: string;
    total: number;
    message: string;
};

const campo =
    'w-full rounded-xl border border-white/15 bg-[#080808] px-4 py-3 text-white outline-none focus:border-[#DBB13F]';

const painel =
    'rounded-2xl border border-white/10 bg-[#111111] p-6';

const botao =
    'flex items-center justify-center gap-2 rounded-xl bg-[#DBB13F] px-5 py-3 font-semibold text-black transition hover:bg-[#D8BC7A] disabled:cursor-not-allowed disabled:opacity-40';

// ==================================================
// UUID COMPATÍVEL COM HTTP LOCAL
// ==================================================

function gerarUUID(): string {
    if (
        typeof globalThis.crypto !== 'undefined' &&
        typeof globalThis.crypto.randomUUID === 'function'
    ) {
        return globalThis.crypto.randomUUID();
    }

    const bytes = new Uint8Array(16);

    if (
        typeof globalThis.crypto !== 'undefined' &&
        typeof globalThis.crypto.getRandomValues === 'function'
    ) {
        globalThis.crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, '0')
    );

    return [
        hex.slice(0, 4).join(''),
        hex.slice(4, 6).join(''),
        hex.slice(6, 8).join(''),
        hex.slice(8, 10).join(''),
        hex.slice(10).join(''),
    ].join('-');
}

// ==================================================
// UTILITÁRIOS
// ==================================================

function normalizarCabecalho(valor: unknown): string {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function normalizarTelefone(valor: unknown): string {
    let telefone = String(valor ?? '').replace(/\D/g, '');

    if (telefone.length === 10 || telefone.length === 11) {
        telefone = `55${telefone}`;
    }

    if (telefone.length < 12 || telefone.length > 15) {
        return '';
    }

    return telefone;
}

function csvSeguro(valor: string): string {
    const seguro = /^\s*[=+\-@\t\r]/.test(valor)
        ? `'${valor}`
        : valor;

    return `"${seguro.replace(/"/g, '""')}"`;
}

function nomeStatus(status: string): string {
    const nomes: Record<string, string> = {
        QUEUED: 'Na fila',
        PROCESSING: 'Processando',
        EVOLUTION_ACCEPTED: 'Aceita pela Evolution',
        ACCEPTED: 'Aceita',
        SENT: 'Enviada',
        DELIVERED: 'Entregue',
        READ: 'Lida',
        FAILED: 'Falhou',
        UNKNOWN: 'Resultado incerto',
        ERROR: 'Erro',
        N8N_ACCEPTED: 'Aceita pelo n8n (antiga)',
    };

    return nomes[status] ?? status;
}

// ==================================================
// PÁGINA
// ==================================================

export default function EnvioMensagens() {
    const router = useRouter();

    const [autorizado, setAutorizado] = useState(false);
    const [verificando, setVerificando] = useState(true);

    const [titulo, setTitulo] = useState('');
    const [modelo, setModelo] = useState('mensagem_bmclub');
    const [idioma, setIdioma] = useState('pt_BR');

    const [mensagem, setMensagem] = useState(
        'Olá, $nome! Temos um convite especial para você.'
    );

    const [origemConsentimento, setOrigemConsentimento] =
        useState('');

    const [consentimento, setConsentimento] = useState(false);
    const [modeloConfirmado, setModeloConfirmado] =
        useState(false);

    const [contatos, setContatos] = useState<Contato[]>([]);
    const [campanhas, setCampanhas] = useState<Campanha[]>([]);

    const [importando, setImportando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState(false);

    const [aviso, setAviso] = useState('');
    const [erro, setErro] = useState('');

    const identificadorEnvio = useRef<string | null>(null);

    function atualizarFormulario() {
        setEnviado(false);
        identificadorEnvio.current = null;
    }

    // ==================================================
    // HISTÓRICO
    // ==================================================

    const carregarHistorico = useCallback(async () => {
        try {
            const lista = await api<Campanha[]>(
                '/ferramentas/whatsapp/campanhas'
            );

            setCampanhas(lista);
            return true;
        } catch (error) {
            setErro(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível carregar as campanhas.'
            );

            return false;
        }
    }, []);

    // ==================================================
    // AUTENTICAÇÃO
    // ==================================================

    useEffect(() => {
        const usuarioSalvo = localStorage.getItem('bmclub_user');
        const token = localStorage.getItem('bmclub_access');

        if (!usuarioSalvo || !token) {
            router.replace('/login');
            return;
        }

        try {
            const usuario = JSON.parse(usuarioSalvo);

            if (usuario.role !== 'ADMIN') {
                router.replace('/inicio');
                return;
            }

            void carregarHistorico().then((ok) => {
                setAutorizado(ok);
                setVerificando(false);
            });
        } catch {
            router.replace('/login');
        }
    }, [router, carregarHistorico]);

    // ==================================================
    // PERSONALIZAÇÃO
    // ==================================================

    const primeiroContato = contatos[0];

    function personalizar(nome: string): string {
        return mensagem.split('$nome').join(nome);
    }

    // ==================================================
    // IMPORTAR EXCEL / CSV
    // SEM LIMITE FIXO DE CONTATOS
    // ==================================================

    async function importarArquivo(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const arquivo = event.target.files?.[0];

        if (!arquivo) return;

        setImportando(true);
        setErro('');
        setAviso('');
        setContatos([]);
        atualizarFormulario();

        try {
            if (arquivo.size > 20 * 1024 * 1024) {
                throw new Error(
                    'O arquivo deve ter no máximo 20 MB.'
                );
            }

            const XLSX = await import('xlsx');
            const dados = await arquivo.arrayBuffer();

            const workbook = XLSX.read(dados, {
                type: 'array',
            });

            let linhasEncontradas: unknown[][] | null = null;
            let indiceNome = -1;
            let indiceTelefone = -1;

            for (const nomeAba of workbook.SheetNames) {
                const folha = workbook.Sheets[nomeAba];

                const linhas = XLSX.utils.sheet_to_json<unknown[]>(
                    folha,
                    {
                        header: 1,
                        defval: '',
                        raw: false,
                        blankrows: false,
                    }
                );

                for (
                    let indice = 0;
                    indice < Math.min(linhas.length, 30);
                    indice++
                ) {
                    const cabecalho = (linhas[indice] || []).map(
                        normalizarCabecalho
                    );

                    const nome = cabecalho.indexOf('nome');

                    const telefone = cabecalho.findIndex((valor) =>
                        ['telefone', 'celular', 'whatsapp'].includes(valor)
                    );

                    if (nome >= 0 && telefone >= 0) {
                        indiceNome = nome;
                        indiceTelefone = telefone;
                        linhasEncontradas = linhas.slice(indice + 1);
                        break;
                    }
                }

                if (linhasEncontradas) break;
            }

            if (!linhasEncontradas) {
                throw new Error(
                    'Não encontrei as colunas Nome e Telefone no arquivo.'
                );
            }

            const vistos = new Set<string>();
            const lista: Contato[] = [];

            for (const linha of linhasEncontradas) {
                const nome = String(
                    linha[indiceNome] ?? ''
                ).trim();

                const telefone = normalizarTelefone(
                    linha[indiceTelefone]
                );

                if (
                    !nome ||
                    nome.length > 150 ||
                    !telefone ||
                    vistos.has(telefone)
                ) {
                    continue;
                }

                vistos.add(telefone);

                lista.push({
                    nome,
                    telefone,
                });
            }

            if (!lista.length) {
                throw new Error(
                    'Nenhum contato válido foi encontrado.'
                );
            }

            setContatos(lista);

            setAviso(
                `${lista.length} contato(s) importado(s) com sucesso.`
            );
        } catch (error) {
            setErro(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível importar o arquivo.'
            );
        } finally {
            setImportando(false);
            event.target.value = '';
        }
    }

    // ==================================================
    // BAIXAR PRÉVIA CSV
    // ==================================================

    function baixarCSV() {
        if (!contatos.length) return;

        const linhas = [
            ['nome', 'telefone', 'mensagem'],
            ...contatos.map((contato) => [
                contato.nome,
                contato.telefone,
                personalizar(contato.nome),
            ]),
        ];

        const csv =
            '\uFEFF' +
            linhas
                .map((linha) =>
                    linha.map(csvSeguro).join(';')
                )
                .join('\r\n');

        const arquivo = new Blob([csv], {
            type: 'text/csv;charset=utf-8',
        });

        const endereco = URL.createObjectURL(arquivo);
        const link = document.createElement('a');

        link.href = endereco;
        link.download = 'bmclub-convites.csv';
        link.click();

        setTimeout(() => {
            URL.revokeObjectURL(endereco);
        }, 1000);
    }

    // ==================================================
    // ENVIAR CAMPANHA
    // ==================================================

    async function enviar() {
        setErro('');
        setAviso('');

        if (enviando || enviado) return;

        if (!contatos.length) {
            setErro('Importe uma lista de contatos.');
            return;
        }

        if (titulo.trim().length < 3) {
            setErro(
                'Informe um nome de campanha com pelo menos 3 caracteres.'
            );
            return;
        }

        if (!/^[a-z0-9_]{1,120}$/.test(modelo.trim())) {
            setErro(
                'O identificador deve conter apenas letras minúsculas, números e _.'
            );
            return;
        }

        if (!/^[a-z]{2}_[A-Z]{2}$/.test(idioma.trim())) {
            setErro('Informe um idioma válido, como pt_BR.');
            return;
        }

        if (!mensagem.includes('$nome')) {
            setErro('Inclua $nome no texto da mensagem.');
            return;
        }

        if (!consentimento || !origemConsentimento.trim()) {
            setErro(
                'Confirme a autorização dos contatos e informe sua origem.'
            );
            return;
        }

        if (!modeloConfirmado) {
            setErro(
                'Confirme que revisou o conteúdo da mensagem.'
            );
            return;
        }

        const confirmou = window.confirm(
            `Deseja registrar e iniciar a campanha "${titulo}" para ${contatos.length} contato(s) pela Evolution API?`
        );

        if (!confirmou) return;

        if (!identificadorEnvio.current) {
            identificadorEnvio.current = gerarUUID();
        }

        setEnviando(true);

        try {
            const resultado = await api<ResultadoEnvio>(
                '/ferramentas/whatsapp/campanhas',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        requestId: identificadorEnvio.current,
                        title: titulo.trim(),
                        message: mensagem,
                        templateName: modelo.trim(),
                        language: idioma.trim(),
                        consentConfirmed: consentimento,
                        templateConfirmed: modeloConfirmado,
                        consentSource: origemConsentimento.trim(),
                        contacts: contatos,
                    }),
                }
            );

            setAviso(resultado.message);
            setEnviado(true);

            await carregarHistorico();
        } catch (error) {
            const mensagemErro =
                error instanceof Error
                    ? error.message
                    : 'Erro ao comunicar com o servidor.';

            setErro(
                `${mensagemErro} Confira o histórico antes de tentar novamente para evitar duplicidades.`
            );

            // Resultado incerto: não liberar reenvio automático.
            setEnviado(true);

            await carregarHistorico();
        } finally {
            setEnviando(false);
        }
    }

    // ==================================================
    // VERIFICAÇÃO DE ACESSO
    // ==================================================

    if (verificando) {
        return (
            <Shell>
                <p className="text-[#DBB13F]">
                    Verificando acesso administrativo...
                </p>
            </Shell>
        );
    }

    if (!autorizado) {
        return (
            <Shell>
                <div className={painel}>
                    <h1 className="text-xl">
                        Acesso não autorizado
                    </h1>

                    <p className="mt-3 text-white/50">
                        Somente administradores podem acessar
                        esta ferramenta.
                    </p>

                    {erro && (
                        <p className="mt-3 text-red-400">
                            {erro}
                        </p>
                    )}
                </div>
            </Shell>
        );
    }

    // ==================================================
    // INTERFACE
    // ==================================================

    return (
        <Shell>
            {/* CABEÇALHO */}

            <header className="mb-8">
                <div className="mb-3 flex items-center gap-2 text-[#DBB13F]">
                    <MessageCircle size={18} />

                    <span className="text-xs tracking-[.25em] uppercase">
                        Ferramentas · Comunicação
                    </span>
                </div>

                <h1 className="text-3xl font-light md:text-5xl">
                    Envio de mensagens
                </h1>

                <p className="mt-3 text-white/45">
                    Prepare campanhas personalizadas para
                    múltiplos contatos e encaminhe pelo
                    WhatsApp através da Evolution API.
                </p>
            </header>

            {/* IMPORTAÇÃO + MENSAGEM */}

            <div className="grid gap-6 xl:grid-cols-2">
                <section className={painel}>
                    <div className="mb-5 flex items-center gap-3 text-[#DBB13F]">
                        <FileSpreadsheet size={20} />

                        <h2 className="text-lg font-medium">
                            01 · Importar contatos
                        </h2>
                    </div>

                    <label className="mb-2 block text-sm text-white/60">
                        Planilha Excel ou CSV
                    </label>

                    <label className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#DBB13F]/40 bg-[#DBB13F]/5 p-8 text-center">
                        <Upload
                            size={30}
                            className="text-[#DBB13F]"
                        />

                        <span className="text-sm">
                            {importando
                                ? 'Importando arquivo...'
                                : 'Selecione um arquivo XLSX, XLS ou CSV'}
                        </span>

                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={importarArquivo}
                            disabled={importando || enviando}
                            className="w-full max-w-[250px] text-xs text-white/50"
                        />
                    </label>

                    <p className="mt-4 text-sm text-white/45">
                        Colunas necessárias: <b>Nome</b> e{' '}
                        <b>Telefone</b>. Telefones brasileiros
                        devem ter DDD.
                    </p>

                    <div className="mt-5 rounded-xl border border-[#DBB13F]/20 bg-[#080808] p-4">
                        <div className="flex items-center gap-2 text-white/40">
                            <Users size={16} />

                            <p className="text-xs uppercase tracking-widest">
                                Contatos válidos
                            </p>
                        </div>

                        <p className="mt-2 text-3xl font-semibold text-[#DBB13F]">
                            {contatos.length}
                        </p>
                    </div>

                    <p className="mt-4 text-xs text-white/40">
                        Os números duplicados são removidos
                        automaticamente durante a importação.
                    </p>
                </section>

                {/* CONFIGURAÇÃO */}

                <section className={painel}>
                    <div className="mb-5 flex items-center gap-3 text-[#DBB13F]">
                        <MessageCircle size={20} />

                        <h2 className="text-lg font-medium">
                            02 · Configurar mensagem
                        </h2>
                    </div>

                    <label className="text-sm text-white/60">
                        Nome interno da campanha
                    </label>

                    <input
                        className={`${campo} mt-2 mb-4`}
                        value={titulo}
                        onChange={(e) => {
                            setTitulo(e.target.value);
                            atualizarFormulario();
                        }}
                        placeholder="Ex: Convite evento BMClub"
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-sm text-white/60">
                                Identificador interno
                            </label>

                            <input
                                className={`${campo} mt-2`}
                                value={modelo}
                                onChange={(e) => {
                                    setModelo(e.target.value);
                                    atualizarFormulario();
                                }}
                                placeholder="convite_bmclub"
                            />

                            <p className="mt-2 text-xs text-white/40">
                                Usado no histórico da campanha.
                            </p>
                        </div>

                        <div>
                            <label className="text-sm text-white/60">
                                Idioma
                            </label>

                            <input
                                className={`${campo} mt-2`}
                                value={idioma}
                                onChange={(e) => {
                                    setIdioma(e.target.value);
                                    atualizarFormulario();
                                }}
                                placeholder="pt_BR"
                            />
                        </div>
                    </div>

                    <label className="mt-5 block text-sm text-white/60">
                        Texto da mensagem
                    </label>

                    <textarea
                        className={`${campo} mt-2 min-h-[150px] resize-y`}
                        value={mensagem}
                        onChange={(e) => {
                            setMensagem(e.target.value);
                            atualizarFormulario();
                        }}
                        placeholder="Olá, $nome!"
                    />

                    <p className="mt-2 text-xs text-white/45">
                        Use <b>$nome</b> para inserir o nome
                        de cada destinatário automaticamente.
                    </p>

                    <label className="mt-5 block text-sm text-white/60">
                        Origem da autorização dos contatos
                    </label>

                    <input
                        className={`${campo} mt-2`}
                        value={origemConsentimento}
                        onChange={(e) => {
                            setOrigemConsentimento(e.target.value);
                            atualizarFormulario();
                        }}
                        placeholder="Ex: Formulário de inscrição BMClub"
                    />

                    <label className="mt-5 flex items-start gap-3 text-sm text-white/65">
                        <input
                            type="checkbox"
                            className="mt-1 accent-[#DBB13F]"
                            checked={consentimento}
                            onChange={(e) => {
                                setConsentimento(e.target.checked);
                                atualizarFormulario();
                            }}
                        />

                        Confirmo que todos os contatos autorizaram
                        receber mensagens do BMClub pelo WhatsApp.
                    </label>

                    <label className="mt-4 flex items-start gap-3 text-sm text-white/65">
                        <input
                            type="checkbox"
                            className="mt-1 accent-[#DBB13F]"
                            checked={modeloConfirmado}
                            onChange={(e) => {
                                setModeloConfirmado(e.target.checked);
                                atualizarFormulario();
                            }}
                        />

                        Confirmo que revisei o conteúdo e
                        autorizo o envio pela Evolution API.
                    </label>
                </section>
            </div>

            {/* CONFERÊNCIA */}

            <section className={`${painel} mt-6`}>
                <div className="mb-5 flex items-center gap-3 text-[#DBB13F]">
                    <ShieldCheck size={20} />

                    <h2 className="text-lg font-medium">
                        03 · Conferência e envio
                    </h2>
                </div>

                <p className="mb-3 text-sm text-white/50">
                    Prévia da mensagem para o primeiro contato:
                </p>

                <div className="min-h-[120px] whitespace-pre-wrap rounded-xl border border-white/10 bg-[#080808] p-5 leading-relaxed text-white/80">
                    {primeiroContato
                        ? personalizar(primeiroContato.nome)
                        : 'Importe uma lista para visualizar a mensagem.'}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={baixarCSV}
                        disabled={!contatos.length}
                        className="flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm text-white/80 transition hover:border-[#DBB13F] disabled:opacity-40"
                    >
                        <Download size={18} />
                        Baixar prévia CSV
                    </button>

                    <button
                        type="button"
                        onClick={enviar}
                        disabled={
                            enviando ||
                            enviado ||
                            !contatos.length ||
                            !titulo.trim() ||
                            !modelo.trim() ||
                            !consentimento ||
                            !modeloConfirmado ||
                            !origemConsentimento.trim()
                        }
                        className={botao}
                    >
                        <Send size={18} />

                        {enviando
                            ? 'REGISTRANDO CAMPANHA...'
                            : enviado
                                ? 'CAMPANHA REGISTRADA'
                                : `ENVIAR PARA ${contatos.length} CONTATO(S)`}
                    </button>
                </div>

                {erro && (
                    <div
                        role="alert"
                        className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400"
                    >
                        {erro}
                    </div>
                )}

                {aviso && (
                    <div
                        role="status"
                        className="mt-5 rounded-xl border border-[#DBB13F]/30 bg-[#DBB13F]/10 p-4 text-sm text-[#D8BC7A]"
                    >
                        {aviso}
                    </div>
                )}
            </section>

            {/* CONTATOS IMPORTADOS */}

            <section className={`${painel} mt-6`}>
                <h2 className="mb-5 text-lg font-medium">
                    Lista importada
                </h2>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-white/10 text-[#DBB13F]">
                            <tr>
                                <th className="py-3 pr-4">Nome</th>
                                <th className="py-3 pr-4">Telefone</th>
                                <th className="py-3">Prévia</th>
                            </tr>
                        </thead>

                        <tbody>
                            {contatos.slice(0, 30).map((contato) => (
                                <tr
                                    key={contato.telefone}
                                    className="border-b border-white/5 text-white/65"
                                >
                                    <td className="py-3 pr-4">
                                        {contato.nome}
                                    </td>

                                    <td className="py-3 pr-4">
                                        {contato.telefone}
                                    </td>

                                    <td className="max-w-xs truncate py-3">
                                        {personalizar(contato.nome)}
                                    </td>
                                </tr>
                            ))}

                            {!contatos.length && (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="py-8 text-center text-white/40"
                                    >
                                        Nenhum contato importado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {contatos.length > 30 && (
                    <p className="mt-4 text-xs text-white/40">
                        Exibindo os primeiros 30 contatos de{' '}
                        {contatos.length}.
                    </p>
                )}
            </section>

            {/* HISTÓRICO */}

            <section className={`${painel} mt-6`}>
                <div className="mb-5 flex items-center gap-3 text-[#DBB13F]">
                    <History size={20} />

                    <h2 className="text-lg font-medium">
                        Histórico de campanhas
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-white/10 text-[#DBB13F]">
                            <tr>
                                <th className="py-3 pr-4">Campanha</th>
                                <th className="py-3 pr-4">Data</th>
                                <th className="py-3 pr-4">Contatos</th>
                                <th className="py-3">Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {campanhas.map((campanha) => (
                                <tr
                                    key={campanha.id}
                                    className="border-b border-white/5 text-white/65"
                                >
                                    <td className="py-3 pr-4">
                                        {campanha.title}
                                    </td>

                                    <td className="py-3 pr-4">
                                        {new Date(
                                            campanha.createdAt
                                        ).toLocaleString('pt-BR')}
                                    </td>

                                    <td className="py-3 pr-4">
                                        {campanha.total}
                                    </td>

                                    <td className="py-3">
                                        <span className="rounded-full border border-[#DBB13F]/30 bg-[#DBB13F]/10 px-3 py-1 text-xs text-[#DBB13F]">
                                            {nomeStatus(campanha.status)}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {!campanhas.length && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="py-8 text-center text-white/40"
                                    >
                                        Nenhuma campanha registrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <p className="mt-6 text-xs text-white/40">
                O BMClub utiliza a Evolution API para enviar
                mensagens pelo WhatsApp. A aceitação pela API
                não garante a entrega ou leitura.
            </p>
        </Shell>
    );
}
