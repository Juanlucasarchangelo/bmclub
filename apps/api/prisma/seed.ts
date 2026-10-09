
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

export async function seedBMClub(prisma: PrismaClient) {
  const email = 'admin@bmclub.com.br';
  const senha =
    process.env.SEED_ADMIN_PASSWORD || 'BMClub@2026';

  console.log('\n🌱 Seed BMClub...');

  const existente = await prisma.user.findUnique({
    where: { email }
  });

  if (existente) {
    await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' }
    });

    const valida = await argon2.verify(
      existente.passwordHash,
      senha
    );

    console.log('✅ Administrador já existe.');
    console.log(
      valida
        ? '✅ Senha inicial validada.'
        : '⚠️ Senha atual diferente da senha inicial.'
    );

    return;
  }

  const passwordHash = await argon2.hash(senha);

  const admin = await prisma.user.create({
    data: {
      name: 'Administrador BMClub',
      email,
      passwordHash,
      role: 'ADMIN'
    }
  });

  const valida = await argon2.verify(
    admin.passwordHash,
    senha
  );

  if (!valida) {
    throw new Error(
      'Falha ao validar a senha inicial do administrador.'
    );
  }

  console.log(`✅ Administrador criado: ${admin.email}`);
  console.log('✅ Senha inicial validada com Argon2.');
}
