
import express from 'express';
import cors from 'cors';

import { env } from './config/env.js';

import { authRouter } from './modules/auth/routes.js';
import { eventsRouter } from './modules/events/routes.js';
import { spacesRouter } from './modules/spaces/routes.js';
import { reservationsRouter } from './modules/reservations/routes.js';
import { adminRouter } from './modules/admin/routes.js';
import { atmosRouter } from './modules/atmos/routes.js';

import {
  uploadsRouter,
  UPLOADS_DIR,
} from './modules/uploads/routes.js';

export const app = express();

// ======================================================
// CORS
// ======================================================

const origensPermitidas = [
  'http://localhost:3000',
  'http://192.168.0.87:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (origensPermitidas.includes(origin)) {
        return callback(null, true);
      }

      console.error(
        'Origem bloqueada pelo CORS:',
        origin
      );

      return callback(
        new Error(
          `Origem não permitida pelo CORS: ${origin}`
        )
      );
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  })
);

// ======================================================
// MIDDLEWARES
// ======================================================

app.use(express.json());

// Disponibiliza as imagens enviadas.
// Exemplo:
// http://192.168.0.87:4000/uploads/foto.jpg

app.use(
  '/uploads',
  express.static(UPLOADS_DIR)
);

// ======================================================
// HEALTH
// ======================================================

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    name: 'BMClub Brasil API',
  });
});

// ======================================================
// ROTAS
// ======================================================

app.use('/auth', authRouter);

app.use('/eventos', eventsRouter);

app.use('/spaces', spacesRouter);

app.use('/reservations', reservationsRouter);

app.use('/admin', adminRouter);

app.use('/atmos', atmosRouter);

// Upload de imagens: POST /uploads
app.use('/uploads', uploadsRouter);
