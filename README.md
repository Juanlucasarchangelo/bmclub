<div align="center">
  <img src="https://media.giphy.com/media/Ll22OhMLAlVDb8UQWe/giphy.gif" width="120"/>
  <h1>📅 BMClub Brasil</h1>
  <p>Plataforma de gerenciamento de eventos, reservas e experiências exclusivas para membros e empresas.</p>

  <a href="https://www.instagram.com/juanarchangelo/" target="_blank" rel="noopener noreferrer">
    <img src="https://img.shields.io/static/v1?message=Instagram&logo=instagram&label=&color=E4405F&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="instagram logo"/>
  </a>
</div>

---

## 📖 Visão Geral

O **BMClub Brasil** é uma plataforma web responsiva desenvolvida para centralizar e organizar **eventos, reservas de ambientes e experiências exclusivas para membros e empresas**.

O sistema permite que membros e empresas consultem eventos disponíveis, realizem inscrições, reservem ambientes do **ATMOS**, acompanhem suas reservas e efetuem cancelamentos quando permitido.

Além da experiência destinada aos membros, a plataforma possui um **painel administrativo** para gerenciamento de usuários, empresas, eventos, ambientes, reservas e períodos bloqueados.

A identidade visual do sistema segue o conceito premium do BMClub, utilizando principalmente **preto e dourado**, com branco e roxo como cores complementares.

---

## 🎯 Objetivos

- Gerenciar membros e empresas participantes do BMClub.
- Disponibilizar eventos e experiências exclusivas.
- Permitir inscrições e cancelamentos em eventos.
- Gerenciar reservas dos ambientes do ATMOS.
- Evitar conflitos de horários entre reservas.
- Controlar períodos em que determinados ambientes estejam indisponíveis.
- Permitir que usuários acompanhem suas próprias reservas.
- Disponibilizar um painel administrativo para gerenciamento da plataforma.
- Garantir segurança através de autenticação e controle de acesso baseado em perfis.
- Oferecer uma experiência responsiva para desktop, tablet e dispositivos móveis.

## 🚀 Tecnologias Utilizadas

<div align="left">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg" height="30" alt="Next.js logo" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" height="30" alt="React logo" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" height="30" alt="TypeScript logo" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" height="30" alt="Node.js logo" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" height="30" alt="Express logo" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg" height="30" alt="MySQL logo" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prisma/prisma-original.svg" height="30" alt="Prisma logo" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" height="30" alt="Tailwind CSS logo" />
</div>

---

## 🚀 Funcionalidades

- [ ] Autenticação de usuários.
- [ ] Login com e-mail e senha.
- [ ] Recuperação de senha.
- [ ] Manter usuário conectado.
- [ ] Logout.
- [ ] Controle de acesso baseado em perfis:
    - Membro.
    - Empresa.
    - Administrador.
- [ ] Cadastro e gerenciamento de membros.
- [ ] Cadastro e gerenciamento de empresas.
- [ ] Cadastro e gerenciamento de eventos.
- [ ] Consulta de eventos disponíveis.
- [ ] Inscrição de membros e empresas em eventos.
- [ ] Consulta das inscrições realizadas.
- [ ] Cancelamento de inscrições quando permitido.
- [ ] Gerenciamento dos ambientes do ATMOS.
- [ ] Reserva de ambientes.
- [ ] Consulta das reservas realizadas.
- [ ] Cancelamento de reservas quando permitido.
- [ ] Validação automática de conflitos de horários.
- [ ] Bloqueio administrativo de períodos e ambientes.
- [ ] Painel administrativo para gerenciamento do sistema.
- [ ] Dashboard responsivo para desktop e mobile.

---

## 🏗 Arquitetura do Sistema

```mermaid
flowchart TD
    A["Frontend - Next.js / React"] --> B["Backend/API - Node.js / Express"]
    B --> C["Banco de Dados - MySQL"]
    B --> D["Prisma ORM"]
    D --> C
    A --> E["Autenticacao e Autorizacao - JWT"]
    E --> B
    B --> F["Eventos"]
    B --> G["Reservas ATMOS"]
    B --> H["Usuarios e Empresas"]
    B --> I["Painel Administrativo"]
```

---

## 📦 Instalação

```bash
# Clone o repositório
git clone <URL_DO_REPOSITORIO>

# Acesse o diretório
cd bmclub-brasil

# Instale as dependências
npm install

# Configure as variáveis de ambiente
# Edite o arquivo:
apps/api/.env

# Exemplo de conexão com o MySQL
DATABASE_URL="mysql://bmclub:bmclub_dev@localhost:3306/bmclub"

# Gere o Prisma Client
npm run db:generate

# Crie/sincronize as tabelas no MySQL
npm run db:push

# Execute o seed inicial do banco de dados
npm run db:seed

# Inicie o projeto
npm run dev

# Usuário padrão para login
- E-mail: admin@bmclub.com.br
- Senha:  BMClub@2026
```