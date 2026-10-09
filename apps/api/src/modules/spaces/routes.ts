
import { Router } from 'express';
import { z } from 'zod';
import { SpaceCategory } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';

export const spacesRouter = Router();

const filtrosSchema = z.object({
    category: z.nativeEnum(SpaceCategory).optional(),
});

spacesRouter.get('/', requireAuth, async (req, res) => {
    const entrada = filtrosSchema.safeParse(req.query);

    if (!entrada.success) {
        return res.status(400).json({
            message: 'Categoria inválida. Utilize ATMOS ou SALA.',
        });
    }

    try {
        const espacos = await prisma.space.findMany({
            where: {
                active: true,
                ...(entrada.data.category
                    ? { category: entrada.data.category }
                    : {}),
            },
            orderBy: {
                name: 'asc',
            },
        });

        return res.json(espacos);
    } catch (error) {
        console.error('Erro ao listar espaços:', error);

        return res.status(500).json({
            message: 'Não foi possível carregar os espaços.',
        });
    }
});
