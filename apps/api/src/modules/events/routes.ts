import { Router } from 'express'
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';
export const eventsRouter = Router();

eventsRouter.get('/dashboard', requireAuth, async (_req, res) => res.json(await prisma.event.findMany({ where: { status: 'PUBLISHED' }, orderBy: { startsAt: 'asc' } })));
eventsRouter.post('/:id/register', requireAuth, async (req, res) => {
    const event = await prisma.event.findUnique({ where: { id: req.params.id }, include: { registrations: { where: { status: 'CONFIRMED' } } } });
    if (!event) return res.status(404).json({ message: 'Evento não encontrado' }); const used = event.registrations.reduce((a, r) => a + r.seats, 0);
    if (used >= event.capacity) return res.status(409).json({ message: 'Evento lotado' }); const registration = await prisma.eventRegistration.upsert({ where: { eventId_userId: { eventId: event.id, userId: req.auth!.sub } }, update: { status: 'CONFIRMED' }, create: { eventId: event.id, userId: req.auth!.sub } }); res.status(201).json(registration)
});
