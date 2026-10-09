
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';

import { Shell } from '@/components/Shell';
import { Card } from '@/components/Card';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type StatusEvento =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'CANCELLED'
  | 'FINISHED';

type Evento = {
  id: string;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
  seatsAvailable?: number | null;
  status: StatusEvento;
};

type FormEvento = {
  title: string;
  description: string;
  location: string;
  data: string;
  inicio: string;
  fim: string;
  capacity: string;
  coverUrl: string;
  status: StatusEvento;
};

type ParticipanteConfirmado = {
  name: string;
  type: 'MEMBER' | 'COMPANY' | 'GUEST';
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  dietaryRestrictions?: string | null;
  responsibleName?: string | null;
};

const formularioVazio: FormEvento = {
  title: '',
  description: '',
  location: '',
  data: '',
  inicio: '19:00',
  fim: '22:00',
  capacity: '30',
  coverUrl: '',
  status: 'PUBLISHED',
};

const campoClasse =
  'mt-2 w-full bg-[#080808] border border-white/15 rounded-xl p-3 text-white outline-none focus:border-[#DBB13F]';

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function partesData(iso: string) {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));

  const pegar = (tipo: string) =>
    partes.find((p) => p.type === tipo)?.value || '';

  return {
    data: `${pegar('year')}-${pegar('month')}-${pegar('day')}`,
    hora: `${pegar('hour')}:${pegar('minute')}`,
  };
}

function converterParaISO(data: string, hora: string) {
  return new Date(`${data}T${hora}:00-03:00`).toISOString();
}

function obterToken() {
  return localStorage.getItem('bmclub_access');
}

async function lerResposta(response: Response): Promise<any> {
  const texto = await response.text();

  try {
    return texto ? JSON.parse(texto) : {};
  } catch {
    return { message: texto };
  }
}

function mensagemErro(resultado: any, padrao: string) {
  return typeof resultado?.message === 'string'
    ? resultado.message
    : padrao;
}

function statusTexto(status: StatusEvento) {
  const textos: Record<StatusEvento, string> = {
    DRAFT: 'RASCUNHO',
    PUBLISHED: 'PUBLICADO',
    CANCELLED: 'CANCELADO',
    FINISHED: 'FINALIZADO',
  };

  return textos[status];
}

function nomeSeguroArquivo(nome: string) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function protegerFormulaExcel(valor: string) {
  // Evita que textos fornecidos por usuários sejam
  // interpretados como fórmulas pelo Excel.
  return /^[\s]*[=+\-@\t\r]/.test(valor)
    ? `'${valor}`
    : valor;
}

function textoExcel(valor?: string | null) {
  return protegerFormulaExcel(valor?.trim() || '');
}

function formatarCpfMascarado(cpf?: string | null) {
  const numeros = (cpf || '').replace(/\D/g, '');

  if (numeros.length !== 11) {
    return '';
  }

  return `***.***.${numeros.slice(6, 9)}-**`;
}

export default function Eventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [admin, setAdmin] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [eventoEditando, setEventoEditando] =
    useState<Evento | null>(null);

  const [form, setForm] = useState<FormEvento>({
    ...formularioVazio,
  });

  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');
  const [aviso, setAviso] = useState('');

  const [fotoArquivo, setFotoArquivo] = useState<File | null>(
    null
  );
  const [fotoPreview, setFotoPreview] = useState('');

  const [excluindoId, setExcluindoId] = useState<
    string | null
  >(null);

  // NOVO: identifica qual evento está sendo exportado.
  const [exportandoId, setExportandoId] = useState<
    string | null
  >(null);

  useEffect(() => {
    for (const chave of ['bmclub_user', 'bmclub_usuario']) {
      const salvo = localStorage.getItem(chave);

      if (!salvo) continue;

      try {
        const usuario = JSON.parse(salvo);

        const perfil =
          usuario?.role ||
          usuario?.user?.role ||
          usuario?.usuario?.role;

        if (perfil === 'ADMIN') {
          setAdmin(true);
          return;
        }
      } catch {
        // Dados locais inválidos.
      }
    }
  }, []);

  const carregarEventos = useCallback(async () => {
    try {
      setLoading(true);
      setErro('');

      const token = obterToken();

      const response = await fetch(`${API_URL}/eventos`, {
        method: 'GET',
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
        cache: 'no-store',
      });

      const resultado = await lerResposta(response);

      if (!response.ok) {
        throw new Error(
          mensagemErro(
            resultado,
            `Não foi possível carregar os eventos (${response.status}).`
          )
        );
      }

      const lista: Evento[] = Array.isArray(resultado)
        ? resultado
        : Array.isArray(resultado?.eventos)
          ? resultado.eventos
          : [];

      setEventos(
        lista
          .filter((evento) => evento.status !== 'CANCELLED')
          .sort(
            (a, b) =>
              new Date(a.startsAt).getTime() -
              new Date(b.startsAt).getTime()
          )
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Erro ao carregar eventos.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarEventos();
  }, [carregarEventos]);

  useEffect(() => {
    if (!fotoArquivo) {
      setFotoPreview(form.coverUrl);
      return;
    }

    const url = URL.createObjectURL(fotoArquivo);
    setFotoPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [fotoArquivo, form.coverUrl]);

  function selecionarFoto(arquivo?: File) {
    if (!arquivo) return;

    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(
        arquivo.type
      )
    ) {
      setErroFormulario(
        'Selecione uma imagem JPG, PNG ou WebP.'
      );
      return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      setErroFormulario(
        'A imagem deve ter no máximo 5 MB.'
      );
      return;
    }

    setFotoArquivo(arquivo);
    setErroFormulario('');
  }

  function novoEvento() {
    setEventoEditando(null);
    setForm({ ...formularioVazio });
    setFotoArquivo(null);
    setFotoPreview('');
    setErroFormulario('');
    setModalAberto(true);
  }

  function editarEvento(evento: Evento) {
    const inicio = partesData(evento.startsAt);
    const fim = partesData(evento.endsAt);

    setEventoEditando(evento);

    setForm({
      title: evento.title,
      description: evento.description || '',
      location: evento.location || '',
      data: inicio.data,
      inicio: inicio.hora,
      fim: fim.hora,
      capacity: String(evento.capacity || 30),
      coverUrl: evento.coverUrl || '',
      status: evento.status,
    });

    setFotoArquivo(null);
    setFotoPreview(evento.coverUrl || '');
    setErroFormulario('');
    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando) return;

    setModalAberto(false);
    setEventoEditando(null);
    setFotoArquivo(null);
    setErroFormulario('');
  }

  function atualizarCampo<K extends keyof FormEvento>(
    campo: K,
    valor: FormEvento[K]
  ) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  async function enviarFoto(
    arquivo: File,
    token: string
  ): Promise<string> {
    const dados = new FormData();
    dados.append('file', arquivo);

    const response = await fetch(`${API_URL}/uploads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: dados,
    });

    const resultado = await lerResposta(response);

    if (!response.ok) {
      throw new Error(
        mensagemErro(
          resultado,
          'Não foi possível enviar a foto.'
        )
      );
    }

    const url =
      resultado.url ||
      resultado.fileUrl ||
      resultado.coverUrl;

    if (typeof url !== 'string' || !url) {
      throw new Error(
        'A API de upload não retornou a URL da foto.'
      );
    }

    return url;
  }

  async function salvarEvento() {
    if (!admin || salvando) return;

    setErroFormulario('');

    if (!form.title.trim()) {
      setErroFormulario('Informe o nome do evento.');
      return;
    }

    if (!form.data || !form.inicio || !form.fim) {
      setErroFormulario(
        'Informe data e horários do evento.'
      );
      return;
    }

    if (!form.location.trim()) {
      setErroFormulario('Informe o local do evento.');
      return;
    }

    const capacidade = Number(form.capacity);

    if (
      !Number.isInteger(capacidade) ||
      capacidade < 1
    ) {
      setErroFormulario(
        'Informe uma capacidade válida.'
      );
      return;
    }

    const startsAt = converterParaISO(
      form.data,
      form.inicio
    );

    const endsAt = converterParaISO(
      form.data,
      form.fim
    );

    if (
      new Date(endsAt).getTime() <=
      new Date(startsAt).getTime()
    ) {
      setErroFormulario(
        'O horário de término deve ser posterior ao início.'
      );
      return;
    }

    const token = obterToken();

    if (!token) {
      setErroFormulario(
        'Sua sessão expirou. Faça login novamente.'
      );
      return;
    }

    setSalvando(true);

    try {
      let coverUrl = form.coverUrl.trim();

      if (fotoArquivo) {
        coverUrl = await enviarFoto(fotoArquivo, token);
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim(),
        startsAt,
        endsAt,
        capacity: capacidade,
        coverUrl: coverUrl || null,
        status: form.status,
      };

      const editando = !!eventoEditando;

      const endpoint = editando
        ? `${API_URL}/eventos/${eventoEditando.id}`
        : `${API_URL}/eventos`;

      const response = await fetch(endpoint, {
        method: editando ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const resultado = await lerResposta(response);

      if (!response.ok) {
        throw new Error(
          mensagemErro(
            resultado,
            `Não foi possível ${editando ? 'atualizar' : 'criar'
            } o evento.`
          )
        );
      }

      setModalAberto(false);
      setEventoEditando(null);
      setFotoArquivo(null);

      setAviso(
        editando
          ? 'Evento atualizado com sucesso!'
          : 'Evento cadastrado com sucesso!'
      );

      await carregarEventos();
    } catch (error) {
      setErroFormulario(
        error instanceof Error
          ? error.message
          : 'Erro ao salvar evento.'
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirEvento(evento: Evento) {
    if (!admin || excluindoId) return;

    const confirmou = window.confirm(
      `Deseja excluir o evento "${evento.title}" da agenda?\n\nO evento será cancelado e não poderá receber novas inscrições.`
    );

    if (!confirmou) return;

    const token = obterToken();

    if (!token) {
      setErro(
        'Sua sessão expirou. Faça login novamente.'
      );
      return;
    }

    setExcluindoId(evento.id);
    setAviso('');

    try {
      const response = await fetch(
        `${API_URL}/eventos/${encodeURIComponent(
          evento.id
        )}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const resultado = await lerResposta(response);

      if (!response.ok) {
        throw new Error(
          mensagemErro(
            resultado,
            'Não foi possível excluir o evento.'
          )
        );
      }

      setEventos((atuais) =>
        atuais.filter((item) => item.id !== evento.id)
      );

      setAviso(
        'Evento excluído da agenda com sucesso.'
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Erro ao excluir evento.'
      );
    } finally {
      setExcluindoId(null);
    }
  }

  // ====================================================
  // NOVO: EXPORTAÇÃO DOS CONVIDADOS CONFIRMADOS
  // ====================================================

  async function exportarConfirmados(evento: Evento) {
    if (!admin || exportandoId) return;

    const token = obterToken();

    if (!token) {
      setErro(
        'Sua sessão expirou. Faça login novamente.'
      );
      return;
    }

    setExportandoId(evento.id);
    setErro('');
    setAviso('');

    try {
      // Esta rota precisa existir na API e exigir ADMIN.
      const response = await fetch(
        `${API_URL}/eventos/${encodeURIComponent(
          evento.id
        )}/confirmados`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        }
      );

      const resultado = await lerResposta(response);

      if (!response.ok) {
        throw new Error(
          mensagemErro(
            resultado,
            'Não foi possível consultar os confirmados.'
          )
        );
      }

      // Contrato esperado da API:
      // { participantes: ParticipanteConfirmado[] }
      if (
        !resultado ||
        !Array.isArray(resultado.participantes)
      ) {
        throw new Error(
          'A API não retornou a lista de participantes esperada.'
        );
      }

      const participantes =
        resultado.participantes as ParticipanteConfirmado[];

      if (participantes.length === 0) {
        setAviso(
          `O evento "${evento.title}" ainda não possui participantes confirmados.`
        );
        return;
      }

      // Carregamento dinâmico: biblioteca Excel somente
      // quando o administrador solicitar a exportação.
      const XLSX = await import('xlsx');

      const linhas = participantes.map(
        (participante, indice) => ({
          Nº: indice + 1,
          Nome: textoExcel(participante.name),
          Tipo:
            participante.type === 'GUEST'
              ? 'Convidado'
              : participante.type === 'COMPANY'
                ? 'Empresa'
                : 'Membro',
          'E-mail': textoExcel(participante.email),
          Telefone: textoExcel(participante.phone),
          CPF: formatarCpfMascarado(
            participante.cpf
          ),
          'Restrição alimentar': textoExcel(
            participante.dietaryRestrictions
          ) || 'Não informado',
          Responsável: textoExcel(
            participante.responsibleName
          ),
        })
      );

      const planilha =
        XLSX.utils.json_to_sheet(linhas);

      planilha['!cols'] = [
        { wch: 6 },
        { wch: 34 },
        { wch: 16 },
        { wch: 34 },
        { wch: 20 },
        { wch: 20 },
        { wch: 45 },
        { wch: 34 },
      ];

      planilha['!autofilter'] = {
        ref: planilha['!ref'] || 'A1:H1',
      };

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        planilha,
        'Confirmados'
      );

      const dataEvento = partesData(
        evento.startsAt
      ).data;

      const nomeArquivo =
        `BMClub_Confirmados_` +
        `${nomeSeguroArquivo(evento.title)}_` +
        `${dataEvento}.xlsx`;

      XLSX.writeFile(
        workbook,
        nomeArquivo,
        {
          bookType: 'xlsx',
        }
      );

      setAviso(
        `Lista de ${participantes.length} participantes confirmados exportada com sucesso.`
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Erro ao exportar participantes.'
      );
    } finally {
      setExportandoId(null);
    }
  }

  return (
    <Shell>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="gold text-xs tracking-[.25em]">
            AGENDA
          </p>

          <h1 className="mb-2 mt-2 text-4xl">
            Eventos
          </h1>

          <p className="text-white/45">
            Conheça as próximas experiências BMClub.
          </p>
        </div>

        {admin && (
          <button
            type="button"
            onClick={novoEvento}
            className="flex items-center gap-2 rounded-xl bg-[#DBB13F] px-6 py-3 font-semibold text-black transition hover:bg-[#D8BC7A]"
          >
            <Plus size={20} />
            NOVO EVENTO
          </button>
        )}
      </div>

      {aviso && (
        <div className="mb-6 flex justify-between gap-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <p className="text-sm text-green-400">
            ✓ {aviso}
          </p>

          <button
            type="button"
            onClick={() => setAviso('')}
            className="text-white/50"
          >
            ✕
          </button>
        </div>
      )}

      {loading && (
        <Card>
          <p className="text-white/50">
            Carregando eventos...
          </p>
        </Card>
      )}

      {erro && (
        <Card>
          <p className="text-red-400">
            {erro}
          </p>

          <button
            type="button"
            onClick={() => {
              setErro('');
              void carregarEventos();
            }}
            className="mt-5 rounded-xl border border-[#DBB13F] px-5 py-3 text-[#DBB13F]"
          >
            TENTAR NOVAMENTE
          </button>
        </Card>
      )}

      {!loading &&
        !erro &&
        eventos.length === 0 && (
          <Card>
            <p className="gold text-xs">
              EVENTOS
            </p>

            <h2 className="mt-3 text-xl">
              Nenhum evento disponível
            </h2>

            <p className="mt-2 text-white/45">
              No momento não existem eventos cadastrados.
            </p>

            {admin && (
              <button
                type="button"
                onClick={novoEvento}
                className="mt-5 rounded-xl border border-[#DBB13F]/50 px-5 py-3 text-[#DBB13F]"
              >
                CADASTRAR PRIMEIRO EVENTO
              </button>
            )}
          </Card>
        )}

      {!loading &&
        !erro &&
        eventos.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-2">
            {eventos.map((evento) => (
              <Card key={evento.id}>
                {evento.coverUrl && (
                  <div className="mb-5 overflow-hidden rounded-xl border border-white/10">
                    <img
                      src={evento.coverUrl}
                      alt={evento.title}
                      className="h-52 w-full object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <p className="gold text-xs tracking-[.2em]">
                    EVENTO BMCLUB
                  </p>

                  {admin && (
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] ${evento.status === 'PUBLISHED'
                          ? 'border-green-500/30 text-green-400'
                          : evento.status === 'DRAFT'
                            ? 'border-yellow-500/30 text-yellow-400'
                            : 'border-white/20 text-white/40'
                        }`}
                    >
                      {statusTexto(evento.status)}
                    </span>
                  )}
                </div>

                <h2 className="mt-3 text-2xl">
                  {evento.title}
                </h2>

                {evento.description && (
                  <p className="mt-3 text-white/45">
                    {evento.description}
                  </p>
                )}

                <div className="mt-6 space-y-3 text-sm">
                  {evento.location && (
                    <p>
                      <span className="text-white/35">
                        Local
                      </span>

                      <span className="mt-1 block text-white/80">
                        {evento.location}
                      </span>
                    </p>
                  )}

                  <p>
                    <span className="text-white/35">
                      Data
                    </span>

                    <span className="mt-1 block capitalize text-white/80">
                      {formatarData(evento.startsAt)}
                    </span>
                  </p>

                  <p>
                    <span className="text-white/35">
                      Horário
                    </span>

                    <span className="mt-1 block text-white/80">
                      {formatarHora(evento.startsAt)} às{' '}
                      {formatarHora(evento.endsAt)}
                    </span>
                  </p>

                  {evento.seatsAvailable != null && (
                    <p>
                      <span className="text-white/35">
                        Vagas disponíveis
                      </span>

                      <span className="mt-1 block text-white/80">
                        {evento.seatsAvailable}
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {evento.status === 'PUBLISHED' && (
                    <Link
                      href={`/eventos/disponibilidade/${evento.id}`}
                      className="inline-block rounded-xl border border-[#DBB13F] px-5 py-3 text-sm text-[#DBB13F] transition hover:bg-[#DBB13F] hover:text-black"
                    >
                      VER DISPONIBILIDADE
                    </Link>
                  )}

                  {admin && (
                    <button
                      type="button"
                      onClick={() => editarEvento(evento)}
                      disabled={
                        excluindoId === evento.id
                      }
                      className="flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm text-white/80 transition hover:border-[#DBB13F] hover:text-[#DBB13F] disabled:opacity-40"
                    >
                      <Pencil size={15} />
                      EDITAR EVENTO
                    </button>
                  )}

                  {admin &&
                    evento.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        onClick={() =>
                          void excluirEvento(evento)
                        }
                        disabled={excluindoId !== null}
                        className="flex items-center gap-2 rounded-xl border border-red-500/40 px-5 py-3 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                        {excluindoId === evento.id
                          ? 'EXCLUINDO...'
                          : 'EXCLUIR EVENTO'}
                      </button>
                    )}

                  {/* NOVO BOTÃO: EXPORTAÇÃO EXCEL */}
                  {admin && (
                    <button
                      type="button"
                      onClick={() =>
                        void exportarConfirmados(evento)
                      }
                      disabled={exportandoId !== null}
                      className="flex items-center gap-2 rounded-xl border border-[#DBB13F]/60 bg-[#DBB13F]/10 px-5 py-3 text-sm font-medium text-[#DBB13F] transition hover:bg-[#DBB13F]/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {exportandoId === evento.id ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <Download size={16} />
                      )}

                      {exportandoId === evento.id
                        ? 'EXPORTANDO...'
                        : 'EXPORTAR CONFIRMADOS'}
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

      {modalAberto && admin && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6"
          onClick={fecharModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              eventoEditando
                ? 'Editar evento'
                : 'Cadastrar evento'
            }
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#DBB13F]/35 bg-[#111111] p-5 shadow-2xl sm:p-8"
          >
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="gold text-xs tracking-[.2em]">
                  ADMINISTRAÇÃO BMCLUB
                </p>

                <h2 className="mt-2 text-2xl">
                  {eventoEditando
                    ? 'Editar evento'
                    : 'Novo evento'}
                </h2>

                <p className="mt-2 text-sm text-white/40">
                  Preencha as informações da experiência.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                aria-label="Fechar"
                className="text-2xl text-white/50 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="text-sm text-white/50">
                  Nome do evento *
                </span>

                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    atualizarCampo(
                      'title',
                      e.target.value
                    )
                  }
                  placeholder="Ex.: Experiência Atmos Club"
                  className={campoClasse}
                />
              </label>

              <label className="block">
                <span className="text-sm text-white/50">
                  Descrição
                </span>

                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    atualizarCampo(
                      'description',
                      e.target.value
                    )
                  }
                  placeholder="Descreva a experiência..."
                  className={`${campoClasse} resize-none`}
                />
              </label>

              <label className="block">
                <span className="text-sm text-white/50">
                  Local *
                </span>

                <input
                  type="text"
                  value={form.location}
                  onChange={(e) =>
                    atualizarCampo(
                      'location',
                      e.target.value
                    )
                  }
                  placeholder="Ex.: Atmos Club — São Paulo"
                  className={campoClasse}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-sm text-white/50">
                    Data *
                  </span>

                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) =>
                      atualizarCampo(
                        'data',
                        e.target.value
                      )
                    }
                    className={campoClasse}
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-white/50">
                    Início *
                  </span>

                  <input
                    type="time"
                    value={form.inicio}
                    onChange={(e) =>
                      atualizarCampo(
                        'inicio',
                        e.target.value
                      )
                    }
                    className={campoClasse}
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-white/50">
                    Término *
                  </span>

                  <input
                    type="time"
                    value={form.fim}
                    onChange={(e) =>
                      atualizarCampo(
                        'fim',
                        e.target.value
                      )
                    }
                    className={campoClasse}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-white/50">
                    Capacidade *
                  </span>

                  <input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) =>
                      atualizarCampo(
                        'capacity',
                        e.target.value
                      )
                    }
                    className={campoClasse}
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-white/50">
                    Status
                  </span>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      atualizarCampo(
                        'status',
                        e.target
                          .value as StatusEvento
                      )
                    }
                    className={campoClasse}
                  >
                    <option value="PUBLISHED">
                      Publicado
                    </option>
                    <option value="DRAFT">
                      Rascunho
                    </option>
                    <option value="CANCELLED">
                      Cancelado
                    </option>
                    <option value="FINISHED">
                      Finalizado
                    </option>
                  </select>
                </label>
              </div>

              <div>
                <p className="mb-3 text-sm text-white/50">
                  Foto do evento
                </p>

                {fotoPreview && (
                  <div className="mb-4 overflow-hidden rounded-xl border border-white/10">
                    <img
                      src={fotoPreview}
                      alt="Pré-visualização da foto"
                      className="h-48 w-full object-cover"
                    />
                  </div>
                )}

                <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-[#DBB13F]/40 p-5 transition hover:bg-[#DBB13F]/5">
                  <span className="text-sm text-[#DBB13F]">
                    + SELECIONAR FOTO
                  </span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) =>
                      selecionarFoto(
                        e.target.files?.[0]
                      )
                    }
                  />
                </label>

                <p className="mt-2 text-xs text-white/30">
                  JPG, PNG ou WebP. Máximo de 5 MB.
                </p>

                <label className="mt-4 block">
                  <span className="text-xs text-white/40">
                    Ou informe a URL da imagem
                  </span>

                  <input
                    type="url"
                    value={form.coverUrl}
                    onChange={(e) => {
                      atualizarCampo(
                        'coverUrl',
                        e.target.value
                      );
                      setFotoArquivo(null);
                    }}
                    placeholder="https://..."
                    className={`${campoClasse} text-sm`}
                  />
                </label>
              </div>
            </div>

            {erroFormulario && (
              <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-sm text-red-400">
                  {erroFormulario}
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                className="rounded-xl border border-white/20 px-6 py-3 text-white/70 disabled:opacity-40"
              >
                CANCELAR
              </button>

              <button
                type="button"
                onClick={() =>
                  void salvarEvento()
                }
                disabled={salvando}
                className="rounded-xl bg-[#DBB13F] px-7 py-3 font-semibold text-black transition hover:bg-[#D8BC7A] disabled:opacity-40"
              >
                {salvando
                  ? 'SALVANDO...'
                  : eventoEditando
                    ? 'SALVAR ALTERAÇÕES'
                    : 'CADASTRAR EVENTO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
