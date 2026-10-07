import { Router } from 'express'; import { prisma } from '../../lib/prisma.js'; import { requireAuth } from '../../middlewares/auth.js';
export const spacesRouter=Router(); spacesRouter.get('/',requireAuth,async(_req,res)=>res.json(await prisma.space.findMany({where:{active:true},orderBy:{name:'asc'}})));
