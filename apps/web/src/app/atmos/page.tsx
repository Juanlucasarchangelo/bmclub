
'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
} from 'react';

import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { Card } from '@/components/Card';

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000';

type Espaco = {
    id: string;
    name: string;
    description: string | null;
    capacity: number;
};

type Intervalo = {
    inicio: string;
    fim: string;
};

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function dataISO(ano: number, mes: number, dia: number) {
    return [
        ano,
        String(mes + 1).padStart(2, '0'),
        String(dia).padStart(2, '0'),
    ].join('-');
}

function hojeSP() {
    const partes = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());

    const valor = (tipo: string) =>
        partes.find((p) => p.type === tipo)?.value || '';

    return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

function horarioParaData(data: string, hora: string) {
    return new Date(`${data}T${hora}:00-03:00`);
}

function horarioLocal(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function Atmos() {
    // ==================================================
    // ESTADOS
    // ==================================================

    const carrosselRef = useRef<HTMLDivElement>(null);

    const arrastoRef = useRef({
        pressionado: false,
        inicioX: 0,
        scrollInicial: 0,
        arrastou: false,
    });

    const ignorarCliqueRef = useRef(false);

    const [arrastando, setArrastando] = useState(false);
    const [podeVoltar, setPodeVoltar] = useState(false);
    const [podeAvancar, setPodeAvancar] = useState(false);
    const [progresso, setProgresso] = useState(0);

    const [espacos, setEspacos] = useState<Espaco[]>([]);
    const [espacoId, setEspacoId] = useState('');

    const [data, setData] = useState(hojeSP());
    const [inicio, setInicio] = useState('12:00');
    const [fim, setFim] = useState('14:50');
    const [pessoas, setPessoas] = useState(1);
    const [observacoes, setObservacoes] = useState('');

    const [ocupados, setOcupados] = useState<Intervalo[]>([]);

    const [loading, setLoading] = useState(true);
    const [consultando, setConsultando] = useState(false);
    const [salvando, setSalvando] = useState(false);

    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');

    const [ano, mes] = data.split('-').map(Number);

    const espaco = espacos.find(
        (item) => item.id === espacoId
    );

    // ==================================================
    // CARROSSEL - ESTADO E PROGRESSO
    // ==================================================

    const atualizarCarrossel = useCallback(() => {
        const elemento = carrosselRef.current;

        if (!elemento) return;

        const maxScroll = Math.max(
            0,
            elemento.scrollWidth - elemento.clientWidth
        );

        setPodeVoltar(elemento.scrollLeft > 3);

        setPodeAvancar(
            elemento.scrollLeft < maxScroll - 3
        );

        setProgresso(
            maxScroll > 0
                ? Math.min(
                    100,
                    Math.max(
                        0,
                        (elemento.scrollLeft / maxScroll) * 100
                    )
                )
                : 100
        );
    }, []);

    function moverCarrossel(
        direcao: 'anterior' | 'proximo'
    ) {
        const elemento = carrosselRef.current;

        if (!elemento) return;

        const card =
            elemento.querySelector<HTMLElement>(
                '[data-card-atmos]'
            );

        if (!card) return;

        const estilos = window.getComputedStyle(elemento);

        const gap =
            parseFloat(estilos.columnGap) || 16;

        const distancia =
            card.getBoundingClientRect().width + gap;

        elemento.scrollBy({
            left:
                direcao === 'proximo'
                    ? distancia
                    : -distancia,
            behavior: 'smooth',
        });
    }

    // ==================================================
    // CARROSSEL - ARRASTE COM MOUSE
    // ==================================================

    function iniciarArrasto(
        e: ReactPointerEvent<HTMLDivElement>
    ) {
        if (e.pointerType !== 'mouse') return;
        if (e.button !== 0) return;

        const elemento = carrosselRef.current;

        if (!elemento) return;

        ignorarCliqueRef.current = false;

        arrastoRef.current = {
            pressionado: true,
            inicioX: e.clientX,
            scrollInicial: elemento.scrollLeft,
            arrastou: false,
        };
    }

    function duranteArrasto(
        e: ReactPointerEvent<HTMLDivElement>
    ) {
        if (!arrastoRef.current.pressionado) return;

        const elemento = carrosselRef.current;

        if (!elemento) return;

        const distancia =
            e.clientX - arrastoRef.current.inicioX;

        if (Math.abs(distancia) > 5) {
            arrastoRef.current.arrastou = true;
            ignorarCliqueRef.current = true;
            setArrastando(true);
        }

        if (arrastoRef.current.arrastou) {
            e.preventDefault();

            elemento.scrollLeft =
                arrastoRef.current.scrollInicial -
                distancia;
        }
    }

    function terminarArrasto() {
        arrastoRef.current.pressionado = false;
        setArrastando(false);
    }

    function selecionarEspaco(item: Espaco) {
        if (ignorarCliqueRef.current) {
            ignorarCliqueRef.current = false;
            return;
        }

        setEspacoId(item.id);
        setPessoas(1);
        setSucesso('');
        setErro('');
    }

    useEffect(() => {
        if (loading) return;

        const elemento = carrosselRef.current;

        if (!elemento) return;

        atualizarCarrossel();

        const observer = new ResizeObserver(() => {
            atualizarCarrossel();
        });

        observer.observe(elemento);

        return () => observer.disconnect();
    }, [loading, espacos, atualizarCarrossel]);

    // ==================================================
    // CARREGAR ESPAÇOS E SALAS
    // ==================================================

    useEffect(() => {
        async function carregar() {
            setLoading(true);
            setErro('');

            try {
                const resposta = await fetch(
                    `${API_URL}/atmos/espacos`,
                    {
                        cache: 'no-store',
                    }
                );

                if (!resposta.ok) {
                    throw new Error(
                        'Não foi possível carregar os espaços.'
                    );
                }

                const lista: Espaco[] =
                    await resposta.json();

                setEspacos(lista);

                if (lista.length > 0) {
                    setEspacoId(lista[0].id);
                }
            } catch (error) {
                setErro(
                    error instanceof Error
                        ? error.message
                        : 'Erro ao carregar espaços.'
                );
            } finally {
                setLoading(false);
            }
        }

        void carregar();
    }, []);

    // ==================================================
    // CONSULTAR DISPONIBILIDADE
    // ==================================================

    useEffect(() => {
        if (!espacoId || !data) return;

        let ativo = true;

        async function consultar() {
            setConsultando(true);
            setErro('');
            setOcupados([]);

            try {
                const url = new URL(
                    `${API_URL}/atmos/disponibilidade`
                );

                url.searchParams.set(
                    'spaceId',
                    espacoId
                );

                url.searchParams.set(
                    'data',
                    data
                );

                const resposta = await fetch(
                    url.toString(),
                    {
                        cache: 'no-store',
                    }
                );

                const resultado =
                    await resposta.json();

                if (!resposta.ok) {
                    throw new Error(
                        resultado.message ||
                        'Não foi possível consultar disponibilidade.'
                    );
                }

                if (ativo) {
                    setOcupados(
                        resultado.intervalosOcupados || []
                    );
                }
            } catch (error) {
                if (ativo) {
                    setErro(
                        error instanceof Error
                            ? error.message
                            : 'Erro ao consultar disponibilidade.'
                    );
                }
            } finally {
                if (ativo) {
                    setConsultando(false);
                }
            }
        }

        void consultar();

        return () => {
            ativo = false;
        };
    }, [espacoId, data]);

    // ==================================================
    // CALENDÁRIO
    // ==================================================

    const primeiroDia = new Date(
        Date.UTC(ano, mes - 1, 1)
    ).getUTCDay();

    const diasNoMes = new Date(
        Date.UTC(ano, mes, 0)
    ).getUTCDate();

    const mesNome = new Intl.DateTimeFormat(
        'pt-BR',
        {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
        }
    ).format(
        new Date(Date.UTC(ano, mes - 1, 1))
    );

    function mudarMes(diferenca: number) {
        const novaData = new Date(
            Date.UTC(
                ano,
                mes - 1 + diferenca,
                1
            )
        );

        const novoAno =
            novaData.getUTCFullYear();

        const novoMes =
            novaData.getUTCMonth();

        const primeiro = dataISO(
            novoAno,
            novoMes,
            1
        );

        setData(
            primeiro < hojeSP()
                ? hojeSP()
                : primeiro
        );

        setSucesso('');
    }

    // ==================================================
    // VALIDAÇÕES DA RESERVA
    // ==================================================

    const inicioData = horarioParaData(
        data,
        inicio
    );

    const fimData = horarioParaData(
        data,
        fim
    );

    const domingo =
        new Date(
            `${data}T12:00:00Z`
        ).getUTCDay() === 0;

    const foraDoHorario =
        inicio < '09:00' ||
        fim > '21:00' ||
        fim <= inicio;

    const passado =
        inicioData <= new Date();

    const conflito = ocupados.some(
        (intervalo) => {
            const ocupadoInicio = new Date(
                intervalo.inicio
            );

            const ocupadoFim = new Date(
                intervalo.fim
            );

            return (
                inicioData < ocupadoFim &&
                fimData > ocupadoInicio
            );
        }
    );

    const disponivel =
        !!espaco &&
        !domingo &&
        !foraDoHorario &&
        !passado &&
        !conflito &&
        pessoas >= 1 &&
        pessoas <= espaco.capacity &&
        !consultando &&
        !erro;

    // ==================================================
    // CONFIRMAR RESERVA
    // ==================================================

    async function reservar() {
        if (!disponivel || !espaco) return;

        const token = localStorage.getItem(
            'bmclub_access'
        );

        if (!token) {
            setErro(
                'Faça login para confirmar sua reserva.'
            );
            return;
        }

        setSalvando(true);
        setErro('');
        setSucesso('');

        try {
            const resposta = await fetch(
                `${API_URL}/atmos/reservar`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                        Authorization:
                            `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        spaceId: espaco.id,
                        data,
                        inicio,
                        fim,
                        guests: pessoas,
                        notes:
                            observacoes || undefined,
                    }),
                }
            );

            const resultado =
                await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    resultado.message ||
                    'Não foi possível concluir a reserva.'
                );
            }

            setSucesso(
                'Reserva confirmada com sucesso!'
            );

            setOcupados((anteriores) => [
                ...anteriores,
                {
                    inicio:
                        inicioData.toISOString(),
                    fim:
                        fimData.toISOString(),
                },
            ]);
        } catch (error) {
            setErro(
                error instanceof Error
                    ? error.message
                    : 'Erro ao reservar.'
            );
        } finally {
            setSalvando(false);
        }
    }

    // ==================================================
    // INTERFACE
    // ==================================================

    return (
        <Shell>
            <p className="gold text-xs tracking-[.25em]">
                ATMOS CLUB
            </p>

            <h1 className="text-4xl mt-2">
                Reserve uma experiência
            </h1>

            <p className="text-white/45 mt-3 mb-8">
                Escolha seu espaço, data e horário.
                Segunda a sábado, das 09h00 às 21h00.
            </p>

            {loading ? (
                <Card>
                    <p className="text-white/50">
                        Carregando espaços...
                    </p>
                </Card>
            ) : (
                <>
                    {/* ===================================
                        CABEÇALHO DO CARROSSEL
                    =================================== */}

                    <div className="flex items-center justify-between gap-4 mb-5">
                        <div>
                            <h2 className="text-xl">
                                1. Escolha o espaço
                            </h2>

                            <p className="text-white/40 text-sm mt-1">
                                {espacos.length}{' '}
                                ambientes disponíveis
                            </p>
                        </div>

                        {/* BOTÕES - TABLET E DESKTOP */}

                        <div className="hidden sm:flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    moverCarrossel('anterior')
                                }
                                disabled={!podeVoltar}
                                aria-label="Ver ambientes anteriores"
                                className="w-11 h-11 rounded-xl border border-[#DBB13F]/40 text-[#DBB13F] hover:bg-[#DBB13F] hover:text-black transition disabled:opacity-25 disabled:cursor-not-allowed"
                            >
                                ←
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    moverCarrossel('proximo')
                                }
                                disabled={!podeAvancar}
                                aria-label="Ver próximos ambientes"
                                className="w-11 h-11 rounded-xl border border-[#DBB13F]/40 text-[#DBB13F] hover:bg-[#DBB13F] hover:text-black transition disabled:opacity-25 disabled:cursor-not-allowed"
                            >
                                →
                            </button>
                        </div>
                    </div>

                    {/* INDICAÇÃO PARA CELULAR */}

                    {espacos.length > 1 && (
                        <div className="sm:hidden flex items-center gap-2 mb-4 text-[#DBB13F] text-sm">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#DBB13F]/30">
                                ⇆
                            </span>

                            <span>
                                Deslize para ver mais ambientes →
                            </span>
                        </div>
                    )}

                    {/* ===================================
                        CARROSSEL
                    =================================== */}

                    <div
                        ref={carrosselRef}
                        onPointerDown={iniciarArrasto}
                        onPointerMove={duranteArrasto}
                        onPointerUp={terminarArrasto}
                        onPointerCancel={terminarArrasto}
                        onPointerLeave={terminarArrasto}
                        onScroll={atualizarCarrossel}
                        className={`
                            flex gap-4
                            overflow-x-auto
                            snap-x snap-mandatory
                            select-none
                            pb-3
                            [scrollbar-width:none]
                            [&::-webkit-scrollbar]:hidden
                            ${arrastando
                                ? 'cursor-grabbing snap-none'
                                : 'cursor-grab'
                            }
                        `}
                    >
                        {espacos.map((item) => (
                            <button
                                key={item.id}
                                data-card-atmos
                                type="button"
                                draggable={false}
                                onClick={() =>
                                    selecionarEspaco(item)
                                }
                                className={`
                                    shrink-0 snap-start
                                    text-left
                                    w-[85%]
                                    sm:w-[calc((100%-1rem)/2)]
                                    lg:w-[calc((100%-2rem)/3)]
                                    bg-[#111111]
                                    rounded-2xl
                                    border p-5
                                    transition-colors
                                    ${espacoId === item.id
                                        ? 'border-[#DBB13F]'
                                        : 'border-white/10 hover:border-white/30'
                                    }
                                `}
                            >
                                <div className="h-24 rounded-xl bg-[radial-gradient(circle_at_70%_30%,rgba(54,31,91,.7),transparent_65%)] border border-white/5" />

                                <p className="gold text-xs mt-5">
                                    ATMOS CLUB
                                </p>

                                <h3 className="text-xl mt-2">
                                    {item.name}
                                </h3>

                                {item.description && (
                                    <p className="text-white/40 text-sm mt-2 line-clamp-2">
                                        {item.description}
                                    </p>
                                )}

                                <p className="text-white/45 text-sm mt-2">
                                    Até {item.capacity} pessoas
                                </p>

                                <p className="gold text-sm mt-5">
                                    {espacoId === item.id
                                        ? '✓ SELECIONADO'
                                        : 'SELECIONAR →'}
                                </p>
                            </button>
                        ))}
                    </div>

                    {/* BARRA DE PROGRESSO */}

                    {espacos.length > 1 && (
                        <div className="mt-4 mb-10">
                            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full bg-[#DBB13F] rounded-full transition-[width] duration-150"
                                    style={{
                                        width: `${Math.max(
                                            8,
                                            progresso
                                        )}%`,
                                    }}
                                />
                            </div>

                            <p className="text-white/30 text-xs mt-2 text-right">
                                {podeAvancar
                                    ? 'Explore os próximos ambientes'
                                    : 'Você visualizou todos os ambientes'}
                            </p>
                        </div>
                    )}

                    {espacos.length === 0 && (
                        <Card>
                            <p className="text-white/50">
                                Nenhum espaço ou sala
                                disponível para reserva.
                            </p>
                        </Card>
                    )}

                    {/* ===================================
                        CALENDÁRIO E FORMULÁRIO
                    =================================== */}

                    {espaco && (
                        <div className="grid lg:grid-cols-2 gap-6">
                            {/* CALENDÁRIO */}

                            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6">
                                <h2 className="text-xl mb-6">
                                    2. Escolha a data
                                </h2>

                                <div className="flex items-center justify-between mb-6">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            mudarMes(-1)
                                        }
                                        disabled={
                                            dataISO(
                                                ano,
                                                mes - 1,
                                                1
                                            ) <=
                                            hojeSP().slice(
                                                0,
                                                7
                                            ) + '-01'
                                        }
                                        className="text-[#DBB13F] px-3 py-2 disabled:opacity-20"
                                    >
                                        ←
                                    </button>

                                    <h3 className="capitalize">
                                        {mesNome}
                                    </h3>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            mudarMes(1)
                                        }
                                        className="text-[#DBB13F] px-3 py-2"
                                    >
                                        →
                                    </button>
                                </div>

                                <div className="grid grid-cols-7 gap-2">
                                    {DIAS.map(
                                        (dia, index) => (
                                            <div
                                                key={index}
                                                className="text-center text-white/35 text-xs py-2"
                                            >
                                                {dia}
                                            </div>
                                        )
                                    )}

                                    {Array.from({
                                        length: primeiroDia,
                                    }).map((_, index) => (
                                        <div
                                            key={`vazio-${index}`}
                                        />
                                    ))}

                                    {Array.from({
                                        length: diasNoMes,
                                    }).map((_, index) => {
                                        const dia =
                                            index + 1;

                                        const valor =
                                            dataISO(
                                                ano,
                                                mes - 1,
                                                dia
                                            );

                                        const diaSemana =
                                            new Date(
                                                Date.UTC(
                                                    ano,
                                                    mes - 1,
                                                    dia
                                                )
                                            ).getUTCDay();

                                        const bloqueado =
                                            diaSemana === 0 ||
                                            valor < hojeSP();

                                        return (
                                            <button
                                                key={valor}
                                                type="button"
                                                disabled={
                                                    bloqueado
                                                }
                                                onClick={() => {
                                                    setData(
                                                        valor
                                                    );
                                                    setSucesso(
                                                        ''
                                                    );
                                                }}
                                                className={`
                                                    aspect-square
                                                    rounded-xl
                                                    text-sm
                                                    transition
                                                    ${data === valor
                                                        ? 'bg-[#DBB13F] text-black font-semibold'
                                                        : bloqueado
                                                            ? 'text-white/15 cursor-not-allowed'
                                                            : 'bg-white/5 hover:bg-white/15'
                                                    }
                                                `}
                                            >
                                                {dia}
                                            </button>
                                        );
                                    })}
                                </div>

                                <p className="text-white/35 text-xs mt-5">
                                    Domingos e datas passadas
                                    estão bloqueados.
                                </p>
                            </div>

                            {/* FORMULÁRIO */}

                            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6">
                                <h2 className="text-xl mb-6">
                                    3. Personalize a reserva
                                </h2>

                                <p className="text-white/45 text-sm mb-5">
                                    {espaco.name} · até{' '}
                                    {espaco.capacity} pessoas
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="text-white/45 text-xs">
                                            Início
                                        </span>

                                        <input
                                            type="time"
                                            step="60"
                                            value={inicio}
                                            onChange={(e) => {
                                                setInicio(
                                                    e.target.value
                                                );
                                                setSucesso(
                                                    ''
                                                );
                                            }}
                                            className="mt-2 w-full bg-[#080808] border border-white/15 rounded-xl p-3 text-white"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="text-white/45 text-xs">
                                            Término
                                        </span>

                                        <input
                                            type="time"
                                            step="60"
                                            value={fim}
                                            onChange={(e) => {
                                                setFim(
                                                    e.target.value
                                                );
                                                setSucesso(
                                                    ''
                                                );
                                            }}
                                            className="mt-2 w-full bg-[#080808] border border-white/15 rounded-xl p-3 text-white"
                                        />
                                    </label>
                                </div>

                                <label className="block mt-5">
                                    <span className="text-white/45 text-xs">
                                        Quantidade de pessoas
                                    </span>

                                    <input
                                        type="number"
                                        min={1}
                                        max={espaco.capacity}
                                        value={pessoas}
                                        onChange={(e) =>
                                            setPessoas(
                                                Number(
                                                    e.target.value
                                                )
                                            )
                                        }
                                        className="mt-2 w-full bg-[#080808] border border-white/15 rounded-xl p-3 text-white"
                                    />
                                </label>

                                <label className="block mt-5">
                                    <span className="text-white/45 text-xs">
                                        Observações (opcional)
                                    </span>

                                    <textarea
                                        rows={3}
                                        maxLength={1000}
                                        value={observacoes}
                                        onChange={(e) =>
                                            setObservacoes(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Informações sobre sua experiência"
                                        className="mt-2 w-full bg-[#080808] border border-white/15 rounded-xl p-3 text-white resize-none"
                                    />
                                </label>

                                {/* HORÁRIOS OCUPADOS */}

                                <div className="mt-6 pt-5 border-t border-white/10">
                                    <p className="text-white/45 text-xs mb-3">
                                        Horários ocupados nesta data
                                    </p>

                                    {consultando ? (
                                        <p className="text-white/40 text-sm">
                                            Consultando agenda...
                                        </p>
                                    ) : ocupados.length === 0 ? (
                                        <p className="text-green-400 text-sm">
                                            Nenhum horário ocupado.
                                        </p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {ocupados.map(
                                                (intervalo, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs"
                                                    >
                                                        {horarioLocal(
                                                            intervalo.inicio
                                                        )}
                                                        {' – '}
                                                        {horarioLocal(
                                                            intervalo.fim
                                                        )}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* STATUS */}

                                {!consultando && !sucesso && (
                                    <p
                                        className={`mt-5 text-sm ${disponivel
                                                ? 'text-green-400'
                                                : 'text-amber-400'
                                            }`}
                                    >
                                        {domingo
                                            ? 'Domingos não estão disponíveis.'
                                            : foraDoHorario
                                                ? 'Escolha um período entre 09h00 e 21h00.'
                                                : passado
                                                    ? 'Escolha um horário futuro.'
                                                    : conflito
                                                        ? 'O horário escolhido está ocupado.'
                                                        : pessoas >
                                                            espaco.capacity ||
                                                            pessoas < 1
                                                            ? 'Quantidade de pessoas inválida.'
                                                            : disponivel
                                                                ? '✓ Horário disponível para reserva.'
                                                                : 'Verifique os dados da reserva.'}
                                    </p>
                                )}

                                {erro && (
                                    <p className="text-red-400 text-sm mt-5">
                                        {erro}
                                    </p>
                                )}

                                {sucesso && (
                                    <div className="mt-5">
                                        <p className="text-green-400">
                                            ✓ {sucesso}
                                        </p>

                                        <Link
                                            href="/reservas"
                                            className="inline-block text-[#DBB13F] text-sm mt-3"
                                        >
                                            VER MINHAS RESERVAS →
                                        </Link>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={reservar}
                                    disabled={
                                        !disponivel ||
                                        salvando ||
                                        !!sucesso
                                    }
                                    className="mt-6 w-full bg-[#DBB13F] text-black font-semibold py-4 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    {salvando
                                        ? 'CONFIRMANDO...'
                                        : 'CONFIRMAR RESERVA'}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </Shell>
    );
}
