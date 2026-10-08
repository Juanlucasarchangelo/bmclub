import './globals.css'; import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'BMClub Brasil', description: 'Experiências, eventos e reservas BMClub' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return <html lang="pt-BR">
        <body>{children}</body>
    </html>
}