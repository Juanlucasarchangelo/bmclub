import './globals.css'; import type { Metadata } from 'next';
import { AuthGuard } from '@/components/AuthGuard';
export const metadata: Metadata = { title: 'BMClub Brasil', description: 'Experiências, eventos e reservas BMClub' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return <html lang="pt-BR">
        <body>
            <AuthGuard>
                {children}
            </AuthGuard>
        </body>
    </html>
}