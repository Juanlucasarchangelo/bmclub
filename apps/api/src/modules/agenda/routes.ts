import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';

export const agendaRouter = Router();
agendaRouter.use(requireAuth);

agendaRouter.get('/mine', async (req, res) => {
  const query = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }).safeParse(req.query);
  if (!query.success) return res.status(400).json({ message: 'Período inválido' });
  const range = query.data.from || query.data.to ? { gte: query.data.from, lte: query.data.to } : undefined;

  const [reservations, registrations] = await Promise.all([
    prisma.reservation.findMany({
      where: { userId: req.auth!.sub, status: { not: 'CANCELLED' }, ...(range ? { startsAt: range } : {}) },
      include: { space: true }, orderBy: { startsAt: 'asc' }
    }),
    prisma.eventRegistration.findMany({
      where: { userId: req.auth!.sub, status: { not: 'CANCELLED' }, ...(range ? { event: { startsAt: range } } : {}) },
      include: { event: true, guests: true }, orderBy: { event: { startsAt: 'asc' } }
    })
  ]);

  const items = [
    ...reservations.map(r => ({ type: 'RESERVATION', id: r.id, title: r.space.name, startsAt: r.startsAt, endsAt: r.endsAt, status: r.status, data: r })),
    ...registrations.map(r => ({ type: 'EVENT', id: r.id, title: r.event.title, startsAt: r.event.startsAt, endsAt: r.event.endsAt, status: r.status, data: r }))
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  res.json(items);
});
