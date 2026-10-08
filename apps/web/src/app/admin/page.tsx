'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { Card } from '@/components/Card';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
type Role = 'ADMIN' | 'COMPANY' | 'MEMBER';
type Usuario = { id: string; name: string; email: string; role: Role; active: boolean; companyId?: string | null; company?: { id: string; name: string } | null; createdAt: string };
type Empresa = { id: string; name: string };
type Modal = 'usuario' | 'empresa' | 'editar' | null;
type Filtro = 'TODOS' | Role | 'BLOQUEADOS';

const campo = 'w-full rounded-xl border border-white/15 bg-[#080808] px-4 py-3 text-white outline-none focus:border-[#DBB13F]';
const botao = 'rounded-xl border border-[#DBB13F] bg-[#DBB13F] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#D8BC7A] disabled:cursor-not-allowed disabled:opacity-50';
const secundario = 'rounded-xl border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-[#DBB13F]/70';
const roleNome: Record<Role, string> = { ADMIN: 'Administrador', COMPANY: 'Empresa', MEMBER: 'Membro' };

export default function Admin() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState('');
    const [aviso, setAviso] = useState('');
    const [autorizado, setAutorizado] = useState(false);
    const [busca, setBusca] = useState('');
    const [filtro, setFiltro] = useState<Filtro>('TODOS');
    const [modal, setModal] = useState<Modal>(null);
    const [selecionado, setSelecionado] = useState<Usuario | null>(null);
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [perfil, setPerfil] = useState<'MEMBER' | 'COMPANY'>('MEMBER');
    const [empresaId, setEmpresaId] = useState('');
    const [empresaNome, setEmpresaNome] = useState('');
    const [empresaDocumento, setEmpresaDocumento] = useState('');

    const api = useCallback(async (path: string, options: RequestInit = {}) => {
        const token = localStorage.getItem('bmclub_access');
        if (!token) throw new Error('LOGIN');
        const response = await fetch(`${API_URL}${path}`, {
            ...options,
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
        });
        const data: unknown = await response.json().catch(() => null);
        if (response.status === 401) throw new Error('LOGIN');
        if (response.status === 403) throw new Error('ACESSO_NEGADO');
        if (!response.ok) {
            const message = data && typeof data === 'object' && 'message' in data ? String(data.message) : 'Não foi possível concluir a operação.';
            throw new Error(message);
        }
        return data;
    }, []);

    const carregar = useCallback(async () => {
        setCarregando(true);
        setErro('');
        try {
            const data = await api('/admin/usuarios');
            if (!Array.isArray(data)) throw new Error('Resposta inválida ao carregar usuários.');
            setUsuarios(data as Usuario[]);
            setAutorizado(true);
            try {
                const lista = await api('/admin/empresas');
                if (Array.isArray(lista)) setEmpresas(lista as Empresa[]);
            } catch (e) {
                setAviso(e instanceof Error ? `Empresas: ${e.message}` : 'Não foi possível listar empresas.');
            }
        } catch (e) {
            setAutorizado(false);
            const msg = e instanceof Error ? e.message : '';
            setErro(msg === 'LOGIN' ? 'Faça login para acessar o painel.' : msg === 'ACESSO_NEGADO' ? 'Acesso restrito aos administradores do BMClub.' : msg || 'Não foi possível carregar o painel.');
        } finally {
            setCarregando(false);
        }
    }, [api]);

    useEffect(() => { void carregar(); }, [carregar]);

    const filtrados = useMemo(() => usuarios.filter(u => {
        const q = busca.trim().toLowerCase();
        const match = [u.name, u.email, u.company?.name || ''].some(v => v.toLowerCase().includes(q));
        return match && (filtro === 'TODOS' || (filtro === 'BLOQUEADOS' ? !u.active : u.role === filtro));
    }), [usuarios, busca, filtro]);

    const estatisticas = {
        membros: usuarios.filter(u => u.role === 'MEMBER').length,
        empresas: usuarios.filter(u => u.role === 'COMPANY').length,
        administradores: usuarios.filter(u => u.role === 'ADMIN').length,
        bloqueados: usuarios.filter(u => !u.active).length,
    };

    function abrirNovoUsuario() {
        setSelecionado(null); setNome(''); setEmail(''); setSenha(''); setPerfil('MEMBER'); setEmpresaId(''); setErro(''); setModal('usuario');
    }
    function abrirEdicao(u: Usuario) {
        setSelecionado(u); setNome(u.name); setEmpresaId(u.companyId || u.company?.id || ''); setErro(''); setModal('editar');
    }
    function abrirEmpresa() {
        setEmpresaNome(''); setEmpresaDocumento(''); setErro(''); setModal('empresa');
    }
    function fechar() { if (!salvando) setModal(null); }

    async function executar(acao: () => Promise<unknown>, sucesso: string) {
        setSalvando(true); setErro(''); setAviso('');
        try {
            await acao();
            setModal(null);
            setAviso(sucesso);
            await carregar();
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Erro inesperado.';
            setErro(msg === 'ACESSO_NEGADO' ? 'Acesso negado ou conta bloqueada.' : msg === 'LOGIN' ? 'Sessão expirada. Faça login novamente.' : msg);
        } finally { setSalvando(false); }
    }

    function cadastrarUsuario(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (perfil === 'COMPANY' && !empresaId) { setErro('Selecione a empresa do usuário.'); return; }
        void executar(() => api('/admin/usuarios', { method: 'POST', body: JSON.stringify({ name: nome.trim(), email: email.trim(), password: senha, role: perfil, companyId: perfil === 'COMPANY' ? empresaId : null }) }), 'Usuário cadastrado com sucesso.');
    }
    function cadastrarEmpresa(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        void executar(() => api('/admin/empresas', { method: 'POST', body: JSON.stringify({ name: empresaNome.trim(), document: empresaDocumento.trim() || undefined }) }), 'Empresa cadastrada com sucesso.');
    }
    function editarUsuario(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!selecionado) return;
        if (selecionado.role === 'COMPANY' && !empresaId) { setErro('Selecione a empresa do usuário.'); return; }
        void executar(() => api(`/admin/usuarios/${encodeURIComponent(selecionado.id)}`, { method: 'PATCH', body: JSON.stringify({ name: nome.trim(), ...(selecionado.role === 'COMPANY' ? { companyId: empresaId } : {}) }) }), 'Usuário atualizado com sucesso.');
    }
    function alterarAcesso(u: Usuario) {
        const verbo = u.active ? 'bloquear' : 'liberar';
        if (!window.confirm(`Deseja ${verbo} o acesso de ${u.name}?`)) return;
        void executar(() => api(`/admin/usuarios/${encodeURIComponent(u.id)}/acesso`, { method: 'PATCH', body: JSON.stringify({ active: !u.active }) }), `Acesso de ${u.name} ${u.active ? 'bloqueado' : 'liberado'}.`);
    }
    function excluir(u: Usuario) {
        if (!window.confirm(`Excluir o cadastro de ${u.name}?\n\nA conta será desativada e o histórico de reservas será preservado.`)) return;
        void executar(() => api(`/admin/usuarios/${encodeURIComponent(u.id)}`, { method: 'DELETE' }), `Cadastro de ${u.name} excluído.`);
    }

    return (
        <Shell>
            <p className="gold text-xs tracking-[.25em]">ADMINISTRAÇÃO</p>
            <h1 className="mt-2 text-4xl">Painel BMClub</h1>
            <p className="mb-8 mt-3 text-white/45">Gestão de membros, empresas, eventos, espaços e salas.</p>

            {carregando && !autorizado && <Card><p className="text-white/60">Carregando painel administrativo...</p></Card>}
            {!carregando && !autorizado && <Card><h2 className="text-xl">Acesso ao painel</h2><p className="mt-3 text-white/60">{erro}</p><div className="mt-5 flex gap-5"><Link className="gold" href="/login">FAZER LOGIN</Link><button onClick={() => void carregar()} className="text-white/70">TENTAR NOVAMENTE</button></div></Card>}

            {autorizado && <>
                {aviso && <div role="status" className="mb-5 rounded-xl border border-[#DBB13F]/40 bg-[#DBB13F]/10 p-4 text-[#D8BC7A]">{aviso}</div>}
                {erro && <div role="alert" className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">{erro}</div>}
                <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
                    {([
                        ['Membros', estatisticas.membros], ['Empresas (usuários)', estatisticas.empresas],
                        ['Administradores', estatisticas.administradores], ['Bloqueados', estatisticas.bloqueados],
                    ] as const).map(([label, valor]) => <div key={label} className="rounded-2xl border border-white/10 bg-[#111111] p-5"><p className="text-sm text-white/45">{label}</p><p className="gold mt-4 text-4xl">{valor}</p></div>)}
                </div>

                <h2 className="mb-4 text-xl">Gestão do BMClub</h2>
                <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                        { titulo: 'Eventos', descricao: 'Consulte eventos publicados.', href: '/eventos' },
                        { titulo: 'Espaços Atmos', descricao: 'Consulte os espaços do Atmos Club.', href: '/atmos' },
                        { titulo: 'Reservas', descricao: 'Acompanhe reservas e confirmações.', href: '/reservas' },
                    ].map(item => <Link key={item.titulo} href={item.href} className="block rounded-2xl border border-white/10 bg-[#111111] p-6 transition hover:border-[#DBB13F]/50"><p className="gold text-xs tracking-[.2em]">GESTÃO</p><h3 className="mt-3 text-xl">{item.titulo}</h3><p className="mt-2 text-sm text-white/45">{item.descricao}</p><p className="gold mt-5 text-sm">ACESSAR →</p></Link>)}
                </div>

                <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div><h2 className="text-2xl">Gestão de usuários</h2><p className="mt-2 text-sm text-white/45">{usuarios.length} usuários cadastrados</p></div>
                    <div className="flex flex-wrap gap-3"><button type="button" className={secundario} onClick={abrirEmpresa}>+ Nova empresa</button><button type="button" className={botao} onClick={abrirNovoUsuario}>+ Novo usuário</button></div>
                </div>

                <div className="mb-5 rounded-2xl border border-white/10 bg-[#111111] p-5">
                    <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, e-mail ou empresa..." className={campo} aria-label="Buscar usuários" />
                    <div className="mt-4 flex flex-wrap gap-2">
                        {([['TODOS', 'Todos'], ['MEMBER', 'Membros'], ['COMPANY', 'Empresas'], ['ADMIN', 'Administradores'], ['BLOQUEADOS', 'Bloqueados']] as const).map(([valor, label]) => <button key={valor} type="button" onClick={() => setFiltro(valor)} className={`rounded-lg border px-4 py-2 text-sm transition ${filtro === valor ? 'border-[#DBB13F] bg-[#DBB13F] text-black' : 'border-white/10 text-white/60 hover:border-[#DBB13F]/50'}`}>{label}</button>)}
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">
                    {filtrados.length === 0 ? <p className="p-8 text-white/45">Nenhum usuário encontrado.</p> : <div className="divide-y divide-white/10">
                        {filtrados.map(u => <div key={u.id} className="flex flex-col justify-between gap-4 p-5 xl:flex-row xl:items-center">
                            <div className="min-w-0"><h3 className="font-medium">{u.name}</h3><p className="mt-1 break-all text-sm text-white/45">{u.email}</p>{u.company && <p className="mt-2 text-xs text-white/40">Empresa: {u.company.name}</p>}</div>
                            <div className="flex flex-wrap items-center gap-2"><span className="rounded-lg border border-[#DBB13F]/20 px-3 py-2 text-xs text-[#DBB13F]">{roleNome[u.role]}</span><span className={`rounded-lg px-3 py-2 text-xs ${u.active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{u.active ? 'ATIVO' : 'BLOQUEADO'}</span>
                                <button type="button" disabled={salvando} onClick={() => abrirEdicao(u)} className={secundario}>Editar</button>
                                <button type="button" disabled={salvando} onClick={() => alterarAcesso(u)} className={secundario}>{u.active ? 'Bloquear' : 'Liberar'}</button>
                                <button type="button" disabled={salvando} onClick={() => excluir(u)} className="rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:border-red-400 disabled:opacity-50">Excluir</button>
                            </div>
                        </div>)}
                    </div>}
                </div>
            </>}

            {modal && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) fechar(); }}>
                <div role="dialog" aria-modal="true" aria-label={modal === 'empresa' ? 'Cadastrar empresa' : modal === 'editar' ? 'Editar usuário' : 'Cadastrar usuário'} className="w-full max-w-lg rounded-2xl border border-[#DBB13F]/30 bg-[#111111] p-6 shadow-2xl">
                    <div className="mb-5 flex items-center justify-between"><h2 className="text-2xl">{modal === 'empresa' ? 'Nova empresa' : modal === 'editar' ? 'Editar usuário' : 'Novo usuário'}</h2><button type="button" className="text-2xl text-white/60" onClick={fechar} aria-label="Fechar">×</button></div>
                    <form onSubmit={modal === 'empresa' ? cadastrarEmpresa : modal === 'editar' ? editarUsuario : cadastrarUsuario} className="space-y-4">
                        {modal === 'empresa' ? <>
                            <label className="block text-sm text-white/70">Nome da empresa<input required minLength={2} maxLength={150} className={`${campo} mt-2`} value={empresaNome} onChange={e => setEmpresaNome(e.target.value)} /></label>
                            <label className="block text-sm text-white/70">CNPJ / documento (opcional)<input className={`${campo} mt-2`} value={empresaDocumento} onChange={e => setEmpresaDocumento(e.target.value)} /></label>
                        </> : <>
                            <label className="block text-sm text-white/70">Nome completo<input required minLength={2} maxLength={150} className={`${campo} mt-2`} value={nome} onChange={e => setNome(e.target.value)} /></label>
                            {modal === 'usuario' && <>
                                <label className="block text-sm text-white/70">E-mail<input required type="email" className={`${campo} mt-2`} value={email} onChange={e => setEmail(e.target.value)} /></label>
                                <label className="block text-sm text-white/70">Senha inicial (mínimo 10 caracteres)<input required type="password" minLength={10} maxLength={128} autoComplete="new-password" className={`${campo} mt-2`} value={senha} onChange={e => setSenha(e.target.value)} /></label>
                                <label className="block text-sm text-white/70">Perfil<select className={`${campo} mt-2`} value={perfil} onChange={e => { setPerfil(e.target.value as 'MEMBER' | 'COMPANY'); setEmpresaId(''); }}><option value="MEMBER">Membro</option><option value="COMPANY">Empresa</option></select></label>
                            </>}
                            {(modal === 'usuario' ? perfil === 'COMPANY' : selecionado?.role === 'COMPANY') && <label className="block text-sm text-white/70">Empresa vinculada<select required className={`${campo} mt-2`} value={empresaId} onChange={e => setEmpresaId(e.target.value)}><option value="">Selecione uma empresa</option>{empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</select>{empresas.length === 0 && <span className="mt-2 block text-xs text-[#D8BC7A]">Cadastre uma empresa antes de vincular um usuário.</span>}</label>}
                        </>}
                        <div className="flex flex-wrap justify-end gap-3 pt-3"><button type="button" onClick={fechar} disabled={salvando} className={secundario}>Cancelar</button><button type="submit" disabled={salvando} className={botao}>{salvando ? 'Salvando...' : modal === 'editar' ? 'Salvar alterações' : 'Cadastrar'}</button></div>
                    </form>
                </div>
            </div>}
        </Shell>
    );
}
