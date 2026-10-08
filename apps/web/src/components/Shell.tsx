
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function Shell({
    children,
}: {
    children: React.ReactNode;
}) {
    const [menuAberto, setMenuAberto] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMenuAberto(false);
    }, [pathname]);

    useEffect(() => {
        if (!menuAberto) return;

        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = overflowAnterior;
        };
    }, [menuAberto]);

    return (
        <div className="min-h-screen bg-[#080808] text-white">
            {/* SIDEBAR DESKTOP */}
            <Sidebar />

            {/* CABEÇALHO MOBILE */}
            <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#DBB13F]/20 bg-[#080808] px-5 py-4 md:hidden">
                <div>
                    <div className="text-lg font-semibold tracking-[.18em] text-[#DBB13F]">
                        BMCLUB
                    </div>
                    <div className="text-[9px] tracking-[.35em] text-white/45">
                        BRASIL
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setMenuAberto(true)}
                    aria-label="Abrir menu"
                    aria-expanded={menuAberto}
                    aria-controls="bmclub-mobile-menu"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#DBB13F]/40 text-[#DBB13F]"
                >
                    <Menu size={24} />
                </button>
            </header>

            {/* MENU MOBILE */}
            {menuAberto && (
                <div
                    id="bmclub-mobile-menu"
                    className="fixed inset-0 z-50 md:hidden"
                >
                    {/* FUNDO ESCURO */}
                    <button
                        type="button"
                        aria-label="Fechar menu"
                        onClick={() => setMenuAberto(false)}
                        className="absolute inset-0 bg-black/80"
                    />

                    {/* PAINEL LATERAL */}
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu de navegação"
                        className="absolute inset-y-0 left-0 flex w-[85%] max-w-[340px] flex-col border-r border-[#DBB13F]/25 bg-[#111111]"
                    >
                        {/* CABEÇALHO DO MENU */}
                        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
                            <span className="text-sm font-semibold tracking-[.15em] text-[#DBB13F]">
                                MENU
                            </span>

                            <button
                                type="button"
                                onClick={() => setMenuAberto(false)}
                                aria-label="Fechar menu"
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#DBB13F]"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* LINKS E LOGOUT */}
                        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                            <Sidebar
                                mobile={true}
                                onNavigate={() => setMenuAberto(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* CONTEÚDO PRINCIPAL */}
            <div className="md:pl-64">
                <main className="mx-auto w-full max-w-[1500px] p-5 md:p-10">
                    {children}
                </main>
            </div>
        </div>
    );
}
