import { PrismaClient, UserRole } from '@prisma/client';
import argon2 from 'argon2';
const prisma = new PrismaClient();
const spaces = [
  ['Cinema 165”',12], ['Sala de Reunião',6], ['Home Theater 1',6], ['Home Theater 2',6],
  ['Sala Estéreo 1',4], ['Sala Estéreo 2',4], ['Som Ambiente',20]
] as const;
async function main(){
  for(const [name,capacity] of spaces) await prisma.space.upsert({where:{name},update:{capacity},create:{name,capacity}});
  const passwordHash=await argon2.hash('Admin@BMClub2026');
  await prisma.user.upsert({where:{email:'admin@bmclub.com.br'},update:{},create:{name:'Administrador BMClub',email:'admin@bmclub.com.br',passwordHash,role:UserRole.ADMIN}});
}
main().finally(()=>prisma.$disconnect());
