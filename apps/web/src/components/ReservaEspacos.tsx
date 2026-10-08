
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

type Categoria = 'ATMOS' | 'SALA';

type Espaco = {
    id: string;
    name: string;
    description: string | null;
    capacity: number;
    category: Categoria;
};

type Intervalo = {
    inicio: string;
    fim: string;
    tipo: string;
    ambiente: string;
    spaceId: string;
};

type Disponibilidade = {
    disponivel: boolean;
    motivo: string;
    vagasRestantes: number;
    intervalosOcupados: Intervalo[];
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
        partes.find(p => p.type === tipo)?.value || '';

    return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

function horarioLocal(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function erroDaApi(resultado: any, padrao: string) {
    return typeof resultado?.message === 'string'
        ? resultado.message
        : padrao;
}

export function ReservaEspacos({
    categoria,
}: {
    categoria: Categoria;
}) {
    const titulo =
        categoria === 'ATMOS' ? 'ATMOS CLUB' : 'SALAS';

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

    const [agenda, setAgenda] = useState<Disponibilidade | null>(null);
    const [loading, setLoading] = useState(true);
    const [consultando, setConsultando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');
    const [revisao, setRevisao] = useState(0);

    const espaco = espacos.find(item => item.id === espacoId);
    const [ano, mes] = data.split('-').map(Number);

    const maxPessoas = espaco
        ? categoria === 'ATMOS'
            ? Math.min(
                espaco.capacity,
                espaco.name.normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .trim().toUpperCase() === 'BALCAO'
                    ? 2
                    : espaco.name.trim().toUpperCase() === 'MESA'
                        ? 10
                        : espaco.name.trim().toUpperCase() === 'PRIVADO'
                            ? 30
                            : espaco.capacity
            )
            : espaco.capacity
        : 1;

    const atualizarCarrossel = useCallback(() => {
        const elemento = carrosselRef.current;
        if (!elemento) return;

        const maxScroll = Math.max(
            0,
            elemento.scrollWidth - elemento.clientWidth
        );

        setPodeVoltar(elemento.scrollLeft > 3);
        setPodeAvancar(elemento.scrollLeft < maxScroll - 3);
        setProgresso(
            maxScroll > 0
                ? Math.min(100, Math.max(
                    0,
                    (elemento.scrollLeft / maxScroll) * 100
                ))
                : 100
        );
    }, []);

    function moverCarrossel(direcao: 'anterior' | 'proximo') {
        const elemento = carrosselRef.current;
        if (!elemento) return;

        const card = elemento.querySelector<HTMLElement>(
            '[data-card-atmos]'
        );
        if (!card) return;

        const gap =
            parseFloat(window.getComputedStyle(elemento).columnGap) || 16;

        const distancia =
            card.getBoundingClientRect().width + gap;

        elemento.scrollBy({
            left: direcao === 'proximo' ? distancia : -distancia,
            behavior: 'smooth',
        });
    }

    function iniciarArrasto(e: ReactPointerEvent<HTMLDivElement>) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;

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

    function duranteArrasto(e: ReactPointerEvent<HTMLDivElement>) {
        if (!arrastoRef.current.pressionado) return;

        const elemento = carrosselRef.current;
        if (!elemento) return;

        const distancia = e.clientX - arrastoRef.current.inicioX;

        if (Math.abs(distancia) > 5) {
            arrastoRef.current.arrastou = true;
            ignorarCliqueRef.current = true;
            setArrastando(true);
        }

        if (arrastoRef.current.arrastou) {
            e.preventDefault();
            elemento.scrollLeft =
                arrastoRef.current.scrollInicial - distancia;
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
        setAgenda(null);
        setSucesso('');
        setErro('');
    }

    useEffect(() => {
        let ativo = true;

        async function carregar() {
            setLoading(true);
            setErro('');
            setEspacos([]);
            setEspacoId('');

            try {
                const url = new URL(`${API_URL}/atmos/espacos`);

                url.searchParams.set('category', categoria);

                const resposta = await fetch(url.toString(), {
                    cache: 'no-store',
                });

                const resultado = await resposta.json();

                if (!resposta.ok) {
                    throw new Error(
                        resultado.message || 'Erro ao carregar espaços.'
                    );
                }

                if (!Array.isArray(resultado)) {
                    throw new Error('Resposta inválida da API.');
                }

                // Segunda proteção: só exibir a categoria solicitada.
                const lista: Espaco[] = resultado.filter(
                    (item: Espaco) =>
                        item.category === categoria
                );

                if (!ativo) return;

                setEspacos(lista);
                setEspacoId(lista[0]?.id || '');

                console.log('BMClub - Categoria:', categoria);
                console.log('BMClub - Ambientes recebidos:', resultado);
                console.log('BMClub - Ambientes filtrados:', lista);

            } catch (error) {
                if (ativo) {
                    setErro(
                        error instanceof Error
                            ? error.message
                            : 'Erro ao carregar espaços.'
                    );
                }
            } finally {
                if (ativo) {
                    setLoading(false);
                }
            }
        }

        void carregar();

        return () => {
            ativo = false;
        };
    }, [categoria]);

    useEffect(() => {
        if (loading) return;

        atualizarCarrossel();

        const elemento = carrosselRef.current;
        if (!elemento) return;

        const observer = new ResizeObserver(atualizarCarrossel);
        observer.observe(elemento);

        return () => observer.disconnect();
    }, [loading, espacos, atualizarCarrossel]);

    useEffect(() => {
        if (!espacoId || !data || !inicio || !fim) {
            setAgenda(null);
            return;
        }

        const controller = new AbortController();
        let ativo = true;

        setConsultando(true);
        setAgenda(null);
        setErro('');

        async function consultar() {
            try {
                const url = new URL(
                    `${API_URL}/atmos/disponibilidade`
                );

                url.searchParams.set('spaceId', espacoId);
                url.searchParams.set('data', data);
                url.searchParams.set('inicio', inicio);
                url.searchParams.set('fim', fim);

                const resposta = await fetch(url.toString(), {
                    cache: 'no-store',
                    signal: controller.signal,
                });

                const resultado = await resposta.json();

                if (!resposta.ok) {
                    throw new Error(
                        erroDaApi(
                            resultado,
                            'Não foi possível consultar disponibilidade.'
                        )
                    );
                }

                if (ativo) setAgenda(resultado);
            } catch (error) {
                if (ativo && !controller.signal.aborted) {
                    setErro(
                        error instanceof Error
                            ? error.message
                            : 'Erro ao consultar disponibilidade.'
                    );
                }
            } finally {
                if (ativo) setConsultando(false);
            }
        }

        void consultar();

        return () => {
            ativo = false;
            controller.abort();
        };
    }, [espacoId, data, inicio, fim, revisao]);

    const primeiroDia = new Date(
        Date.UTC(ano, mes - 1, 1)
    ).getUTCDay();

    const diasNoMes = new Date(
        Date.UTC(ano, mes, 0)
    ).getUTCDate();

    const mesNome = new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(ano, mes - 1, 1)));

    function mudarMes(diferenca: number) {
        const novaData = new Date(
            Date.UTC(ano, mes - 1 + diferenca, 1)
        );

        const primeiro = dataISO(
            novaData.getUTCFullYear(),
            novaData.getUTCMonth(),
            1
        );

        setData(primeiro < hojeSP() ? hojeSP() : primeiro);
        setSucesso('');
    }

    const domingo =
        new Date(`${data}T12:00:00Z`).getUTCDay() === 0;

    const foraDoHorario =
        inicio < '09:00' ||
        fim > '21:00' ||
        fim <= inicio;

    const inicioData = new Date(
        `${data}T${inicio}:00-03:00`
    );

    const passado = inicioData <= new Date();

    const pessoasInvalidas =
        !Number.isInteger(pessoas) ||
        pessoas < 1 ||
        pessoas > maxPessoas;

    const disponivel =
        !!espaco &&
        !!agenda?.disponivel &&
        !domingo &&
        !foraDoHorario &&
        !passado &&
        !pessoasInvalidas &&
        !consultando &&
        !erro;

    async function reservar() {
        if (!disponivel || !espaco || salvando) return;

        const token = localStorage.getItem('bmclub_access');

        if (!token) {
            setErro('Faça login para confirmar sua reserva.');
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
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        spaceId: espaco.id,
                        data,
                        inicio,
                        fim,
                        guests: pessoas,
                        notes: observacoes || undefined,
                    }),
                }
            );

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    erroDaApi(
                        resultado,
                        'Não foi possível concluir a reserva.'
                    )
                );
            }

            setSucesso('Reserva confirmada com sucesso!');
            setRevisao(valor => valor + 1);
        } catch (error) {
            setErro(
                error instanceof Error
                    ? error.message
                    : 'Erro ao reservar.'
            );
            setRevisao(valor => valor + 1);
        } finally {
            setSalvando(false);
        }
    }

    return (
        <Shell>
            <p className="gold text-xs tracking-[.25em]">
                {titulo}
            </p>

            <h1 className="text-4xl mt-2">
                {categoria === 'ATMOS'
                    ? 'Reserve uma experiência'
                    : 'Reserve uma sala'}
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
                    <div className="flex items-center justify-between gap-4 mb-5">
                        <div>
                            <h2 className="text-xl">
                                1. Escolha o espaço
                            </h2>
                            <p className="text-white/40 text-sm mt-1">
                                {espacos.length} ambientes disponíveis
                            </p>
                        </div>

                        <div className="hidden sm:flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => moverCarrossel('anterior')}
                                disabled={!podeVoltar}
                                aria-label="Ver ambientes anteriores"
                                className="w-11 h-11 rounded-xl border border-[#DBB13F]/40 text-[#DBB13F] hover:bg-[#DBB13F] hover:text-black transition disabled:opacity-25 disabled:cursor-not-allowed"
                            >
                                ←
                            </button>

                            <button
                                type="button"
                                onClick={() => moverCarrossel('proximo')}
                                disabled={!podeAvancar}
                                aria-label="Ver próximos ambientes"
                                className="w-11 h-11 rounded-xl border border-[#DBB13F]/40 text-[#DBB13F] hover:bg-[#DBB13F] hover:text-black transition disabled:opacity-25 disabled:cursor-not-allowed"
                            >
                                →
                            </button>
                        </div>
                    </div>

                    {espacos.length > 1 && (
                        <div className="sm:hidden flex items-center gap-2 mb-4 text-[#DBB13F] text-sm">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#DBB13F]/30">
                                ⇆
                            </span>
                            <span>Deslize para ver mais ambientes →</span>
                        </div>
                    )}

                    <div
                        ref={carrosselRef}
                        onPointerDown={iniciarArrasto}
                        onPointerMove={duranteArrasto}
                        onPointerUp={terminarArrasto}
                        onPointerCancel={terminarArrasto}
                        onPointerLeave={terminarArrasto}
                        onScroll={atualizarCarrossel}
                        className={`
              flex gap-4 overflow-x-auto
              snap-x snap-mandatory select-none pb-3
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
              ${arrastando
                                ? 'cursor-grabbing snap-none'
                                : 'cursor-grab'}
            `}
                    >
                        {espacos.map(item => (
                            <button
                                key={item.id}
                                data-card-atmos
                                type="button"
                                draggable={false}
                                onClick={() => selecionarEspaco(item)}
                                className={`
                  shrink-0 snap-start text-left
                  w-[85%]
                  sm:w-[calc((100%-1rem)/2)]
                  lg:w-[calc((100%-2rem)/3)]
                  bg-[#111111] rounded-2xl
                  border p-5 transition-colors
                  ${espacoId === item.id
                                        ? 'border-[#DBB13F]'
                                        : 'border-white/10 hover:border-white/30'}
                `}
                            >
                                <div className="h-24 rounded-xl bg-[radial-gradient(circle_at_70%_30%,rgba(54,31,91,.7),transparent_65%)] border border-white/5" />

                                <p className="gold text-xs mt-5">
                                    {titulo}
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

                                {categoria === 'ATMOS' &&
                                    item.name.normalize('NFD')
                                        .replace(/[\u0300-\u036f]/g, '')
                                        .trim().toUpperCase() === 'BALCAO' && (
                                        <p className="text-white/35 text-xs mt-2">
                                            Até 3 reservas simultâneas
                                        </p>
                                    )}

                                <p className="gold text-sm mt-5">
                                    {espacoId === item.id
                                        ? '✓ SELECIONADO'
                                        : 'SELECIONAR →'}
                                </p>
                            </button>
                        ))}
                    </div>

                    {espacos.length > 1 && (
                        <div className="mt-4 mb-10">
                            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full bg-[#DBB13F] rounded-full transition-[width] duration-150"
                                    style={{
                                        width: `${Math.max(8, progresso)}%`,
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
                                Nenhum ambiente disponível para reserva.
                            </p>
                        </Card>
                    )}

                    {espaco && (
                        <div className="grid lg:grid-cols-2 gap-6 mt-6">
                            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6">
                                <h2 className="text-xl mb-6">
                                    2. Escolha a data
                                </h2>

                                <div className="flex items-center justify-between mb-6">
                                    <button
                                        type="button"
                                        onClick={() => mudarMes(-1)}
                                        disabled={
                                            dataISO(ano, mes - 1, 1) <=
                                            hojeSP().slice(0, 7) + '-01'
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
                                        onClick={() => mudarMes(1)}
                                        className="text-[#DBB13F] px-3 py-2"
                                    >
                                        →
                                    </button>
                                </div>

                                <div className="grid grid-cols-7 gap-2">
                                    {DIAS.map((dia, index) => (
                                        <div
                                            key={index}
                                            className="text-center text-white/35 text-xs py-2"
                                        >
                                            {dia}
                                        </div>
                                    ))}

                                    {Array.from({
                                        length: primeiroDia,
                                    }).map((_, index) => (
                                        <div key={`vazio-${index}`} />
                                    ))}

                                    {Array.from({
                                        length: diasNoMes,
                                    }).map((_, index) => {
                                        const dia = index + 1;
                                        const valor = dataISO(
                                            ano, mes - 1, dia
                                        );

                                        const diaSemana = new Date(
                                            Date.UTC(ano, mes - 1, dia)
                                        ).getUTCDay();

                                        const bloqueado =
                                            diaSemana === 0 ||
                                            valor < hojeSP();

                                        return (
                                            <button
                                                key={valor}
                                                type="button"
                                                disabled={bloqueado}
                                                onClick={() => {
                                                    setData(valor);
                                                    setSucesso('');
                                                }}
                                                className={`
                          aspect-square rounded-xl text-sm transition
                          ${data === valor
                                                        ? 'bg-[#DBB13F] text-black font-semibold'
                                                        : bloqueado
                                                            ? 'text-white/15 cursor-not-allowed'
                                                            : 'bg-white/5 hover:bg-white/15'}
                        `}
                                            >
                                                {dia}
                                            </button>
                                        );
                                    })}
                                </div>

                                <p className="text-white/35 text-xs mt-5">
                                    Domingos e datas passadas estão bloqueados.
                                </p>
                            </div>

                            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6">
                                <h2 className="text-xl mb-6">
                                    3. Personalize a reserva
                                </h2>

                                <p className="text-white/45 text-sm mb-5">
                                    {espaco.name} · até {maxPessoas} pessoas
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
                                            onChange={e => {
                                                setInicio(e.target.value);
                                                setSucesso('');
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
                                            onChange={e => {
                                                setFim(e.target.value);
                                                setSucesso('');
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
                                        max={maxPessoas}
                                        value={pessoas}
                                        onChange={e =>
                                            setPessoas(Number(e.target.value))
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
                                        onChange={e =>
                                            setObservacoes(e.target.value)
                                        }
                                        placeholder="Informações sobre sua experiência"
                                        className="mt-2 w-full bg-[#080808] border border-white/15 rounded-xl p-3 text-white resize-none"
                                    />
                                </label>

                                <div className="mt-6 pt-5 border-t border-white/10">
                                    <p className="text-white/45 text-xs mb-3">
                                        Agenda nesta data
                                    </p>

                                    {consultando ? (
                                        <p className="text-white/40 text-sm">
                                            Consultando agenda...
                                        </p>
                                    ) : !agenda ? (
                                        <p className="text-white/40 text-sm">
                                            Aguardando consulta.
                                        </p>
                                    ) : agenda.intervalosOcupados.length === 0 ? (
                                        <p className="text-green-400 text-sm">
                                            Nenhuma reserva registrada.
                                        </p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {agenda.intervalosOcupados.map(
                                                (intervalo, index) => (
                                                    <span
                                                        key={index}
                                                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white/65 text-xs"
                                                    >
                                                        {intervalo.ambiente} ·{' '}
                                                        {horarioLocal(intervalo.inicio)}
                                                        {' – '}
                                                        {horarioLocal(intervalo.fim)}
                                                        {intervalo.tipo === 'BLOQUEIO'
                                                            ? ' · Bloqueado'
                                                            : ''}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>

                                {!consultando && !sucesso && (
                                    <p className={`mt-5 text-sm ${disponivel
                                        ? 'text-green-400'
                                        : 'text-amber-400'
                                        }`}>
                                        {domingo
                                            ? 'Domingos não estão disponíveis.'
                                            : foraDoHorario
                                                ? 'Escolha um período entre 09h00 e 21h00.'
                                                : passado
                                                    ? 'Escolha um horário futuro.'
                                                    : pessoasInvalidas
                                                        ? 'Quantidade de pessoas inválida.'
                                                        : agenda?.motivo ||
                                                        'Verifique os dados da reserva.'}
                                    </p>
                                )}

                                {categoria === 'ATMOS' &&
                                    agenda?.disponivel &&
                                    !consultando &&
                                    !sucesso && (
                                        <p className="text-white/40 text-xs mt-2">
                                            Reservas simultâneas restantes:{' '}
                                            {agenda.vagasRestantes}
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
