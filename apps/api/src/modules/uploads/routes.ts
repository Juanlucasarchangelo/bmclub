
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

import { requireAuth } from '../../middlewares/auth.js';
import { prisma } from '../../lib/prisma.js';

export const uploadsRouter = Router();

export const UPLOADS_DIR = path.resolve(
    process.cwd(),
    'uploads'
);

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const extensoes: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, UPLOADS_DIR);
    },

    filename: (_req, file, callback) => {
        const extensao = extensoes[file.mimetype];

        callback(
            null,
            `${crypto.randomUUID()}${extensao}`
        );
    },
});

const upload = multer({
    storage,

    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },

    fileFilter: (_req, file, callback) => {
        if (!extensoes[file.mimetype]) {
            return callback(
                new Error(
                    'Formato inválido. Utilize JPG, PNG ou WebP.'
                )
            );
        }

        callback(null, true);
    },
});

// Confirma o perfil no banco de dados.
// O token sozinho não autoriza upload administrativo.
async function exigirAdmin(
    req: Parameters<typeof requireAuth>[0],
    res: Parameters<typeof requireAuth>[1],
    next: Parameters<typeof requireAuth>[2]
) {
    try {
        const usuario = await prisma.user.findUnique({
            where: {
                id: req.auth!.sub,
            },
            select: {
                role: true,
            },
        });

        if (usuario?.role !== 'ADMIN') {
            return res.status(403).json({
                message: 'Acesso exclusivo para administradores.',
            });
        }

        next();
    } catch (error) {
        console.error('Erro ao validar ADMIN:', error);

        return res.status(500).json({
            message: 'Erro ao verificar permissões.',
        });
    }
}

uploadsRouter.post(
    '/',
    requireAuth,
    exigirAdmin,
    (req, res) => {
        upload.single('file')(req, res, error => {
            if (error) {
                return res.status(400).json({
                    message:
                        error instanceof multer.MulterError &&
                            error.code === 'LIMIT_FILE_SIZE'
                            ? 'A imagem deve ter no máximo 5 MB.'
                            : error.message || 'Erro no upload.',
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    message: 'Selecione uma imagem.',
                });
            }

            const baseUrl = `${req.protocol}://${req.get('host')}`;

            return res.status(201).json({
                url: `${baseUrl}/uploads/${req.file.filename}`,
                filename: req.file.filename,
            });
        });
    }
);
