
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  CalendarDays,
  Clapperboard,
  LayoutDashboard,
  LogOut,
  Shield,
  TicketCheck,
  UserRound,
} from 'lucide-react';

type Role = 'MEMBER' | 'COMPANY' | 'ADMIN';

type SidebarProps = {
  onNavigate?: () => void;
  mobile?: boolean;
};

const links = [
  { href: '/inicio', label: 'Início', Icon: LayoutDashboard },
  { href: '/eventos', label: 'Eventos', Icon: CalendarDays },
  { href: '/reservas', label: 'Minhas reservas', Icon: TicketCheck },
  { href: '/salas', label: 'Salas', Icon: UserRound },
  { href: '/atmos', label: 'ATMOS', Icon: Clapperboard },
  {
    href: '/admin',
    label: 'Administração',
    Icon: Shield,
    adminOnly: true,
  },
];

export function Sidebar({
  onNavigate,
  mobile = false,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem('bmclub_user');

      if (!salvo) {
        setRole(null);
        return;
      }

      const usuario = JSON.parse(salvo);

      if (
        usuario.role === 'ADMIN' ||
        usuario.role === 'COMPANY' ||
        usuario.role === 'MEMBER'
      ) {
        setRole(usuario.role);
      } else {
        setRole(null);
      }
    } catch {
      setRole(null);
    }
  }, [pathname]);

  function logout() {
    localStorage.removeItem('bmclub_access');
    localStorage.removeItem('bmclub_refresh');
    localStorage.removeItem('bmclub_user');

    onNavigate?.();

    router.replace('/login');
    router.refresh();
  }

  const linksVisiveis = links.filter(
    (item) => !item.adminOnly || role === 'ADMIN'
  );

  return (
    <aside
      className={
        mobile
          ? 'flex min-h-full w-full flex-col bg-[#111111] p-5'
          : 'fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-white/10 bg-[#080808] p-6 md:flex'
      }
    >
      <div className="mb-10">
        <div className="text-2xl font-semibold tracking-[.18em] text-[#DBB13F]">
          BMCLUB
        </div>
        <div className="mt-1 text-[10px] tracking-[.35em] text-white/45">
          BRASIL
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {linksVisiveis.map(({ href, label, Icon }) => {
          const ativo =
            href === '/'
              ? pathname === '/'
              : pathname === href ||
              pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${ativo
                  ? 'border border-[#DBB13F]/30 bg-[#DBB13F]/10 text-[#DBB13F]'
                  : 'text-white/65 hover:bg-white/5 hover:text-[#DBB13F]'
                }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut size={18} />
          Sair da conta
        </button>
      </div>
    </aside>
  );
}
