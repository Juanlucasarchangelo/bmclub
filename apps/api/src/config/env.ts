
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
}).parse(process.env);
