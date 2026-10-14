
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  CalendarDays,
  Clapperboard,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  Shield,
  TicketCheck,
  UserRound,
  Wrench,
  MessageCircle,
  ChevronDown,
} from 'lucide-react';

type Role = 'MEMBER' | 'COMPANY' | 'ADMIN';

type SidebarProps = {
  onNavigate?: () => void;
  mobile?: boolean;
};

const links = [
  {
    href: '/inicio',
    label: 'Início',
    Icon: LayoutDashboard,
  },
  {
    href: '/eventos',
    label: 'Eventos',
    Icon: CalendarDays,
  },
  {
    href: '/reservas',
    label: 'Minhas reservas',
    Icon: TicketCheck,
  },
  {
    href: '/salas',
    label: 'Salas',
    Icon: DoorOpen,
  },
  {
    href: '/atmos',
    label: 'ATMOS',
    Icon: Clapperboard,
  },
  {
    href: '/perfil',
    label: 'Meu Perfil',
    Icon: UserRound,
  },
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

  const [ferramentasAbertas, setFerramentasAbertas] =
    useState(pathname.startsWith('/ferramentas'));

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

  useEffect(() => {
    if (pathname.startsWith('/ferramentas')) {
      setFerramentasAbertas(true);
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
            pathname === href ||
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
              <span>{label}</span>
            </Link>
          );
        })}

        {/* FERRAMENTAS — SOMENTE ADMIN */}
        {role === 'ADMIN' && (
          <div className="pt-3">
            <button
              type="button"
              onClick={() =>
                setFerramentasAbertas((anterior) => !anterior)
              }
              aria-expanded={ferramentasAbertas}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${pathname.startsWith('/ferramentas')
                  ? 'bg-[#DBB13F]/10 text-[#DBB13F]'
                  : 'text-white/65 hover:bg-white/5 hover:text-[#DBB13F]'
                }`}
            >
              <Wrench size={18} />
              <span className="flex-1 text-left">
                Ferramentas
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform ${ferramentasAbertas ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {ferramentasAbertas && (
              <div className="mt-2 ml-5 border-l border-[#DBB13F]/25 pl-3">
                <Link
                  href="/ferramentas/mensagens"
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${pathname === '/ferramentas/mensagens'
                      ? 'bg-[#DBB13F]/10 text-[#DBB13F]'
                      : 'text-white/55 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <MessageCircle size={17} />
                  Envio de mensagens
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="mt-8 border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut size={18} />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  );
}
