
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  MapPin,
  Sparkles,
  TicketCheck,
  Users,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import { Shell } from '@/components/Shell';

type Evento = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  coverUrl?: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
  seatsUsed: number;
  seatsAvailable: number;
  status: string;
  presencaConfirmada: boolean;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000';

const TIMEZONE = 'America/Sao_Paulo';

function formatarData(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(data));
}

function formatarHora(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(data));
}

function formatarDia(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    day: '2-digit',
  }).format(new Date(data));
}

function formatarMes(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    month: 'short',
  })
    .format(new Date(data))
    .replace('.', '')
    .toUpperCase();
}

export default function DisponibilidadeEvento() {
  const params = useParams();
  const id = params.id as string;

  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erroConfirmacao, setErroConfirmacao] = useState('');

  const carregarEvento = useCallback(async () => {
    try {
      setLoading(true);
      setErro('');

      const token = localStorage.getItem('bmclub_access');

      if (!token) {
        setErro(
          'Você precisa estar conectado para acessar este evento.'
        );
        return;
      }

      const response = await fetch(
        `${API_URL}/eventos/${id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Não foi possível carregar o evento.'
        );
      }

      setEvento(data);
    } catch (error) {
      console.error('Erro ao carregar evento:', error);

      setErro(
        error instanceof Error
          ? error.message
          : 'Erro ao carregar evento.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      void carregarEvento();
    }
  }, [id, carregarEvento]);

  async function confirmarPresenca() {
    if (!evento || confirmando) return;

    try {
      setConfirmando(true);
      setMensagem('');
      setErroConfirmacao('');

      const token = localStorage.getItem('bmclub_access');

      if (!token) {
        setErroConfirmacao(
          'Você precisa estar conectado para confirmar presença.'
        );
        return;
      }

      const response = await fetch(
        `${API_URL}/eventos/${evento.id}/confirmar-presenca`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Não foi possível confirmar sua presença.'
        );
      }

      setEvento((atual) => {
        if (!atual) return atual;

        return {
          ...atual,
          presencaConfirmada: true,
          seatsUsed:
            data.seatsUsed ?? atual.seatsUsed + 1,
          seatsAvailable:
            data.seatsAvailable ??
            Math.max(atual.seatsAvailable - 1, 0),
        };
      });

      setMensagem('Sua presença foi confirmada com sucesso!');
    } catch (error) {
      console.error('Erro ao confirmar presença:', error);

      setErroConfirmacao(
        error instanceof Error
          ? error.message
          : 'Erro ao confirmar presença.'
      );
    } finally {
      setConfirmando(false);
    }
  }

  // ======================================================
  // CARREGAMENTO
  // ======================================================

  if (loading) {
    return (
      <Shell>
        <div className="space-y-6 animate-pulse">
          <div className="h-5 w-40 rounded bg-white/10" />
          <div className="h-[320px] rounded-3xl bg-[#111111] md:h-[440px]" />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="h-64 rounded-3xl bg-[#111111] lg:col-span-2" />
            <div className="h-64 rounded-3xl bg-[#111111]" />
          </div>
        </div>
      </Shell>
    );
  }

  // ======================================================
  // ERRO
  // ======================================================

  if (erro || !evento) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-[#111111] p-8 text-center md:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-400/10">
            <AlertCircle className="text-red-400" size={30} />
          </div>

          <h1 className="mt-6 text-2xl font-light">
            Não foi possível carregar o evento
          </h1>

          <p className="mt-3 text-sm leading-7 text-white/50">
            {erro || 'Evento não encontrado.'}
          </p>

          <button
            onClick={() => void carregarEvento()}
            className="mt-7 inline-flex items-center gap-2 rounded-xl border border-[#DBB13F]/40 px-6 py-3 text-sm font-medium text-[#DBB13F] transition hover:bg-[#DBB13F]/10"
          >
            <RefreshCw size={16} />
            Tentar novamente
          </button>

          <div className="mt-6">
            <Link
              href="/eventos"
              className="text-sm text-white/50 hover:text-white"
            >
              Voltar aos eventos
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ======================================================
  // INFORMAÇÕES E REGRAS DE EXIBIÇÃO
  // ======================================================

  const inicio = new Date(evento.startsAt);
  const fim = new Date(evento.endsAt);

  const eventoEncerrado =
    fim.getTime() <= Date.now() ||
    evento.status === 'FINISHED';

  const eventoCancelado = evento.status === 'CANCELLED';
  const eventoPublicado = evento.status === 'PUBLISHED';
  const eventoIniciado = inicio.getTime() <= Date.now();

  const eventoLotado = evento.seatsAvailable <= 0;

  const podeConfirmar =
    eventoPublicado &&
    !eventoEncerrado &&
    !eventoCancelado &&
    !eventoIniciado &&
    !eventoLotado &&
    !evento.presencaConfirmada;

  const percentualOcupacao =
    evento.capacity > 0
      ? Math.min(
        100,
        Math.max(
          0,
          (evento.seatsUsed / evento.capacity) * 100
        )
      )
      : 0;

  let statusTexto = 'Inscrições abertas';
  let statusCor =
    'border-[#DBB13F]/30 bg-[#DBB13F]/10 text-[#D8BC7A]';

  if (evento.presencaConfirmada) {
    statusTexto = 'Presença confirmada';
  } else if (eventoCancelado) {
    statusTexto = 'Evento cancelado';
    statusCor =
      'border-red-400/30 bg-red-400/10 text-red-300';
  } else if (eventoEncerrado) {
    statusTexto = 'Evento encerrado';
    statusCor =
      'border-white/15 bg-white/10 text-white/60';
  } else if (eventoIniciado) {
    statusTexto = 'Evento em andamento';
    statusCor =
      'border-white/15 bg-white/10 text-white/70';
  } else if (!eventoPublicado) {
    statusTexto = 'Inscrições indisponíveis';
    statusCor =
      'border-white/15 bg-white/10 text-white/60';
  } else if (eventoLotado) {
    statusTexto = 'Evento lotado';
    statusCor =
      'border-red-400/30 bg-red-400/10 text-red-300';
  }

  return (
    <Shell>
      <div className="mx-auto max-w-6xl pb-12">
        {/* NAVEGAÇÃO */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/eventos"
            className="group inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-[#DBB13F]"
          >
            <ArrowLeft
              size={17}
              className="transition group-hover:-translate-x-1"
            />
            Voltar aos eventos
          </Link>

          <div className="flex items-center gap-2 text-xs uppercase tracking-[.22em] text-[#DBB13F]">
            <Sparkles size={15} />
            BMClub Brasil
          </div>
        </div>

        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-[#DBB13F]/20 bg-[#111111]">
          <div className="relative min-h-[380px] md:min-h-[490px]">
            {evento.coverUrl ? (
              <img
                src={evento.coverUrl}
                alt={evento.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(219,177,63,.23),transparent_45%),radial-gradient(circle_at_20%_80%,rgba(54,31,91,.35),transparent_45%),linear-gradient(135deg,#20180b,#080808)]" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-black/55 to-black/15" />

            <div className="relative flex min-h-[380px] flex-col justify-between p-6 md:min-h-[490px] md:p-10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#DBB13F]/40 bg-black/60 px-4 py-2 text-[11px] uppercase tracking-[.18em] text-[#D8BC7A] backdrop-blur">
                  <Sparkles size={13} />
                  Experiência BMClub
                </span>

                <span
                  className={`rounded-full border px-4 py-2 text-xs font-medium backdrop-blur ${statusCor}`}
                >
                  {statusTexto}
                </span>
              </div>

              <div className="max-w-3xl">
                <h1 className="text-3xl font-light leading-tight text-white md:text-5xl lg:text-6xl">
                  {evento.title}
                </h1>

                {evento.description && (
                  <p className="mt-5 max-w-2xl whitespace-pre-line text-sm leading-7 text-white/75 md:text-base">
                    {evento.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* INFORMAÇÕES PRINCIPAIS */}
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#111111] p-5">
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-[#DBB13F]/25 bg-[#DBB13F]/10">
              <span className="text-2xl font-semibold leading-none text-[#DBB13F]">
                {formatarDia(evento.startsAt)}
              </span>
              <span className="mt-1 text-[10px] font-semibold tracking-widest text-[#D8BC7A]">
                {formatarMes(evento.startsAt)}
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[.18em] text-white/40">
                Data do evento
              </p>
              <p className="mt-2 text-sm capitalize leading-6 text-white/85">
                {formatarData(evento.startsAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#111111] p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#DBB13F]/10">
              <Clock3 size={24} className="text-[#DBB13F]" />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[.18em] text-white/40">
                Horário
              </p>
              <p className="mt-2 text-lg text-white/85">
                {formatarHora(evento.startsAt)}
                {' às '}
                {formatarHora(evento.endsAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#111111] p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#DBB13F]/10">
              <MapPin size={24} className="text-[#DBB13F]" />
            </div>

            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[.18em] text-white/40">
                Local
              </p>
              <p className="mt-2 break-words text-sm leading-6 text-white/85">
                {evento.location || 'Local a confirmar'}
              </p>
            </div>
          </div>
        </div>

        {/* CONTEÚDO E CONFIRMAÇÃO */}
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-5">
          {/* SOBRE O EVENTO */}
          <section className="rounded-3xl border border-white/10 bg-[#111111] p-6 md:p-9 lg:col-span-3">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DBB13F]/10">
                <Sparkles size={21} className="text-[#DBB13F]" />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[.2em] text-[#DBB13F]">
                  A experiência
                </p>
                <h2 className="mt-1 text-2xl font-light">
                  Sobre este evento
                </h2>
              </div>
            </div>

            <p className="whitespace-pre-line text-sm leading-8 text-white/60">
              {evento.description ||
                'Uma experiência exclusiva do BMClub Brasil, criada para proporcionar encontros especiais e conexões memoráveis.'}
            </p>

            <div className="mt-8 border-t border-white/10 pt-7">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={20}
                  className="mt-0.5 shrink-0 text-[#DBB13F]"
                />
                <div>
                  <p className="text-sm font-medium text-white/85">
                    Sua participação
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/45">
                    Confirme sua presença para registrar sua
                    participação. Você poderá acompanhar suas
                    inscrições na área de eventos do clube.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CONFIRMAÇÃO */}
          <aside className="overflow-hidden rounded-3xl border border-[#DBB13F]/25 bg-[#111111] lg:col-span-2">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_100%_0%,rgba(219,177,63,.12),transparent_65%)] p-6 md:p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[.2em] text-[#DBB13F]">
                    Disponibilidade
                  </p>
                  <h2 className="mt-2 text-2xl font-light">
                    Sua participação
                  </h2>
                </div>

                <TicketCheck
                  size={26}
                  className="text-[#DBB13F]"
                />
              </div>

              <div className="mt-7 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-3xl font-light text-[#DBB13F]">
                    {evento.seatsAvailable}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/45">
                    Vagas livres
                  </p>
                </div>

                <div>
                  <p className="text-3xl font-light text-white">
                    {evento.seatsUsed}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/45">
                    Confirmados
                  </p>
                </div>

                <div>
                  <p className="text-3xl font-light text-white">
                    {evento.capacity}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/45">
                    Capacidade
                  </p>
                </div>
              </div>

              <div className="mt-7">
                <div className="mb-3 flex justify-between text-xs text-white/45">
                  <span>Ocupação do evento</span>
                  <span>
                    {Math.round(percentualOcupacao)}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#B78D2B] to-[#DBB13F] transition-all duration-500"
                    style={{
                      width: `${percentualOcupacao}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {evento.presencaConfirmada ? (
                <div className="rounded-2xl border border-[#DBB13F]/30 bg-[#DBB13F]/10 p-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2
                      size={25}
                      className="shrink-0 text-[#DBB13F]"
                    />
                    <p className="font-semibold text-[#D8BC7A]">
                      Presença confirmada
                    </p>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-white/60">
                    Sua participação neste evento está
                    registrada. Esperamos você!
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-5 text-sm leading-7 text-white/55">
                    Garanta seu lugar nesta experiência
                    exclusiva do BMClub Brasil.
                  </p>

                  <button
                    onClick={confirmarPresenca}
                    disabled={!podeConfirmar || confirmando}
                    className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#DBB13F] px-5 py-4 text-sm font-semibold text-[#080808] transition hover:bg-[#D8BC7A] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {confirmando ? (
                      <>
                        <RefreshCw
                          size={18}
                          className="animate-spin"
                        />
                        Confirmando...
                      </>
                    ) : podeConfirmar ? (
                      <>
                        <Check size={19} />
                        CONFIRMAR MINHA PRESENÇA
                        <ArrowRight
                          size={17}
                          className="transition group-hover:translate-x-1"
                        />
                      </>
                    ) : eventoCancelado ? (
                      'EVENTO CANCELADO'
                    ) : eventoEncerrado ? (
                      'EVENTO ENCERRADO'
                    ) : eventoIniciado ? (
                      'EVENTO JÁ INICIADO'
                    ) : eventoLotado ? (
                      'EVENTO LOTADO'
                    ) : (
                      'INSCRIÇÕES INDISPONÍVEIS'
                    )}
                  </button>
                </>
              )}

              {mensagem && (
                <p
                  role="status"
                  className="mt-4 flex items-start gap-2 text-sm text-[#DBB13F]"
                >
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0"
                  />
                  {mensagem}
                </p>
              )}

              {erroConfirmacao && (
                <p
                  role="alert"
                  className="mt-4 flex items-start gap-2 text-sm text-red-400"
                >
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0"
                  />
                  {erroConfirmacao}
                </p>
              )}

              <div className="mt-7 border-t border-white/10 pt-5">
                <p className="flex items-center gap-2 text-xs leading-6 text-white/40">
                  <ShieldCheck
                    size={16}
                    className="shrink-0 text-[#DBB13F]"
                  />
                  Confirmação vinculada à sua conta BMClub.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* RODAPÉ */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <Link
            href="/eventos"
            className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-[#DBB13F]"
          >
            <ArrowLeft size={17} />
            Explorar outros eventos
          </Link>

          <span className="text-xs uppercase tracking-[.18em] text-white/25">
            BMClub Brasil · Experiências exclusivas
          </span>
        </div>
      </div>
    </Shell>
  );
}
