
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const espacos = [
  {
    name: 'Balcão',
    capacity: 2,
    description: 'Experiência no balcão do Atmos Club.',
  },
  {
    name: 'Mesa',
    capacity: 10,
    description: 'Espaço de mesa para encontros e experiências.',
  },
  {
    name: 'Privado',
    capacity: 30,
    description: 'Ambiente privativo para grupos e experiências.',
  },
];

async function main() {
  for (const espaco of espacos) {
    const existente = await prisma.space.findFirst({
      where: { name: espaco.name },
    });

    if (existente) {
      await prisma.space.update({
        where: { id: existente.id },
        data: {
          capacity: espaco.capacity,
          description: espaco.description,
          active: true,
        },
      });
    } else {
      await prisma.space.create({
        data: {
          ...espaco,
          active: true,
        },
      });
    }

    console.log(
      `OK: ${espaco.name} - ${espaco.capacity} pessoas`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
