'use client';

import { useEffect, useState } from 'react';
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
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'FINISHED';
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Eventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarEventos();
  }, []);

  async function carregarEventos() {
    try {
      setLoading(true);
      setErro('');

      const token = localStorage.getItem('bmclub_access');

      const response = await fetch(`${API_URL}/eventos`, {
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
      });

      if (!response.ok) {
        const texto = await response.text();

        console.error(
          'Erro API /eventos:',
          response.status,
          texto
        );

        throw new Error(
          `Não foi possível carregar os eventos (${response.status}).`
        );
      }

      const data = await response.json();

      console.log('Eventos recebidos da API:', data);

      const lista = Array.isArray(data)
        ? data
        : data.eventos || [];

      setEventos(lista);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);

      setErro(
        error instanceof Error
          ? error.message
          : 'Erro ao carregar eventos.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <p className="gold text-xs tracking-[.25em]">
        AGENDA
      </p>

      <h1 className="text-4xl mt-2 mb-2">
        Eventos
      </h1>

      <p className="text-white/45 mb-8">
        Conheça as próximas experiências BMClub.
      </p>

      {loading && (
        <Card>
          <p className="text-white/50">
            Carregando eventos...
          </p>
        </Card>
      )}

      {!loading && erro && (
        <Card>
          <p className="text-red-400">
            {erro}
          </p>

          <button
            onClick={carregarEventos}
            className="mt-5 border border-[#DBB13F] text-[#DBB13F] px-5 py-3 rounded-xl"
          >
            TENTAR NOVAMENTE
          </button>
        </Card>
      )}

      {!loading && !erro && eventos.length === 0 && (
        <Card>
          <p className="gold text-xs">
            EVENTOS
          </p>

          <h2 className="text-xl mt-3">
            Nenhum evento disponível
          </h2>

          <p className="text-white/45 mt-2">
            No momento não existem eventos publicados.
          </p>
        </Card>
      )}

      {!loading && !erro && eventos.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-5">
          {eventos.map((evento) => {
            const inicio = new Date(evento.startsAt);
            const fim = new Date(evento.endsAt);

            return (
              <Card key={evento.id}>
                <p className="gold text-xs tracking-[.2em]">
                  EVENTO BMCLUB
                </p>

                <h2 className="text-2xl mt-3">
                  {evento.title}
                </h2>

                {evento.description && (
                  <p className="text-white/45 mt-3">
                    {evento.description}
                  </p>
                )}

                <div className="mt-6 space-y-3 text-sm">
                  {evento.location && (
                    <p>
                      <span className="text-white/35">
                        Local
                      </span>

                      <br />

                      <span className="text-white/80">
                        {evento.location}
                      </span>
                    </p>
                  )}

                  <p>
                    <span className="text-white/35">
                      Próxima data
                    </span>

                    <br />

                    <span className="text-white/80">
                      {inicio.toLocaleDateString('pt-BR')}
                    </span>
                  </p>

                  <p>
                    <span className="text-white/35">
                      Horário
                    </span>

                    <br />

                    <span className="text-white/80">
                      {inicio.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}

                      {' às '}

                      {fim.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                </div>

                <Link
                  href={`/eventos/disponibilidade/${evento.id}`}
                  className="
                    inline-block
                    mt-8
                    border
                    border-[#DBB13F]
                    text-[#DBB13F]
                    px-5
                    py-3
                    rounded-xl
                    hover:bg-[#DBB13F]
                    hover:text-black
                    transition
                  "
                >
                  VER DISPONIBILIDADE
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}