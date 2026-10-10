
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const ROTAS_PUBLICAS = [
    '/',
    '/login',
    '/cadastro',
    '/recuperar-senha',
];

function ehRotaPublica(pathname: string) {
    return ROTAS_PUBLICAS.some(
        (rota) =>
            pathname === rota ||
            (rota !== '/' &&
                pathname.startsWith(`${rota}/`))
    );
}

export function AuthGuard({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();

    const [verificado, setVerificado] = useState(false);

    useEffect(() => {
        setVerificado(false);

        // Rotas públicas não exigem autenticação.
        if (ehRotaPublica(pathname)) {
            setVerificado(true);
            return;
        }

        // Proteção inicial das rotas privadas.
        const token = localStorage.getItem('bmclub_access');

        if (!token) {
            router.replace('/login');
            return;
        }

        setVerificado(true);
    }, [pathname, router]);

    // Evita mostrar uma página privada antes
    // de verificar a presença do token.
    if (!ehRotaPublica(pathname) && !verificado) {
        return (
            <div className="min-h-screen bg-[#080808] flex items-center justify-center">
                <p className="text-[#DBB13F] text-sm tracking-[.3em]">
                    BMCLUB BRASIL
                </p>
            </div>
        );
    }

    return <>{children}</>;
}
