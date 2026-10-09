
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

import { seedBMClub } from './seed';
import { seedAtmos } from './seed-atmos';

const prisma = new PrismaClient();

async function main() {
  console.log('\n===================================');
  console.log('      BMCLUB BRASIL - SEED');
  console.log('===================================');

  await seedBMClub(prisma);
  await seedAtmos(prisma);

  console.log('\n===================================');
  console.log('  SEEDS EXECUTADOS COM SUCESSO');
  console.log('===================================');
}

main()
  .catch((error) => {
    console.error('\n❌ Erro ao executar seeds:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
