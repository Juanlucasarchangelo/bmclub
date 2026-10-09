
import { PrismaClient } from '@prisma/client';

export async function seedAtmos(prisma: PrismaClient) {
  const espacos = [
    {
      name: 'Balcão',
      capacity: 2,
      description: 'Experiência no balcão do Atmos Club.'
    },
    {
      name: 'Mesa',
      capacity: 10,
      description: 'Espaço de mesa para encontros e experiências.'
    },
    {
      name: 'Privado',
      capacity: 30,
      description: 'Ambiente privativo para grupos e experiências.'
    }
  ];

  console.log('\n🌱 Seed Atmos Club...');

  for (const espaco of espacos) {
    const existente = await prisma.space.findFirst({
      where: { name: espaco.name }
    });

    if (existente) {
      await prisma.space.update({
        where: { id: existente.id },
        data: {
          capacity: espaco.capacity,
          description: espaco.description,
          active: true
        }
      });

      console.log(`✅ Atualizado: ${espaco.name}`);
    } else {
      await prisma.space.create({
        data: {
          ...espaco,
          active: true
        }
      });

      console.log(`✅ Criado: ${espaco.name}`);
    }
  }

  console.log('✅ Atmos Club concluído.');
}
