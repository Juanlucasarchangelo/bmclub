'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { UserRound, Utensils, LockKeyhole, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Perfil = {
    id: string;
    name: string;
    email: string;
    cpf: string | null;
    phone: string | null;
    dietaryRestrictions: string | null;
    role: 'MEMBER' | 'COMPANY' | 'ADMIN';
};

function mensagemApi(data: unknown, fallback: string) {
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') return data.message;
    return fallback;
}

function mascaraCpf(valor: string) {
    const d = valor.replace(/\D/g, '').slice(0, 11);
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function mascaraTelefone(valor: string) {
    const d = valor.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const inputClass = 'w-full rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#DBB13F]/60';
const labelClass = 'mb-2 block text-xs uppercase tracking-[.15em] text-white/45';

export default function PerfilPage() {
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [phone, setPhone] = useState('');
    const [restricao, setRestricao] = useState<'unset' | 'none' | 'yes'>('unset');
    const [detalhes, setDetalhes] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');
    const [erroSenha, setErroSenha] = useState('');
    const [sucessoSenha, setSucessoSenha] = useState('');

    const carregar = useCallback(async () => {
        setLoading(true);
        setErro('');
        try {
            const token = localStorage.getItem('bmclub_access');
            if (!token) throw new Error('Faça login para acessar seu perfil.');
            const response = await fetch(`${API_URL}/perfil/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
            const data: unknown = await response.json();
            if (!response.ok) throw new Error(mensagemApi(data, 'Não foi possível carregar o perfil.'));
            const user = data as Perfil;
            setPerfil(user);
            setName(user.name);
            setCpf(mascaraCpf(user.cpf || ''));
            setPhone(mascaraTelefone(user.phone || ''));
            const dietary = user.dietaryRestrictions;
            setRestricao(dietary === null ? 'unset' : dietary === '' ? 'none' : 'yes');
            setDetalhes(dietary || '');
        } catch (error) {
            setErro(error instanceof Error ? error.message : 'Erro ao carregar perfil.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void carregar(); }, [carregar]);

    async function salvar(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErro(''); setSucesso('');
        if (name.trim().length < 2) { setErro('Informe seu nome completo.'); return; }
        if (restricao === 'yes' && !detalhes.trim()) { setErro('Descreva suas restrições alimentares.'); return; }
        const token = localStorage.getItem('bmclub_access');
        if (!token) { setErro('Sua sessão não está disponível. Faça login novamente.'); return; }
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/perfil/me`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: name.trim(),
                    cpf: cpf.replace(/\D/g, '') || null,
                    phone: phone.replace(/\D/g, '') || null,
                    dietaryRestrictions: restricao === 'unset' ? null : restricao === 'none' ? '' : detalhes.trim(),
                }),
            });
            const data: unknown = await response.json();
            if (!response.ok) throw new Error(mensagemApi(data, 'Não foi possível salvar o perfil.'));
            if (data && typeof data === 'object' && 'user' in data) setPerfil(data.user as Perfil);
            setSucesso('Dados atualizados com sucesso.');
        } catch (error) {
            setErro(error instanceof Error ? error.message : 'Erro ao salvar perfil.');
        } finally { setSaving(false); }
    }

    async function alterarSenha(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault(); setErroSenha(''); setSucessoSenha('');
        if (newPassword.length < 8) { setErroSenha('A nova senha deve ter pelo menos 8 caracteres.'); return; }
        if (newPassword !== confirmPassword) { setErroSenha('A confirmação da senha não corresponde.'); return; }
        const token = localStorage.getItem('bmclub_access');
        if (!token) { setErroSenha('Faça login novamente.'); return; }
        setChangingPassword(true);
        try {
            const response = await fetch(`${API_URL}/perfil/me/senha`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data: unknown = await response.json();
            if (!response.ok) throw new Error(mensagemApi(data, 'Não foi possível alterar a senha.'));
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
            setSucessoSenha('Senha alterada com sucesso.');
        } catch (error) {
            setErroSenha(error instanceof Error ? error.message : 'Erro ao alterar senha.');
        } finally { setChangingPassword(false); }
    }

    return (
        <Shell>
            <div className="mx-auto max-w-5xl pb-12">
                <div className="mb-8">
                    <p className="text-xs uppercase tracking-[.28em] text-[#DBB13F]">BMClub Brasil / Minha conta</p>
                    <h1 className="mt-3 text-3xl font-light md:text-5xl">Meu Perfil</h1>
                    <p className="mt-3 text-sm text-white/45">Seus dados, preferências e segurança em um só lugar.</p>
                </div>
                {loading ? (
                    <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-[#111111] p-8 text-white/50"><Loader2 className="animate-spin" size={19} /> Carregando seu perfil...</div>
                ) : !perfil ? (
                    <div className="rounded-3xl border border-white/10 bg-[#111111] p-8">
                        <p className="text-red-300">{erro || 'Não foi possível carregar o perfil.'}</p>
                        <button type="button" onClick={() => void carregar()} className="mt-5 rounded-xl border border-[#DBB13F]/40 px-5 py-3 text-sm text-[#DBB13F]">Tentar novamente</button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <form onSubmit={salvar} className="space-y-6">
                            <section className="rounded-3xl border border-white/10 bg-[#111111] p-6 md:p-9">
                                <div className="mb-7 flex items-center gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DBB13F]/10"><UserRound className="text-[#DBB13F]" size={26} /></div>
                                    <div><p className="text-xs uppercase tracking-[.2em] text-[#DBB13F]">Dados pessoais</p><h2 className="mt-1 text-2xl font-light">Suas informações</h2></div>
                                </div>
                                <div className="grid gap-5 md:grid-cols-2">
                                    <div className="md:col-span-2"><label htmlFor="profile-name" className={labelClass}>Nome completo</label><input id="profile-name" className={inputClass} value={name} onChange={e => setName(e.target.value)} maxLength={150} required /></div>
                                    <div><label htmlFor="profile-cpf" className={labelClass}>CPF</label><input id="profile-cpf" className={inputClass} value={cpf} onChange={e => setCpf(mascaraCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" /></div>
                                    <div><label htmlFor="profile-phone" className={labelClass}>Telefone com DDD</label><input id="profile-phone" className={inputClass} value={phone} onChange={e => setPhone(mascaraTelefone(e.target.value))} inputMode="tel" placeholder="(11) 99999-9999" /></div>
                                    <div className="md:col-span-2"><label htmlFor="profile-email" className={labelClass}>E-mail de acesso</label><input id="profile-email" className={`${inputClass} cursor-not-allowed opacity-60`} value={perfil.email} readOnly /><p className="mt-2 text-xs text-white/35">O e-mail não pode ser alterado por esta tela.</p></div>
                                </div>
                            </section>
                            <section className="rounded-3xl border border-white/10 bg-[#111111] p-6 md:p-9">
                                <div className="mb-5 flex items-center gap-3"><Utensils className="text-[#DBB13F]" size={23} /><div><p className="text-xs uppercase tracking-[.2em] text-[#DBB13F]">Hospitalidade</p><h2 className="mt-1 text-2xl font-light">Restrições alimentares</h2></div></div>
                                <p className="mb-6 text-sm leading-7 text-white/50">Informe alergias, intolerâncias ou preferências alimentares relevantes para os eventos do clube.</p>
                                <div className="space-y-3">
                                    {([['none', 'Não possuo restrições alimentares'], ['yes', 'Possuo restrições alimentares'], ['unset', 'Prefiro informar depois']] as const).map(([value, text]) => (
                                        <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm transition ${restricao === value ? 'border-[#DBB13F]/60 bg-[#DBB13F]/10 text-white' : 'border-white/10 bg-[#181818] text-white/65'}`}>
                                            <input type="radio" name="dietary" value={value} checked={restricao === value} onChange={() => setRestricao(value)} className="accent-[#DBB13F]" />{text}
                                        </label>
                                    ))}
                                </div>
                                {restricao === 'yes' && <div className="mt-5"><label htmlFor="profile-dietary" className={labelClass}>Descreva suas restrições</label><textarea id="profile-dietary" className={`${inputClass} min-h-32 resize-y`} maxLength={5000} value={detalhes} onChange={e => setDetalhes(e.target.value)} placeholder="Ex.: alergia a camarão, intolerância à lactose, alimentação vegetariana..." required /></div>}
                                <p className="mt-5 text-xs leading-6 text-white/35">Essas informações devem ser utilizadas somente para atender às necessidades alimentares em eventos, com acesso restrito à equipe autorizada.</p>
                            </section>
                            {erro && <p role="alert" className="flex items-center gap-2 text-sm text-red-300"><AlertCircle size={17} />{erro}</p>}
                            {sucesso && <p role="status" className="flex items-center gap-2 text-sm text-[#DBB13F]"><CheckCircle2 size={17} />{sucesso}</p>}
                            <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#DBB13F] px-7 py-4 text-sm font-semibold text-[#080808] transition hover:bg-[#D8BC7A] disabled:cursor-not-allowed disabled:opacity-50 md:w-auto">
                                {saving ? <Loader2 className="animate-spin" size={19} /> : <Save size={19} />}{saving ? 'Salvando...' : 'SALVAR ALTERAÇÕES'}
                            </button>
                        </form>
                        <section className="rounded-3xl border border-white/10 bg-[#111111] p-6 md:p-9">
                            <div className="mb-6 flex items-center gap-3"><LockKeyhole className="text-[#DBB13F]" size={23} /><div><p className="text-xs uppercase tracking-[.2em] text-[#DBB13F]">Segurança</p><h2 className="mt-1 text-2xl font-light">Alterar senha</h2></div></div>
                            <form onSubmit={alterarSenha} className="max-w-xl space-y-5">
                                <div><label htmlFor="current-password" className={labelClass}>Senha atual</label><input id="current-password" type="password" autoComplete="current-password" className={inputClass} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></div>
                                <div><label htmlFor="new-password" className={labelClass}>Nova senha</label><input id="new-password" type="password" autoComplete="new-password" className={inputClass} value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={8} maxLength={128} required /></div>
                                <div><label htmlFor="confirm-password" className={labelClass}>Confirme a nova senha</label><input id="confirm-password" type="password" autoComplete="new-password" className={inputClass} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={8} maxLength={128} required /></div>
                                {erroSenha && <p role="alert" className="text-sm text-red-300">{erroSenha}</p>}
                                {sucessoSenha && <p role="status" className="text-sm text-[#DBB13F]">{sucessoSenha}</p>}
                                <button type="submit" disabled={changingPassword} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DBB13F]/50 px-6 py-3 text-sm font-medium text-[#DBB13F] transition hover:bg-[#DBB13F]/10 disabled:opacity-50">
                                    {changingPassword && <Loader2 size={17} className="animate-spin" />}{changingPassword ? 'Alterando...' : 'ALTERAR SENHA'}
                                </button>
                            </form>
                        </section>
                    </div>
                )}
            </div>
        </Shell>
    );
}
