'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { Shell } from '@/components/Shell';
import { Card } from '@/components/Card';

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

export default function DisponibilidadeEvento() {
  const params = useParams();

  const id = params.id as string;

  const [evento, setEvento] =
    useState<Evento | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [erro, setErro] =
    useState('');

  const [confirmando, setConfirmando] =
    useState(false);

  const [mensagem, setMensagem] =
    useState('');

  const [erroConfirmacao, setErroConfirmacao] =
    useState('');


  /* =====================================================
     CARREGAR EVENTO
  ===================================================== */

  useEffect(() => {
    if (!id) {
      return;
    }

    carregarEvento();
  }, [id]);


  async function carregarEvento() {
    try {
      setLoading(true);
      setErro('');

      const token =
        localStorage.getItem('bmclub_access');

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


  /* =====================================================
     CONFIRMAR PRESENÇA
  ===================================================== */

  async function confirmarPresenca() {
    if (!evento) {
      return;
    }

    try {
      setConfirmando(true);

      setMensagem('');

      setErroConfirmacao('');

      const token =
        localStorage.getItem('bmclub_access');

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

      /*
       * Atualiza a página imediatamente
       * sem precisar recarregar.
       */

      setEvento((eventoAtual) => {
        if (!eventoAtual) {
          return eventoAtual;
        }

        return {
          ...eventoAtual,

          presencaConfirmada: true,

          seatsUsed:
            data.seatsUsed ??
            eventoAtual.seatsUsed + 1,

          seatsAvailable:
            data.seatsAvailable ??
            Math.max(
              eventoAtual.seatsAvailable - 1,
              0
            ),
        };
      });

      setMensagem(
        'Presença confirmada com sucesso!'
      );
    } catch (error) {
      console.error(
        'Erro ao confirmar presença:',
        error
      );

      setErroConfirmacao(
        error instanceof Error
          ? error.message
          : 'Erro ao confirmar presença.'
      );
    } finally {
      setConfirmando(false);
    }
  }


  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <Shell>
        <Card>
          <p className="text-white/50">
            Carregando evento...
          </p>
        </Card>
      </Shell>
    );
  }


  /* =====================================================
     ERRO
  ===================================================== */

  if (erro) {
    return (
      <Shell>
        <Card>
          <p className="gold text-xs tracking-[.25em]">
            EVENTO
          </p>

          <h1 className="text-2xl mt-3">
            Não foi possível carregar
          </h1>

          <p className="text-red-400 mt-4">
            {erro}
          </p>

          <button
            onClick={carregarEvento}
            className="
              mt-6
              border
              border-[#DBB13F]
              text-[#DBB13F]
              px-5
              py-3
              rounded-xl
            "
          >
            TENTAR NOVAMENTE
          </button>
        </Card>
      </Shell>
    );
  }


  if (!evento) {
    return null;
  }


  /* =====================================================
     DATAS
  ===================================================== */

  const inicio =
    new Date(evento.startsAt);

  const fim =
    new Date(evento.endsAt);

  const dataEvento =
    inicio.toLocaleDateString(
      'pt-BR',
      {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }
    );

  const horarioInicio =
    inicio.toLocaleTimeString(
      'pt-BR',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );

  const horarioFim =
    fim.toLocaleTimeString(
      'pt-BR',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );


  /* =====================================================
     PÁGINA
  ===================================================== */

  return (
    <Shell>

      {/* CABEÇALHO */}

      <p className="gold text-xs tracking-[.25em]">
        EVENTO BMCLUB
      </p>

      <h1 className="text-4xl mt-2">
        {evento.title}
      </h1>

      {evento.description && (
        <p className="text-white/45 mt-3 mb-8 max-w-2xl">
          {evento.description}
        </p>
      )}


      <div className="grid lg:grid-cols-2 gap-5 mt-8">

        {/* DATA DO EVENTO */}

        <Card>

          <p className="gold text-xs tracking-[.2em]">
            DATA DO EVENTO
          </p>

          <h2 className="text-2xl mt-4 capitalize">
            {dataEvento}
          </h2>

          <div className="mt-6">

            <p className="text-white/35 text-sm">
              Horário
            </p>

            <p className="text-white/80 mt-1">
              {horarioInicio}
              {' às '}
              {horarioFim}
            </p>

          </div>


          {evento.location && (
            <div className="mt-5">

              <p className="text-white/35 text-sm">
                Local
              </p>

              <p className="text-white/80 mt-1">
                {evento.location}
              </p>

            </div>
          )}

        </Card>


        {/* DISPONIBILIDADE */}

        <Card>

          <p className="gold text-xs tracking-[.2em]">
            DISPONIBILIDADE
          </p>


          <div className="mt-6 space-y-5">

            <div>

              <p className="text-white/35 text-sm">
                Capacidade
              </p>

              <p className="text-xl mt-1">
                {evento.capacity}
              </p>

            </div>


            <div>

              <p className="text-white/35 text-sm">
                Presenças confirmadas
              </p>

              <p className="text-xl mt-1">
                {evento.seatsUsed}
              </p>

            </div>


            <div>

              <p className="text-white/35 text-sm">
                Vagas disponíveis
              </p>

              <p className="text-2xl gold mt-1">
                {evento.seatsAvailable}
              </p>

            </div>

          </div>


          {/* CONFIRMAÇÃO */}

          <div className="mt-8 pt-6 border-t border-white/10">

            {evento.presencaConfirmada ? (

              <div
                className="
                  border
                  border-[#DBB13F]/30
                  bg-[#DBB13F]/10
                  rounded-xl
                  p-5
                "
              >

                <p className="text-[#DBB13F] font-medium">
                  ✓ PRESENÇA CONFIRMADA
                </p>

                <p className="text-white/50 text-sm mt-2">
                  Sua presença está confirmada neste evento.
                </p>

              </div>

            ) : (

              <button
                onClick={confirmarPresenca}

                disabled={
                  confirmando ||
                  evento.seatsAvailable <= 0
                }

                className="
                  w-full
                  bg-[#DBB13F]
                  text-black
                  font-semibold
                  px-6
                  py-4
                  rounded-xl

                  hover:bg-[#D8BC7A]

                  transition

                  disabled:opacity-40
                  disabled:cursor-not-allowed
                "
              >

                {confirmando
                  ? 'CONFIRMANDO...'

                  : evento.seatsAvailable <= 0
                    ? 'EVENTO LOTADO'

                    : 'CONFIRMAR PRESENÇA'
                }

              </button>

            )}


            {mensagem && (

              <p className="text-[#DBB13F] text-sm mt-4">
                {mensagem}
              </p>

            )}


            {erroConfirmacao && (

              <p className="text-red-400 text-sm mt-4">
                {erroConfirmacao}
              </p>

            )}

          </div>

        </Card>

      </div>

    </Shell>
  );
}