
'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000';

export default function Cadastro() {
    const router = useRouter();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError('As senhas informadas não coincidem.');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || 'Não foi possível realizar o cadastro.'
                );
            }

            setSuccess('Conta criada com sucesso! Redirecionando para o login...');

            // O usuário fará o login normalmente com a conta recém-criada.
            router.push('/login');
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível realizar o cadastro.'
            );
        } finally {
            setLoading(false);
        }
    }

    const inputClass =
        'w-full mt-2 bg-[#111111] border border-white/10 rounded-xl p-4 outline-none focus:border-[#DBB13F] transition';

    return (
        <main className="min-h-screen grid lg:grid-cols-2 bg-[#080808] text-white">
            {/* IDENTIDADE VISUAL */}
            <section className="hidden lg:flex p-16 flex-col justify-between border-r border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(219,177,63,.16),transparent_35%)]">
                <div>
                    <div className="text-3xl tracking-[.2em] text-[#DBB13F]">
                        BMCLUB
                    </div>
                    <div className="text-xs tracking-[.45em] text-white/40">
                        BRASIL
                    </div>
                </div>

                <div>
                    <h1 className="text-6xl font-light max-w-xl leading-tight">
                        Faça parte de experiências exclusivas.
                    </h1>
                    <p className="text-white/40 mt-6 max-w-md">
                        Crie sua conta e descubra os eventos, experiências
                        e benefícios do BMClub Brasil.
                    </p>
                </div>

                <p className="text-xs text-white/25">BMClub Brasil</p>
            </section>

            {/* FORMULÁRIO */}
            <section className="flex items-center justify-center p-6 py-12">
                <form onSubmit={submit} className="w-full max-w-md">
                    <div className="lg:hidden mb-12">
                        <div className="text-2xl tracking-[.2em] text-[#DBB13F]">
                            BMCLUB
                        </div>
                        <div className="text-[10px] tracking-[.45em] text-white/40">
                            BRASIL
                        </div>
                    </div>

                    <p className="text-[#DBB13F] text-xs tracking-[.3em]">
                        SEJA BEM-VINDO
                    </p>

                    <h2 className="text-4xl mt-3 mb-3">
                        Criar minha conta
                    </h2>

                    <p className="text-sm text-white/45 mb-8">
                        Preencha seus dados para começar.
                    </p>

                    <div className="mb-5">
                        <label htmlFor="name" className="text-sm text-white/55">
                            Nome completo
                        </label>
                        <input
                            id="name"
                            type="text"
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Seu nome completo"
                            maxLength={150}
                            required
                            className={inputClass}
                        />
                    </div>

                    <div className="mb-5">
                        <label htmlFor="email" className="text-sm text-white/55">
                            E-mail
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                            className={inputClass}
                        />
                    </div>

                    <div className="mb-5">
                        <label htmlFor="password" className="text-sm text-white/55">
                            Senha
                        </label>

                        <div className="relative">
                            <input
                                id="password"
                                type={mostrarSenha ? 'text' : 'password'}
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo de 6 caracteres"
                                minLength={6}
                                required
                                className={`${inputClass} pr-14`}
                            />

                            <button
                                type="button"
                                onClick={() => setMostrarSenha(!mostrarSenha)}
                                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                                className="absolute right-3 top-1/2 -translate-y-1/2 mt-1 flex h-10 w-10 items-center justify-center rounded-lg text-white/50 hover:text-[#DBB13F] transition"
                            >
                                {mostrarSenha ? (
                                    <EyeOff size={21} />
                                ) : (
                                    <Eye size={21} />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="mb-7">
                        <label
                            htmlFor="confirmPassword"
                            className="text-sm text-white/55"
                        >
                            Confirmar senha
                        </label>
                        <input
                            id="confirmPassword"
                            type={mostrarSenha ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Digite a senha novamente"
                            minLength={6}
                            required
                            className={inputClass}
                        />
                    </div>

                    {error && (
                        <div className="mb-5 border border-red-500/20 bg-red-500/10 rounded-xl p-4">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mb-5 border border-green-500/20 bg-green-500/10 rounded-xl p-4">
                            <p className="text-green-400 text-sm">{success}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#DBB13F] text-black font-semibold rounded-xl p-4 hover:bg-[#D8BC7A] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'CRIANDO CONTA...' : 'CRIAR CONTA'}
                    </button>

                    <p className="text-center text-sm text-white/50 mt-7">
                        Já possui uma conta?{' '}
                        <Link
                            href="/login"
                            className="text-[#DBB13F] hover:text-[#D8BC7A] font-medium transition"
                        >
                            Fazer login
                        </Link>
                    </p>
                </form>
            </section>
        </main>
    );
}
