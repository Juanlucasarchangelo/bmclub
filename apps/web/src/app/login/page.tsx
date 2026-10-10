'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000';

export default function Login() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);

    const [manterConectado, setManterConectado] = useState(true);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        setError('');
        setLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/auth/login`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json',
                    },

                    body: JSON.stringify({
                        email,
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    'E-mail ou senha inválidos.'
                );
            }

            /*
             * Access Token
             *
             * O restante do sistema já procura
             * exatamente por "bmclub_access".
             */
            localStorage.setItem(
                'bmclub_access',
                data.accessToken
            );

            /*
             * Dados básicos do usuário
             */
            localStorage.setItem(
                'bmclub_user',
                JSON.stringify(data.user)
            );

            /*
             * Refresh Token
             *
             * Só guardamos permanentemente quando
             * "Manter conectado" estiver marcado.
             */
            if (manterConectado) {
                localStorage.setItem(
                    'bmclub_refresh',
                    data.refreshToken
                );
            } else {
                localStorage.removeItem(
                    'bmclub_refresh'
                );
            }

            /*
             * Login concluído.
             * Envia para Eventos.
             */
            router.replace('/inicio');

            router.refresh();
        } catch (error) {
            console.error('Erro no login:', error);

            setError(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível realizar o login.'
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen grid lg:grid-cols-2 bg-[#080808] text-white">

            {/* LADO ESQUERDO */}

            <section
                className="
          hidden
          lg:flex
          p-16
          flex-col
          justify-between
          border-r
          border-white/10
          bg-[radial-gradient(circle_at_20%_20%,rgba(219,177,63,.16),transparent_35%)]
        "
            >
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
                        Experiências que vão além do acesso.
                    </h1>

                    {/* QR CODE BMCLUB */}
                    <div className="mt-8">
                        <div className="inline-block rounded-2xl border border-[#DBB13F]/30 bg-white p-3 shadow-[0_0_35px_rgba(219,177,63,0.12)]">
                            <img
                                src="/images/qrcode-bmclub.jpg"
                                alt="QR Code BMClub Brasil"
                                className="h-80 w-80 object-contain"
                            />
                        </div>
                    </div>
                </div>
            </section>


            {/* LOGIN */}

            <section className="flex items-center justify-center p-6">

                <form
                    onSubmit={submit}
                    className="w-full max-w-md"
                >

                    {/* Logo no mobile */}

                    <div className="lg:hidden mb-12">
                        <div className="text-2xl tracking-[.2em] text-[#DBB13F]">
                            BMCLUB
                        </div>

                        <div className="text-[10px] tracking-[.45em] text-white/40">
                            BRASIL
                        </div>
                    </div>


                    <p className="text-[#DBB13F] text-xs tracking-[.3em]">
                        ÁREA EXCLUSIVA
                    </p>

                    <h2 className="text-4xl mt-3 mb-9">
                        Acesse sua conta
                    </h2>


                    {/* EMAIL */}

                    <label className="text-sm text-white/55">
                        E-mail
                    </label>

                    <input
                        value={email}

                        onChange={(e) =>
                            setEmail(e.target.value)
                        }

                        type="email"

                        autoComplete="email"

                        required

                        placeholder="seu@email.com"

                        className="
              w-full
              mt-2
              mb-5
              bg-[#111111]
              border
              border-white/10
              rounded-xl
              p-4
              outline-none
              focus:border-[#DBB13F]
              transition
            "
                    />


                    {/* SENHA */}

                    <label htmlFor="senha" className="text-sm text-white/55">
                        Senha
                    </label>

                    <div className="relative mt-2">
                        <input
                            id="senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type={mostrarSenha ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                            placeholder="Sua senha"
                            className="w-full bg-[#111111] border border-white/10 rounded-xl p-4 pr-14 outline-none focus:border-[#DBB13F] transition"
                        />
                        <button
                            type="button"
                            onClick={() => setMostrarSenha((anterior) => !anterior)}
                            aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                            aria-pressed={mostrarSenha}
                            title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg text-white/50 hover:text-[#DBB13F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#DBB13F] transition"
                        >
                            {mostrarSenha ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M10.58 10.59a2 2 0 0 0 2.83 2.82" />
                                    <path d="M9.88 5.09A10.94 10.94 0 0 1 12 4.9c7 0 10 7.1 10 7.1a13.7 13.7 0 0 1-4.02 4.8" />
                                    <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7.1 10 7.1a10.9 10.9 0 0 0 5.39-1.49" />
                                    <path d="m2 2 20 20" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M2 12s3-7.1 10-7.1S22 12 22 12s-3 7.1-10 7.1S2 12 2 12Z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            )}
                        </button>
                    </div>


                    {/* OPÇÕES */}

                    <div className="flex justify-between items-center text-xs text-white/45 my-5">

                        <label className="flex items-center gap-2 cursor-pointer">

                            <input
                                type="checkbox"

                                checked={manterConectado}

                                onChange={(e) =>
                                    setManterConectado(
                                        e.target.checked
                                    )
                                }

                                className="accent-[#DBB13F]"
                            />

                            Manter conectado

                        </label>


                        <button
                            type="button"
                            className="text-[#DBB13F] hover:text-[#D8BC7A]"
                        >
                            Esqueci minha senha
                        </button>

                    </div>


                    {/* ERRO */}

                    {error && (
                        <div
                            className="
                mb-5
                border
                border-red-500/20
                bg-red-500/10
                rounded-xl
                p-4
              "
                        >
                            <p className="text-red-400 text-sm">
                                {error}
                            </p>
                        </div>
                    )}


                    {/* ENTRAR */}

                    <button
                        type="submit"

                        disabled={loading}

                        className="
              w-full
              bg-[#DBB13F]
              text-black
              font-semibold
              rounded-xl
              p-4
              hover:bg-[#D8BC7A]
              transition
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
                    >
                        {loading
                            ? 'ENTRANDO...'
                            : 'ENTRAR'}
                    </button>
                    <p className="text-center text-sm text-white/50 mt-7">
                        Ainda não possui uma conta?{' '}
                        <Link
                            href="/cadastro"
                            className="text-[#DBB13F] hover:text-[#D8BC7A] font-medium transition"
                        >
                            Cadastre-se
                        </Link>
                    </p>

                </form>

            </section>

        </main>
    );
}