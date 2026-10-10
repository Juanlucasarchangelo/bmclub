
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    CalendarDays,
    Clock3,
    MapPin,
    Sparkles,
    TicketCheck,
    Users,
    Wine,
} from 'lucide-react';

import { Shell } from '@/components/Shell';

const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Evento = {
    id: string;
    title: string;
    description?: string | null;
    coverUrl?: string | null;
    location?: string | null;
    startsAt: string;
    endsAt: string;
    capacity: number;
    status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'FINISHED';
    seatsUsed?: number;
    seatsAvailable?: number;
    createdAt?: string;
};

function formatarData(data: string) {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date(data));
}

function formatarHora(data: string) {
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(data));
}

function obterLista<T>(dados: unknown, chave: string): T[] {
    if (Array.isArray(dados)) {
        return dados as T[];
    }

    if (dados && typeof dados === 'object') {
        const objeto = dados as Record<string, unknown>;

        if (Array.isArray(objeto[chave])) {
            return objeto[chave] as T[];
        }
    }

    return [];
}

export default function Home() {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erroEventos, setErroEventos] = useState('');

    const carregar = useCallback(async () => {
        setCarregando(true);
        setErroEventos('');

        try {
            const resposta = await fetch(`${API_URL}/eventos`, {
                cache: 'no-store',
            });

            if (!resposta.ok) {
                throw new Error(
                    'Não foi possível carregar os eventos.'
                );
            }

            const dados = await resposta.json();

            const lista = obterLista<Evento>(
                dados,
                'eventos'
            );

            setEventos(
                lista.filter(
                    (evento) => evento.status === 'PUBLISHED'
                )
            );
        } catch (error) {
            setEventos([]);

            setErroEventos(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível carregar os eventos.'
            );
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        void carregar();
    }, [carregar]);


    // ======================================================
    // PRÓXIMO EVENTO EM DESTAQUE
    // ======================================================
    //
    // Exibe o evento publicado com a data de início
    // mais próxima do momento atual.
    //
    // Eventos que já começaram não aparecem.
    // A data de cadastro não interfere na seleção.
    // ======================================================

    const destaque = useMemo(() => {
        const agora = Date.now();

        return eventos
            .filter((evento) => {
                if (evento.status !== 'PUBLISHED') {
                    return false;
                }

                const inicio = new Date(
                    evento.startsAt
                ).getTime();

                return (
                    Number.isFinite(inicio) &&
                    inicio > agora
                );
            })
            .sort((a, b) => {
                return (
                    new Date(a.startsAt).getTime() -
                    new Date(b.startsAt).getTime()
                );
            })[0];
    }, [eventos]);

    const acessos = [
        {
            href: '/eventos',
            titulo: 'Explorar eventos',
            descricao: 'Encontros e experiências exclusivas',
            Icon: CalendarDays,
        },
        {
            href: '/reservas',
            titulo: 'Minhas reservas',
            descricao: 'Acompanhe sua programação',
            Icon: TicketCheck,
        },
        {
            href: '/atmos',
            titulo: 'ATMOS Club',
            descricao: 'Reserve seu espaço',
            Icon: Wine,
        },
    ];

    return (
        <Shell>
            {/* BOAS-VINDAS */}
            <header className="mb-8">
                <div className="mb-3 flex items-center gap-2">
                    <Sparkles
                        size={15}
                        className="text-[#DBB13F]"
                    />

                    <p className="text-xs uppercase tracking-[.28em] text-[#DBB13F]">
                        BMClub Brasil
                    </p>
                </div>

                <h1 className="mt-2 text-3xl font-light md:text-5xl">
                    Bem-vindo ao seu clube.
                </h1>

                <p className="mt-3 text-white/45">
                    Experiências exclusivas, conexões e momentos memoráveis.
                </p>
            </header>

            {carregando ? (
                <div className="rounded-3xl border border-white/10 bg-[#111111] p-8 text-white/50">
                    Carregando experiências do BMClub...
                </div>
            ) : (
                <>
                    {/* EVENTO EM DESTAQUE */}
                    <section className="mb-9 overflow-hidden rounded-3xl border border-[#DBB13F]/20 bg-[#111111]">
                        {destaque ? (
                            <div className="grid lg:grid-cols-2">
                                <div className="relative min-h-[260px] overflow-hidden bg-[#17130B] lg:min-h-[390px]">
                                    {destaque.coverUrl ? (
                                        <img
                                            src={destaque.coverUrl}
                                            alt={destaque.title}
                                            className="absolute inset-0 h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_35%,rgba(219,177,63,.30),transparent_50%),linear-gradient(135deg,#20180b,#080808)]" />
                                    )}

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                                    <div className="absolute bottom-5 left-5 rounded-full border border-[#DBB13F]/40 bg-black/60 px-4 py-2 text-xs tracking-[.15em] text-[#D8BC7A] backdrop-blur">
                                        EXPERIÊNCIA EM DESTAQUE
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center p-6 md:p-10">
                                    <p className="text-xs uppercase tracking-[.25em] text-[#DBB13F]">
                                        Último evento publicado
                                    </p>

                                    <h2 className="mt-4 text-3xl font-light leading-tight md:text-4xl">
                                        {destaque.title}
                                    </h2>

                                    <p className="mt-4 line-clamp-4 text-sm leading-7 text-white/55">
                                        {destaque.description ||
                                            'Uma nova experiência exclusiva espera por você no BMClub Brasil.'}
                                    </p>

                                    <div className="mt-6 space-y-3 text-sm text-white/70">
                                        <div className="flex items-center gap-3">
                                            <CalendarDays
                                                size={17}
                                                className="text-[#DBB13F]"
                                            />

                                            <span>
                                                {formatarData(
                                                    destaque.startsAt
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Clock3
                                                size={17}
                                                className="text-[#DBB13F]"
                                            />

                                            <span>
                                                {formatarHora(
                                                    destaque.startsAt
                                                )}
                                            </span>
                                        </div>

                                        {destaque.location && (
                                            <div className="flex items-center gap-3">
                                                <MapPin
                                                    size={17}
                                                    className="text-[#DBB13F]"
                                                />

                                                <span>
                                                    {destaque.location}
                                                </span>
                                            </div>
                                        )}

                                        {typeof destaque.seatsAvailable ===
                                            'number' && (
                                                <div className="flex items-center gap-3">
                                                    <Users
                                                        size={17}
                                                        className="text-[#DBB13F]"
                                                    />

                                                    <span>
                                                        {destaque.seatsAvailable}{' '}
                                                        vagas disponíveis
                                                    </span>
                                                </div>
                                            )}
                                    </div>

                                    <Link
                                        href={`/eventos/disponibilidade/${destaque.id}`}
                                        className="mt-8 inline-flex w-fit items-center gap-3 rounded-xl bg-[#DBB13F] px-6 py-4 text-sm font-semibold text-black transition hover:bg-[#D8BC7A]"
                                    >
                                        Ver evento e confirmar presença

                                        <ArrowRight size={18} />
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="relative flex min-h-[290px] flex-col justify-center overflow-hidden p-7 md:p-12">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_25%,rgba(219,177,63,.15),transparent_45%)]" />

                                <div className="relative">
                                    <p className="text-xs tracking-[.25em] text-[#DBB13F]">
                                        EXPERIÊNCIAS BMCLUB
                                    </p>

                                    <h2 className="mt-4 max-w-xl text-3xl font-light md:text-4xl">
                                        Seu próximo encontro começa aqui.
                                    </h2>

                                    <p className="mt-4 max-w-lg text-white/50">
                                        {erroEventos ||
                                            'Em breve, novas experiências estarão disponíveis para os membros do clube.'}
                                    </p>

                                    <Link
                                        href="/eventos"
                                        className="mt-6 inline-flex items-center gap-2 text-sm text-[#DBB13F]"
                                    >
                                        Explorar eventos

                                        <ArrowRight size={16} />
                                    </Link>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ACESSOS RÁPIDOS */}
                    <section className="mb-9">
                        <div className="mb-5">
                            <p className="text-xs uppercase tracking-[.25em] text-[#DBB13F]">
                                SEU CLUBE
                            </p>

                            <h2 className="mt-2 text-2xl font-light">
                                O que deseja fazer hoje?
                            </h2>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {acessos.map(
                                ({ href, titulo, descricao, Icon }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className="group rounded-2xl border border-white/10 bg-[#111111] p-6 transition hover:border-[#DBB13F]/50 hover:bg-[#161616]"
                                    >
                                        <div className="flex items-start justify-between">
                                            <Icon
                                                size={23}
                                                className="text-[#DBB13F]"
                                            />

                                            <ArrowRight
                                                size={17}
                                                className="text-white/25 transition group-hover:translate-x-1 group-hover:text-[#DBB13F]"
                                            />
                                        </div>

                                        <h3 className="mt-8 text-lg">
                                            {titulo}
                                        </h3>

                                        <p className="mt-2 text-sm text-white/45">
                                            {descricao}
                                        </p>
                                    </Link>
                                )
                            )}
                        </div>
                    </section>

                    {/* ASSINATURA BMCLUB */}
                    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#111111] p-7 md:p-10">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_35%,rgba(54,31,91,.40),transparent_50%),radial-gradient(circle_at_15%_90%,rgba(219,177,63,.10),transparent_50%)]" />

                        <div className="relative">
                            <p className="text-xs tracking-[.25em] text-[#DBB13F]">
                                BMCLUB BRASIL
                            </p>

                            <h2 className="mt-4 max-w-2xl text-2xl font-light md:text-3xl">
                                Tecnologia, arquitetura e hospitalidade em
                                experiências únicas.
                            </h2>

                            <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">
                                Um ambiente pensado para encontros, conexões
                                e momentos especiais.
                            </p>
                        </div>
                    </section>
                </>
            )}
        </Shell>
    );
}
