'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000';

export default function Login() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [manterConectado, setManterConectado] =
        useState(true);

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
            router.push('/eventos');

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

                    <p className="text-white/40 mt-6 max-w-md">
                        Eventos, experiências e benefícios exclusivos
                        para membros BMClub.
                    </p>
                </div>

                <p className="text-xs text-white/25">
                    BMClub Brasil
                </p>
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

                    <label className="text-sm text-white/55">
                        Senha
                    </label>

                    <input
                        value={password}

                        onChange={(e) =>
                            setPassword(e.target.value)
                        }

                        type="password"

                        autoComplete="current-password"

                        required

                        placeholder="Sua senha"

                        className="
              w-full
              mt-2
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

                </form>

            </section>

        </main>
    );
}