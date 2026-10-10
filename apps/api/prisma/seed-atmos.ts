
import { PrismaClient } from '@prisma/client';

export async function seedAtmos(prisma: PrismaClient) {
  const espacos = [
    {
      name: 'Balcão',
      category: 'ATMOS',
      capacity: 2,
      description: 'Experiência no balcão do Atmos Club.'
    },
    {
      name: 'Mesa',
      category: 'ATMOS',
      capacity: 10,
      description: 'Espaço de mesa para encontros e experiências.'
    },
    {
      name: 'Privado',
      category: 'ATMOS',
      capacity: 30,
      description: 'Ambiente privativo para grupos e experiências.'
    },
    {
      name: 'Sala 1',
      category: 'SALA',
      capacity: 6,
      description: 'Sala privativa para reuniões e experiências.'
    },
    {
      name: 'Sala 2',
      category: 'SALA',
      capacity: 6,
      description: 'Sala privativa para reuniões e encontros.'
    },
    {
      name: 'Apresentação',
      category: 'SALA',
      capacity: 12,
      description: 'Espaço para apresentações e eventos.'
    },
    {
      name: 'Cinema',
      category: 'SALA',
      capacity: 12,
      description: 'Sala de cinema para experiências audiovisuais.'
    }
  ];

  console.log('\n🌱 Seed Espaços BMClub...');

  for (const espaco of espacos) {
    const existente = await prisma.space.findFirst({
      where: { name: espaco.name }
    });

    if (existente) {
      await prisma.space.update({
        where: { id: existente.id },
        data: {
          category: espaco.category,
          capacity: espaco.capacity,
          description: espaco.description,
          active: true
        }
      });

      console.log(
        `✅ Atualizado: ${espaco.name} (${espaco.category})`
      );
    } else {
      await prisma.space.create({
        data: {
          ...espaco,
          active: true
        }
      });

      console.log(
        `✅ Criado: ${espaco.name} (${espaco.category})`
      );
    }
  }

  console.log('✅ Espaços BMClub concluídos.');
}