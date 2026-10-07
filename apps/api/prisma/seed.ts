import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do BMClub...');

  const passwordHash = await argon2.hash('BMClub@2026');

  const admin = await prisma.user.upsert({
    where: {
      email: 'admin@bmclub.com.br',
    },

    update: {
      name: 'Administrador BMClub',
      passwordHash,
      role: 'ADMIN',
    },

    create: {
      name: 'Administrador BMClub',
      email: 'admin@bmclub.com.br',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('✅ Administrador criado/atualizado');
  console.log('');
  console.log('--------------------------------');
  console.log('BMClub Brasil - Acesso inicial');
  console.log('--------------------------------');
  console.log(`ID:     ${admin.id}`);
  console.log(`Nome:   ${admin.name}`);
  console.log(`E-mail: ${admin.email}`);
  console.log(`Perfil: ${admin.role}`);
  console.log('--------------------------------');
}

main()
  .catch((error) => {
    console.error('❌ Erro ao executar seed:');
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });