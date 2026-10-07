import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAuth,requireRole } from '../../middlewares/auth.js';
export const adminRouter=Router(); adminRouter.use(requireAuth,requireRole('ADMIN'));

adminRouter.get('/dashboard',async(_req,res)=>{const [users,events,reservations]=await Promise.all([prisma.user.count(),prisma.event.count(),prisma.reservation.count({where:{status:'CONFIRMED'}})]);res.json({users,events,reservations})});
adminRouter.post('/events',async(req,res)=>{const p=z.object({title:z.string().min(2),description:z.string().optional(),location:z.string().optional(),startsAt:z.coerce.date(),endsAt:z.coerce.date(),capacity:z.number().int().positive()}).parse(req.body);res.status(201).json(await prisma.event.create({data:{...p,status:'PUBLISHED'}}))});
