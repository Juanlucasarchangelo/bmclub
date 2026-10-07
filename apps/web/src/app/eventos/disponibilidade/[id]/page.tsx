'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import { Shell } from '@/components/Shell';
import { Card } from '@/components/Card';

type Evento = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  capacity?: number | null;
  seatsAvailable?: number | null;
  status: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const meses = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const diasSemana = [
  'DOM',
  'SEG',
  'TER',
  'QUA',
  'QUI',
  'SEX',
  'SÁB',
];

export default function DisponibilidadeEvento() {
  const params = useParams();

  const id = params.id as string;

  const [evento, setEvento] =
    useState<Evento | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [erro, setErro] =
    useState('');

  useEffect(() => {
    if (id) {
      carregarEvento();
    }
  }, [id]);

  async function carregarEvento() {
    try {
      setLoading(true);
      setErro('');

      const token =
        localStorage.getItem('bmclub_access');

      const response = await fetch(
        `${API_URL}/eventos/${id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',

            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },

          cache: 'no-store',
        }
      );

      if (response.status === 404) {
        throw new Error(
          'Evento não encontrado.'
        );
      }

      if (!response.ok) {
        const texto = await response.text();

        console.error(
          `Erro API /eventos/${id}:`,
          response.status,
          texto
        );

        throw new Error(
          `Não foi possível carregar o evento (${response.status}).`
        );
      }

      const data = await response.json();

      console.log(
        'Evento recebido da API:',
        data
      );

      /*
       * API pode retornar diretamente o evento:
       *
       * { id, title, ... }
       *
       * ou:
       *
       * { evento: { id, title, ... } }
       */

      setEvento(data.evento || data);

    } catch (error) {
      console.error(
        'Erro ao carregar evento:',
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : 'Erro ao carregar evento.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <Card>
          <p className="text-white/50">
            Carregando disponibilidade...
          </p>
        </Card>
      </Shell>
    );
  }

  if (erro || !evento) {
    return (
      <Shell>
        <Card>
          <p className="text-red-400">
            {erro || 'Evento não encontrado.'}
          </p>

          <Link
            href="/eventos"
            className="inline-block mt-5 text-[#DBB13F]"
          >
            ← Voltar para eventos
          </Link>
        </Card>
      </Shell>
    );
  }

  const inicio =
    new Date(evento.startsAt);

  const fim =
    new Date(evento.endsAt);

  const mes =
    inicio.getMonth();

  const ano =
    inicio.getFullYear();

  const diaEvento =
    inicio.getDate();

  const primeiroDia =
    new Date(ano, mes, 1).getDay();

  const quantidadeDias =
    new Date(
      ano,
      mes + 1,
      0
    ).getDate();

  return (
    <Shell>
      <Link
        href="/eventos"
        className="
          text-white/40
          hover:text-[#DBB13F]
          transition
          text-sm
        "
      >
        ← Voltar para eventos
      </Link>

      <p className="gold text-xs tracking-[.25em] mt-6">
        DISPONIBILIDADE
      </p>

      <h1 className="text-4xl mt-2">
        {evento.title}
      </h1>

      {evento.description && (
        <p className="text-white/45 mt-3 max-w-2xl">
          {evento.description}
        </p>
      )}

      <div className="grid xl:grid-cols-[1.5fr_1fr] gap-5 mt-8">

        {/* CALENDÁRIO */}

        <Card>
          <div className="text-center mb-8">
            <h2 className="text-xl">
              {meses[mes]}
            </h2>

            <p className="text-white/40 text-sm">
              {ano}
            </p>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {diasSemana.map((dia) => (
              <div
                key={dia}
                className="
                  text-center
                  text-[10px]
                  tracking-wider
                  text-white/30
                  py-2
                "
              >
                {dia}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">

            {Array.from({
              length: primeiroDia,
            }).map((_, index) => (
              <div
                key={`empty-${index}`}
              />
            ))}

            {Array.from({
              length: quantidadeDias,
            }).map((_, index) => {

              const dia =
                index + 1;

              const possuiEvento =
                dia === diaEvento;

              return (
                <div
                  key={dia}
                  className={`
                    relative
                    min-h-[82px]
                    rounded-xl
                    border
                    flex
                    flex-col
                    items-center
                    justify-center

                    ${
                      possuiEvento
                        ? `
                          border-[#DBB13F]
                          bg-[#DBB13F]/10
                        `
                        : `
                          border-white/5
                          text-white/25
                        `
                    }
                  `}
                >

                  <span
                    className={
                      possuiEvento
                        ? 'text-[#DBB13F] font-medium'
                        : ''
                    }
                  >
                    {dia}
                  </span>

                  {possuiEvento && (
                    <span
                      className="
                        absolute
                        bottom-3
                        w-1.5
                        h-1.5
                        rounded-full
                        bg-[#DBB13F]
                      "
                    />
                  )}

                </div>
              );
            })}

          </div>

          <div className="flex items-center gap-2 mt-6 text-xs text-white/40">
            <span
              className="
                w-2
                h-2
                rounded-full
                bg-[#DBB13F]
              "
            />

            Data disponível para este evento
          </div>
        </Card>

        {/* DETALHES */}

        <Card>
          <p className="gold text-xs tracking-[.2em]">
            DATA DISPONÍVEL
          </p>

          <h2 className="text-2xl mt-3">
            {inicio.toLocaleDateString(
              'pt-BR',
              {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              }
            )}
          </h2>

          <div className="mt-6 space-y-5">

            <div>
              <p className="text-white/30 text-xs">
                HORÁRIO
              </p>

              <p className="mt-1">
                {inicio.toLocaleTimeString(
                  'pt-BR',
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                )}

                {' às '}

                {fim.toLocaleTimeString(
                  'pt-BR',
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                )}
              </p>
            </div>

            {evento.location && (
              <div>
                <p className="text-white/30 text-xs">
                  LOCAL
                </p>

                <p className="mt-1">
                  {evento.location}
                </p>
              </div>
            )}

            {evento.seatsAvailable !==
              undefined &&
              evento.seatsAvailable !==
              null && (
                <div>
                  <p className="text-white/30 text-xs">
                    VAGAS DISPONÍVEIS
                  </p>

                  <p className="text-[#DBB13F] text-2xl mt-1">
                    {evento.seatsAvailable}
                  </p>
                </div>
              )}

          </div>
        </Card>

      </div>
    </Shell>
  );
}