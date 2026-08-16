# DashyLife

> **Personal Life Management System** — *Gerenciador de vida pessoal*

DashyLife is a personal life management application designed to unify different aspects of daily life into a single, cohesive workspace. From managing tasks and tracking games to organizing health and finances, DashyLife brings order to the chaos of everyday life.

---

## Methodology: Vibe Coding

This project is a strictly personal project built **100% using the "vibe coding" methodology** within the **opencode** development context.

Vibe coding refers to a development approach where the developer collaborates closely with AI models — describing intent, reviewing generated code, iterating rapidly, and letting the AI handle much of the implementation detail. This project serves as both a **practical tool** and a **technical experiment** in human-AI collaborative development.

---

## Project Objectives

DashyLife has a dual purpose:

1. **Practical Utility:** Create a functional, usable system for personal daily organization that grows alongside real needs.
2. **Technical Experimentation:** Serve as a testing ground for vibe coding workflows and local AI model integration, exploring how far AI-assisted development can go.

---

## AI Models Used

During development, the following AI models were utilized:

| Model                            | Usage                                                                       |
| -------------------------------- | --------------------------------------------------------------------------- |
| **Qwen 3.6 35B A3B (IQ3_S)**     | Primary model — runs locally on the developer's machine (RX 580 + 16GB RAM) |
| **Nemotron 3 Ultra (free tier)** | Secondary model — used occasionally via OpenRouter                          |

---

## Current Features

### To-Do List

Task management with support for:

- Task repetition (daily, weekly, custom intervals)
- Due dates and priority levels
- Dynamic home dashboard showing tasks at a glance

### GameList

Personal game library manager featuring:

- Custom platform support
- Status tracking (playing, completed, backlog, etc.)
- Filtering and search
- JSON import/export functionality

### Module Management

- Dynamically toggle individual services on/off
- Lightweight modular architecture — only load what you need

---

## Tech Stack

| Layer                | Technology                     |
| -------------------- | ------------------------------ |
| **Framework**        | React 19, Expo (React Native)  |
| **Build Tools**      | Vite 6, Turborepo              |
| **Styling**          | TailwindCSS v4                 |
| **Runtime**          | Node.js 20+                    |
| **API**              | Fastify 5 (with @fastify/cors) |
| **Database**         | SQLite (better-sqlite3)        |
| **Validation**       | Zod v4                         |
| **Containerization** | Docker + Nginx                 |
| **Package Manager**  | pnpm (workspaces)              |
| **Language**         | TypeScript 5.9                 |
| **Icons**            | Lucide React                   |

---

## Project Structure

```
dashylife/
├── apps/
│   ├── web/          # Web application (React + Vite)
│   └── mobile/       # Mobile application (Expo + React Native)
├── packages/
│   ├── api/          # Backend API (Fastify + SQLite)
│   └── shared/       # Shared types, schemas, and utilities
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── nginx.conf
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **pnpm** 9 or higher
- **Docker** and **docker-compose** (optional, for containerized deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/yuri4417/dashylife.git
cd dashylife

# Install all dependencies across the monorepo
pnpm install
```

### Running Locally (Development)

```bash
# Start all services (API, Web, Mobile) in development mode
pnpm run dev
```

This will start:

- **API** — `http://localhost:3000`
- **Web** — `http://localhost:5173` (Vite dev server)
- **Mobile** — Expo development server for iOS/Android

### Running Individual Services

```bash
# Start the API server
cd apps/api
pnpm run dev

# Start the web app
cd apps/web
pnpm run dev

# Start the mobile app
cd apps/mobile
pnpm run dev
```

---

## Docker Deployment

DashyLife can be deployed as a complete stack using Docker Compose, ideal for any Linux server.

```bash
# Build and start all services
docker-compose up -d --build

# Or, from the docker directory
cd docker
docker-compose up -d
```

This deploys:

- **API** on port `3000` (with persistent SQLite data via `./data`)
- **Web** on port `80` (served through Nginx)

To stop:

```bash
docker-compose down
```

---

## 📝 Scripts

| Command          | Description                            |
| ---------------- | -------------------------------------- |
| `pnpm dev`       | Start all services in development mode |
| `pnpm build`     | Build all packages and apps            |
| `pnpm lint`      | Lint all packages                      |
| `pnpm format`    | Format all files with Prettier         |
| `pnpm typecheck` | Type-check all packages                |

---