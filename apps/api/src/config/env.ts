
import 'dotenv/config';
import { z } from 'zod';

export const env = z.object({
    DATABASE_URL: z.string(),

    JWT_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),

    PORT: z.coerce.number().default(4000),
    WEB_URL: z.string().default('http://localhost:3000'),
    CORS_ORIGINS: z.string().default('http://localhost:3000'),

    API_HOST: z.string().default('0.0.0.0'),
    API_PUBLIC_HOST: z.string().default('localhost'),

    // Integração privada BMClub → n8n
    N8N_BMCLUB_WEBHOOK_URL: z.string().url().optional(),
    N8N_BMCLUB_SECRET: z.string().min(12).optional(),

    // Integração privada n8n → BMClub
    BMCLUB_CALLBACK_SECRET: z.string().min(20).optional(),

    // Integração privada BMClub → Evolution API
    EVOLUTION_API_URL: z.string().url(),
    EVOLUTION_API_KEY: z.string().min(16),
    EVOLUTION_INSTANCE: z.string().min(1),
}).parse(process.env);
