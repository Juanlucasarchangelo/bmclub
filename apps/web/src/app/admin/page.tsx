
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { Shell } from '@/components/Shell';
import { Card } from '@/components/Card';

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000';

type Role = 'ADMIN' | 'COMPANY' | 'MEMBER';

type Usuario = {
    id: string;
    name: string;
    email: string;
    role: Role;
    active: boolean;
    company?: {
        id: string;
        name: string;
    } | null;
    createdAt: string;
};

type Estatisticas = {
    membros: number;
    empresas: number;
    administradores: number;
    bloqueados: number;
};

function nomePerfil(role: Role) {
    const nomes = {
        ADMIN: 'Administrador',
        COMPANY: 'Empresa',
        MEMBER: 'Membro',
    };

    return nomes[role];
}

export default function Admin() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    const [autorizado, setAutorizado] = useState(false);
    const [busca, setBusca] = useState('');
    const [filtro, setFiltro] = useState('TODOS');

    const carregar = useCallback(async () => {
        setCarregando(true);
        setErro('');

        try {
            const token = localStorage.getItem('bmclub_access');

            if (!token) {
                throw new Error('LOGIN');
            }

            // A API é responsável por confirmar o perfil ADMIN.
            const resposta = await fetch(
                `${API_URL}/admin/usuarios`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    cache: 'no-store',
                }
            );

            if (resposta.status === 401) {
                throw new Error('LOGIN');
            }

            if (resposta.status === 403) {
                throw new Error('ACESSO_NEGADO');
            }

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.message || 'Erro ao carregar usuários.'
                );
            }

            if (!Array.isArray(dados)) {
                throw new Error('Resposta inválida do servidor.');
            }

            setUsuarios(dados);
            setAutorizado(true);
        } catch (error) {
            setAutorizado(false);

            const mensagem =
                error instanceof Error ? error.message : '';

            if (mensagem === 'LOGIN') {
                setErro('Faça login para acessar o painel.');
            } else if (mensagem === 'ACESSO_NEGADO') {
                setErro(
                    'Acesso restrito aos administradores do BMClub.'
                );
            } else {
                setErro(mensagem || 'Não foi possível carregar o painel.');
            }
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        carregar();
    }, [carregar]);

    const estatisticas: Estatisticas = {
        membros: usuarios.filter((u) => u.role === 'MEMBER').length,
        empresas: usuarios.filter((u) => u.role === 'COMPANY').length,
        administradores: usuarios.filter((u) => u.role === 'ADMIN').length,
        bloqueados: usuarios.filter((u) => !u.active).length,
    };

    const filtrados = usuarios.filter((usuario) => {
        const texto = busca.toLowerCase().trim();

        const correspondeBusca =
            usuario.name.toLowerCase().includes(texto) ||
            usuario.email.toLowerCase().includes(texto) ||
            (usuario.company?.name || '').toLowerCase().includes(texto);

        const correspondeFiltro =
            filtro === 'TODOS' ||
            (filtro === 'BLOQUEADOS'
                ? !usuario.active
                : usuario.role === filtro);

        return correspondeBusca && correspondeFiltro;
    });

    return (
        <Shell>
            <p className="gold text-xs tracking-[.25em]">
                ADMINISTRAÇÃO
            </p>

            <h1 className="text-4xl mt-2">
                Painel BMClub
            </h1>

            <p className="text-white/45 mt-3 mb-8">
                Gestão de membros, empresas, eventos,
                espaços e salas.
            </p>

            {carregando && (
                <Card>
                    <p className="text-white/50">
                        Carregando painel administrativo...
                    </p>
                </Card>
            )}

            {!carregando && erro && (
                <Card>
                    <h2 className="text-xl">
                        Acesso ao painel
                    </h2>

                    <p className="text-white/50 mt-3">
                        {erro}
                    </p>

                    <div className="flex flex-wrap gap-4 mt-6">
                        <Link
                            href={
                                erro.includes('login')
                                    ? '/login'
                                    : '/reservas'
                            }
                            className="text-[#DBB13F]"
                        >
                            {erro.includes('login')
                                ? 'FAZER LOGIN'
                                : 'VOLTAR ÀS RESERVAS'}
                        </Link>

                        {!erro.includes('restrito') && (
                            <button
                                onClick={carregar}
                                className="text-white/70"
                            >
                                TENTAR NOVAMENTE
                            </button>
                        )}
                    </div>
                </Card>
            )}

            {!carregando && autorizado && (
                <>
                    {/* INDICADORES */}

                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                        {[
                            {
                                label: 'Membros',
                                valor: estatisticas.membros,
                            },
                            {
                                label: 'Empresas',
                                valor: estatisticas.empresas,
                            },
                            {
                                label: 'Administradores',
                                valor: estatisticas.administradores,
                            },
                            {
                                label: 'Bloqueados',
                                valor: estatisticas.bloqueados,
                            },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="bg-[#111111] border border-white/10 rounded-2xl p-5"
                            >
                                <p className="text-white/45 text-sm">
                                    {item.label}
                                </p>

                                <p className="text-4xl gold mt-4">
                                    {item.valor}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* GESTÃO */}

                    <h2 className="text-xl mb-4">
                        Gestão do BMClub
                    </h2>

                    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
                        {[
                            {
                                titulo: 'Eventos',
                                descricao:
                                    'Cadastre e acompanhe eventos.',
                                href: '/eventos',
                            },
                            {
                                titulo: 'Espaços Atmos',
                                descricao:
                                    'Consulte os espaços do Atmos Club.',
                                href: '/atmos',
                            },
                            {
                                titulo: 'Reservas',
                                descricao:
                                    'Acompanhe reservas e confirmações.',
                                href: '/reservas',
                            },
                        ].map((item) => (
                            <Link
                                key={item.titulo}
                                href={item.href}
                                className="block bg-[#111111] border border-white/10 hover:border-[#DBB13F]/50 rounded-2xl p-6 transition"
                            >
                                <p className="text-xs gold tracking-[.2em]">
                                    GESTÃO
                                </p>

                                <h3 className="text-xl mt-3">
                                    {item.titulo}
                                </h3>

                                <p className="text-white/45 text-sm mt-2">
                                    {item.descricao}
                                </p>

                                <p className="gold text-sm mt-5">
                                    ACESSAR →
                                </p>
                            </Link>
                        ))}
                    </div>

                    {/* USUÁRIOS */}

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                        <div>
                            <h2 className="text-2xl">
                                Gestão de usuários
                            </h2>

                            <p className="text-white/45 text-sm mt-2">
                                {usuarios.length} usuários cadastrados
                            </p>
                        </div>

                        <span className="text-[#DBB13F] text-sm border border-[#DBB13F]/30 rounded-xl px-5 py-3">
                            Cadastro de usuários: próxima etapa
                        </span>
                    </div>

                    {/* BUSCA E FILTROS */}

                    <div className="bg-[#111111] border border-white/10 rounded-2xl p-5 mb-5">
                        <input
                            type="search"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            placeholder="Buscar por nome, e-mail ou empresa..."
                            className="w-full bg-[#080808] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#DBB13F]"
                        />

                        <div className="flex flex-wrap gap-2 mt-4">
                            {[
                                ['TODOS', 'Todos'],
                                ['MEMBER', 'Membros'],
                                ['COMPANY', 'Empresas'],
                                ['ADMIN', 'Administradores'],
                                ['BLOQUEADOS', 'Bloqueados'],
                            ].map(([valor, label]) => (
                                <button
                                    key={valor}
                                    onClick={() => setFiltro(valor)}
                                    className={`px-4 py-2 rounded-lg text-sm border transition ${filtro === valor
                                            ? 'bg-[#DBB13F] text-black border-[#DBB13F]'
                                            : 'border-white/10 text-white/60 hover:border-[#DBB13F]/50'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* LISTA */}

                    <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden">
                        {filtrados.length === 0 ? (
                            <div className="p-8 text-white/45">
                                Nenhum usuário encontrado.
                            </div>
                        ) : (
                            <div className="divide-y divide-white/10">
                                {filtrados.map((usuario) => (
                                    <div
                                        key={usuario.id}
                                        className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                                    >
                                        <div className="min-w-0">
                                            <h3 className="font-medium">
                                                {usuario.name}
                                            </h3>

                                            <p className="text-white/45 text-sm mt-1 break-all">
                                                {usuario.email}
                                            </p>

                                            {usuario.company && (
                                                <p className="text-white/35 text-xs mt-2">
                                                    Empresa: {usuario.company.name}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-[#DBB13F] text-xs border border-[#DBB13F]/20 rounded-lg px-3 py-2">
                                                {nomePerfil(usuario.role)}
                                            </span>

                                            <span
                                                className={`text-xs rounded-lg px-3 py-2 ${usuario.active
                                                        ? 'text-green-400 bg-green-500/10'
                                                        : 'text-red-400 bg-red-500/10'
                                                    }`}
                                            >
                                                {usuario.active
                                                    ? 'ATIVO'
                                                    : 'BLOQUEADO'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <p className="text-white/35 text-xs mt-5">
                        O bloqueio, liberação, cadastro e exclusão
                        serão disponibilizados após a implementação
                        das respectivas permissões na API.
                    </p>
                </>
            )}
        </Shell>
    );
}
