export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bmclub_access') : null;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('bmclub_access'); localStorage.removeItem('bmclub_user');
    }
    throw new ApiError(body.message || 'Erro ao comunicar com a API.', res.status);
  }
  return body as T;
}

export type Space = { id:string; name:string; description?:string|null; capacity:number; active:boolean };
export type Reservation = { id:string; startsAt:string; endsAt:string; guests:number; notes?:string|null; status:'PENDING'|'CONFIRMED'|'CANCELLED'; space:Space };
export type EventItem = { id:string; title:string; description?:string|null; coverUrl?:string|null; location?:string|null; startsAt:string; endsAt:string; capacity:number; status:string; seatsUsed:number; seatsAvailable:number };
export type AgendaItem = { type:'RESERVATION'|'EVENT'; id:string; title:string; startsAt:string; endsAt:string; status:string; data:any };
export type Availability = { date:string; space:Space; reservations:Array<{id:string;startsAt:string;endsAt:string;status:string}>; blockedPeriods:Array<{id:string;startsAt:string;endsAt:string;reason?:string|null}> };

export const dateBR = (iso:string) => new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(iso)).replace('.','');
export const timeBR = (iso:string) => new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(iso));
export const dateTimeBR = (iso:string) => `${dateBR(iso)} · ${timeBR(iso)}`;
