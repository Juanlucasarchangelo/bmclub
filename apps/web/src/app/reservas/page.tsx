
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Shell } from '@/components/Shell';
import { Card } from '@/components/Card';

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000';

type Perfil = 'ADMIN' | 'COMPANY' | 'MEMBER';
type Tipo = 'EVENTO' | 'ESPACO';

type Reserva = {
    id: string;
    tipo: Tipo;
    titulo: string;
    descricao: string | null;
    local: string | null;
    startsAt: string;
    endsAt: string;
    status: string;
    quantidade: number;
    notes: string | null;
    referenciaId: string;
    usuario: {
        id: string;
        name: string;
        email: string;
        company?: {
            name: string;
        } | null;
    };
};

type Resposta = {
    total: number;
    totalEspacos: number;
    totalEventos: number;
    reservas: Reserva[];
};

type Usuario = {
    id: string;
    name: string;
    role: Perfil;
};

function dataBR(data: string) {
    return new Date(data).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

function horaBR(data: string) {
    return new Date(data).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function statusBR(status: string) {
    const nomes: Record<string, string> = {
        CONFIRMED: 'CONFIRMADA',
        PENDING: 'PENDENTE',
        CANCELLED: 'CANCELADA',
        WAITLIST: 'LISTA DE ESPERA',
    };

    return nomes[status] || status;
}

export default function Reservas() {
    const [usuario, setUsuario] =
        useState<Usuario | null>(null);

    const [reservas, setReservas] =
        useState<Reserva[]>([]);

    const [filtro, setFiltro] =
        useState<'TODAS' | Tipo>('TODAS');

    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    useEffect(() => {
        carregarReservas();
    }, []);

    async function carregarReservas() {
        setLoading(true);
        setErro('');

        try {
            const token =
                localStorage.getItem('bmclub_access');

            if (!token) {
                throw new Error(
                    'Você precisa fazer login para consultar suas reservas.'
                );
            }

            const response = await fetch(
                `${API_URL}/reservations/todas`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    cache: 'no-store',
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    'Não foi possível carregar as reservas.'
                );
            }

            const resultado = data as Resposta;
            setReservas(resultado.reservas);

            const salvo = localStorage.getItem('bmclub_user');

            if (salvo) {
                try {
                    setUsuario(JSON.parse(salvo));
                } catch {
                    setUsuario(null);
                }
            }
        } catch (error) {
            setErro(
                error instanceof Error
                    ? error.message
                    : 'Erro ao carregar reservas.'
            );
        } finally {
            setLoading(false);
        }
    }

    const totalEventos = reservas.filter(
        (r) => r.tipo === 'EVENTO'
    ).length;

    const totalEspacos = reservas.filter(
        (r) => r.tipo === 'ESPACO'
    ).length;

    const filtradas = reservas.filter(
        (r) => filtro === 'TODAS' || r.tipo === filtro
    );

    const titulo =
        usuario?.role === 'ADMIN'
            ? 'Todas as reservas'
            : usuario?.role === 'COMPANY'
                ? 'Reservas da empresa'
                : 'Minhas reservas';

    return (
        <Shell>
            <p className="gold text-xs tracking-[.25em]">
                BMCLUB BRASIL
            </p>

            <h1 className="text-4xl mt-2 mb-3">
                {titulo}
            </h1>

            <p className="text-white/45 mb-8">
                Acompanhe suas reservas de espaços e
                confirmações de presença em eventos.
            </p>

            {loading && (
                <Card>
                    <p className="text-white/50">
                        Carregando reservas...
                    </p>
                </Card>
            )}

            {!loading && erro && (
                <Card>
                    <p className="text-red-400">{erro}</p>

                    <div className="mt-5">
                        {erro.includes('login') ? (
                            <Link
                                href="/login"
                                className="text-[#DBB13F]"
                            >
                                FAZER LOGIN
                            </Link>
                        ) : (
                            <button
                                onClick={carregarReservas}
                                className="text-[#DBB13F]"
                            >
                                TENTAR NOVAMENTE
                            </button>
                        )}
                    </div>
                </Card>
            )}

            {!loading && !erro && (
                <>
                    {/* RESUMO */}

                    <div className="grid grid-cols-3 gap-3 mb-8">
                        {[
                            {
                                label: 'Total',
                                valor: reservas.length,
                            },
                            {
                                label: 'Eventos',
                                valor: totalEventos,
                            },
                            {
                                label: 'Espaços',
                                valor: totalEspacos,
                            },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="bg-[#111111] border border-white/10 rounded-2xl p-5"
                            >
                                <p className="text-white/45 text-sm">
                                    {item.label}
                                </p>

                                <p className="text-3xl text-[#DBB13F] mt-2">
                                    {item.valor}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* FILTROS */}

                    <div className="flex flex-wrap gap-3 mb-7">
                        {[
                            { id: 'TODAS', label: 'Todas' },
                            { id: 'EVENTO', label: 'Eventos' },
                            { id: 'ESPACO', label: 'Espaços' },
                        ].map((opcao) => (
                            <button
                                key={opcao.id}
                                onClick={() =>
                                    setFiltro(opcao.id as typeof filtro)
                                }
                                className={`px-5 py-3 rounded-xl border text-sm transition ${filtro === opcao.id
                                        ? 'bg-[#DBB13F] text-black border-[#DBB13F]'
                                        : 'bg-[#111111] text-white/60 border-white/10 hover:border-[#DBB13F]'
                                    }`}
                            >
                                {opcao.label}
                            </button>
                        ))}
                    </div>

                    {/* LISTAGEM */}

                    {filtradas.length === 0 ? (
                        <Card>
                            <h2 className="text-xl">
                                Nenhuma reserva encontrada
                            </h2>

                            <p className="text-white/45 mt-2">
                                Não existem reservas para o filtro selecionado.
                            </p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {filtradas.map((reserva) => (
                                <div
                                    key={`${reserva.tipo}-${reserva.id}`}
                                    className="bg-[#111111] border border-white/10 rounded-2xl p-6"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[#DBB13F] text-xs tracking-[.2em]">
                                                {reserva.tipo === 'EVENTO'
                                                    ? 'EVENTO BMCLUB'
                                                    : 'RESERVA DE ESPAÇO'}
                                            </p>

                                            <h2 className="text-2xl mt-3">
                                                {reserva.titulo}
                                            </h2>

                                            {reserva.descricao && (
                                                <p className="text-white/45 text-sm mt-2">
                                                    {reserva.descricao}
                                                </p>
                                            )}
                                        </div>

                                        <span className="text-[#DBB13F] text-xs border border-[#DBB13F]/40 rounded-full px-4 py-2">
                                            {statusBR(reserva.status)}
                                        </span>
                                    </div>

                                    <div className="grid md:grid-cols-3 gap-5 mt-6 pt-6 border-t border-white/10">
                                        <div>
                                            <p className="text-white/35 text-xs">
                                                Data
                                            </p>
                                            <p className="mt-2 capitalize">
                                                {dataBR(reserva.startsAt)}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-white/35 text-xs">
                                                Horário
                                            </p>
                                            <p className="mt-2">
                                                {horaBR(reserva.startsAt)}
                                                {' às '}
                                                {horaBR(reserva.endsAt)}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-white/35 text-xs">
                                                {reserva.tipo === 'EVENTO'
                                                    ? 'Vagas confirmadas'
                                                    : 'Convidados'}
                                            </p>

                                            <p className="mt-2">
                                                {reserva.quantidade}
                                            </p>
                                        </div>
                                    </div>

                                    {reserva.local && (
                                        <p className="text-white/50 text-sm mt-5">
                                            Local: {reserva.local}
                                        </p>
                                    )}

                                    {(usuario?.role === 'ADMIN' ||
                                        usuario?.role === 'COMPANY') && (
                                            <div className="mt-5 pt-5 border-t border-white/10">
                                                <p className="text-white/35 text-xs">
                                                    Responsável
                                                </p>

                                                <p className="mt-2">
                                                    {reserva.usuario.name}
                                                </p>

                                                <p className="text-white/45 text-sm">
                                                    {reserva.usuario.email}
                                                </p>

                                                {usuario?.role === 'ADMIN' &&
                                                    reserva.usuario.company && (
                                                        <p className="text-[#DBB13F] text-sm mt-2">
                                                            Empresa: {reserva.usuario.company.name}
                                                        </p>
                                                    )}
                                            </div>
                                        )}

                                    {reserva.notes && (
                                        <p className="text-white/45 text-sm mt-5">
                                            Observações: {reserva.notes}
                                        </p>
                                    )}

                                    {reserva.tipo === 'EVENTO' && (
                                        <Link
                                            href={`/eventos/disponibilidade/${reserva.referenciaId}`}
                                            className="inline-block mt-6 text-[#DBB13F] text-sm hover:underline"
                                        >
                                            VER EVENTO →
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </Shell>
    );
}
