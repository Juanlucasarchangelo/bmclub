
<div align="center">
  <img src="https://media.giphy.com/media/Ll22OhMLAlVDb8UQWe/giphy.gif" width="120"/>
  <h1>📅 BMClub Brasil</h1>
  <p>Plataforma de gerenciamento de eventos, reservas e experiências exclusivas para membros e empresas.</p>

  <a href="https://www.instagram.com/juanarchangelo/" target="_blank" rel="noopener noreferrer">
    <img src="https://img.shields.io/static/v1?message=Instagram&logo=instagram&label=&color=E4405F&logoColor=white&style=for-the-badge" height="35" alt="instagram logo"/>
  </a>
</div>

---

## 📖 Visão Geral

O **BMClub Brasil** é uma plataforma web responsiva desenvolvida para centralizar e organizar **eventos, reservas de ambientes e experiências exclusivas para membros e empresas**.

O sistema permite consultar eventos, confirmar presenças, reservar ambientes do **ATMOS**, acompanhar reservas e realizar cancelamentos quando permitido.

Possui também um **painel administrativo** para gerenciamento de usuários, empresas, eventos, ambientes e reservas.

A identidade visual utiliza principalmente **preto e dourado**, com branco e roxo como cores complementares.

---

## 🎯 Objetivos

- Gerenciar membros e empresas participantes do BMClub.
- Disponibilizar eventos e experiências exclusivas.
- Permitir inscrições e cancelamentos em eventos.
- Gerenciar reservas dos ambientes do ATMOS.
- Evitar conflitos de horários entre reservas.
- Controlar períodos de indisponibilidade dos ambientes.
- Disponibilizar painel administrativo.
- Exportar participantes confirmados para Excel.
- Garantir autenticação e controle de acesso por perfis.
- Oferecer uma experiência responsiva para desktop e mobile.

---

## 🚀 Tecnologias Utilizadas

<div align="left">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg" height="30" alt="Next.js"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" height="30" alt="React"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" height="30" alt="TypeScript"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" height="30" alt="Node.js"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" height="30" alt="Express"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg" height="30" alt="MySQL"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prisma/prisma-original.svg" height="30" alt="Prisma"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" height="30" alt="Tailwind CSS"/>
</div>

---

## 🚀 Funcionalidades

- [x] Autenticação de usuários.
- [x] Login com e-mail e senha.
- [x] Logout.
- [x] Controle de acesso por perfis:
  - Membro.
  - Empresa.
  - Administrador.
- [x] Meu Perfil:
  - Nome e e-mail.
  - CPF e telefone.
  - Restrições alimentares.
  - Alteração de senha.
- [x] Cadastro e gerenciamento de eventos.
- [x] Consulta de eventos disponíveis.
- [x] Confirmação de presença em eventos.
- [x] Controle de capacidade e vagas disponíveis.
- [x] Exportação Excel de participantes confirmados.
- [ ] Recuperação de senha.
- [ ] Cadastro e gerenciamento completo de membros e empresas.
- [ ] Cancelamento de inscrições quando permitido.
- [ ] Gerenciamento completo dos ambientes do ATMOS.
- [ ] Reserva e cancelamento de ambientes.
- [ ] Validação automática de conflitos de horários.
- [ ] Bloqueio administrativo de períodos e ambientes.
- [ ] Dashboard administrativo completo.

---

## 🏗 Arquitetura do Sistema

```mermaid
flowchart TD
    A["Frontend - Next.js / React"] --> B["Backend/API - Node.js / Express"]
    B --> C["Prisma ORM"]
    C --> D["Banco de Dados - MySQL"]
    A --> E["Autenticacao JWT"]
    E --> B
    B --> F["Eventos"]
    B --> G["Reservas ATMOS"]
    B --> H["Usuarios e Empresas"]
    B --> I["Painel Administrativo"]
```

---

## 📦 Instalação

### 1. Pré-requisitos

Instale os programas:

- [Node.js](https://nodejs.org/)
- [Git](https://git-scm.com/downloads)
- [MySQL](https://dev.mysql.com/downloads/)
- [VS Code](https://code.visualstudio.com/) (recomendado)

### 2. Baixar o projeto

```bash
git clone <URL_DO_REPOSITORIO>
cd bmclub
```

### 3. Instalar as dependências

```bash
npm install
```

Todas as bibliotecas do frontend e backend serão instaladas automaticamente, incluindo `xlsx` para exportação Excel.

### 4. Configurar as variáveis de ambiente

Configure o arquivo `apps/api/.env` com a conexão MySQL e as demais variáveis exigidas pela API.

Exemplo:

```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/bmclub"
```

Configure o arquivo `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 5. Preparar o banco de dados

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

O seed configura os dados iniciais do sistema.

### 6. Iniciar o projeto

Abra dois terminais na pasta principal.

**Terminal 1 — API:**

```bash
npm run dev -w apps/api
```

**Terminal 2 — Frontend:**

```bash
npm run dev -w apps/web
```

Acesse:

**http://localhost:3000**

### 7. Acesso inicial

Utilize o administrador configurado pelo seed do projeto.

---

<div align="center">
  <strong>BMClub Brasil</strong>
  <p>Experiências exclusivas, gestão inteligente.</p>
</div>
