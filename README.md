# DashyLife

> **Personal Life Management System**

DashyLife is a personal life management application designed to unify different aspects of daily life into a single, cohesive workspace. From managing tasks and tracking games to organizing health and finances, DashyLife brings order to the chaos of everyday life.

---

## Methodology

This project is a strictly personal project built **100% using vibe coding** within the **OpenCode** development agent.
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
| **Qwen 3.6 35B A3B (IQ3_S)**     | Primary model — runs locally on the developer's machine (RX 6750 XT + 16GB RAM) |
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
| **Framework**        | React 19                       |
| **Build Tools**      | Vite 6, Turborepo              |
| **Styling**          | TailwindCSS v4                 |
| **Runtime**          | Node.js 22+                    |
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
│   └── web/          # Web application (React + Vite)
├── packages/
│   ├── api/          # Backend API (Fastify + SQLite)
│   └── shared/       # Shared types, schemas, and utilities
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── nginx.conf
├── dashylife-plugin/ # MCP server and client configuration
├── scripts/          # VM MCP update script and systemd units
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 22 or higher
- **pnpm** 9.0.0, as pinned in `package.json`
- **Docker** and **docker-compose** (optional, for containerized deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/yuri4417/dashylife
cd dashylife

# Install all dependencies across the monorepo
corepack enable
pnpm install --frozen-lockfile
```

### Running Locally (Development)

```bash
# Start all services (API, Web) in development mode
pnpm run dev
```

This will start:

- **API** — `http://localhost:3000`
- **Web** — `http://localhost:5173` (Vite dev server)

### Access from the local network

The Vite dev server binds to all interfaces (`host: true`), so the web app is reachable from other devices (e.g. phones) on the same network. The API already listens on `0.0.0.0:3000`, and `/api` requests are proxied by Vite, so no extra config is needed.

```bash
# Find your machine's LAN IP
hostname -I
```

Then open `http://<LAN-IP>:5173` on the other device (e.g. `http://192.168.1.10:5173`).

### Running Individual Services

```bash
# Start the API server
cd packages/api
pnpm run dev

# Start the web app
cd apps/web
pnpm run dev
```

---

## Docker Deployment

DashyLife can be deployed as a complete stack using Docker Compose, ideal for any Linux server.

```bash
# Build and start all services
docker compose up -d --build

```

This deploys:

- **API** within the Compose network (with persistent SQLite data via `./data`)
- **Web** on host port `8081` (served through Nginx, which proxies `/api`)

To stop:

```bash
docker compose down
```

## MCP and AI clients

DashyLife includes an MCP server that lets a compatible AI client manage tasks
and games. The server uses the official MCP TypeScript SDK and runs as a local
Node.js process over `stdio`. It calls the DashyLife API over HTTP. The MCP can
be used with ChatGPT or another MCP host, including a host using a local model;
the host must be able to start the process and reach the DashyLife API.

The current tools are `list_todos`, `create_todo`, `update_todo`, `delete_todo`,
`list_games`, `create_game`, `update_game`, and `delete_game`. New application
features need corresponding MCP tools and API operations before an AI client
can use them.

### Activation and keys

1. Set a long, random `DASHYLIFE_ADMIN_KEY` in the private `.env` file beside
   `docker-compose.yml`, then recreate the API service. This master key manages
   MCP access; it is distinct from the MCP key.
2. In **Configurações → Acesso MCP**, enter the master key and activate the
   MCP. It is disabled by default. Activation generates an MCP key that is
   displayed only once.
3. Supply that key to the MCP process as `DASHYLIFE_MCP_API_KEY`, and set
   `DASHYLIFE_URL` to the base URL reachable from that process. For a process
   running on the Docker host with the default Compose configuration, the URL
   is `http://127.0.0.1:8081`.
4. If the MCP key is lost, rotate it in Settings and update the client or
   tunnel configuration. Rotation invalidates the old key; disabling MCP
   revokes it. Do not commit keys or include them in plugin archives.

Every request to the dedicated MCP API requires a valid Bearer key while MCP
is enabled. The existing web API endpoints remain separate and are not
protected by this MCP key. The Settings log viewer shows tool names, times,
status, duration, and technical errors for calls that reach the tool handler;
it keeps up to 10,000 entries without recording arguments or keys. Requests
rejected before the handler, such as invalid authentication, are not included
in that action log. Local transport errors are written to `stderr`.

### Local MCP client

Install the plugin dependencies as described in
[dashylife-plugin/README.md](dashylife-plugin/README.md). Configure the MCP host
to launch `node server/index.js` from the `dashylife-plugin` directory, with
the two environment variables above. For a separate machine, use the VM's
reachable address for `DASHYLIFE_URL`. A private LAN address is not directly
reachable by a cloud-hosted client.

### ChatGPT through Secure MCP Tunnel

For remote ChatGPT access, OpenAI's Secure MCP Tunnel can run a client in the
homelab and forward requests to the local `stdio` server. Create a tunnel in
[OpenAI Platform](https://platform.openai.com/settings/organization/tunnels),
associate it with the intended ChatGPT workspace, and run the official
[`tunnel-client`](https://github.com/openai/tunnel-client) on a host that can
reach DashyLife. It needs its own OpenAI runtime key with tunnel Read and Use
permissions, separate from the DashyLife MCP key. Keep both credentials
private and account for their expiration and rotation.

In ChatGPT, add a custom MCP server, select **Túnel**, and select the tunnel.
The current VM setup authenticates from the MCP process to the DashyLife API
using the MCP key. The tunnel client must remain running for discovery and tool
calls. Availability and supported actions depend on the ChatGPT surface and
account; see the [OpenAI tunnel guide](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels).

### Updating the VM MCP

The provided `scripts/update-mcp-vm.sh` and systemd user units can synchronize
the MCP on a VM already configured with a tunnel. The installed timer checks
the committed `dashylife-plugin` tree in `~/docker/dashylife` every minute;
it stages the source in `~/.local/share/dashylife-tunnel`, installs production
dependencies, restarts `dashylife-tunnel.service`, and checks tunnel readiness.
On a failed readiness check it attempts to restore the previous copy. The
updater does not fetch Git changes or deploy the application API, and it does
not wait for the API deployment: coordinate those steps when both change.
Changes to the updater script itself must also be installed on the VM.

After changing tool names, descriptions, parameters, or annotations, open
**Configurações → Plugins → DashyLife Homelab → Atualizar ferramentas** in
ChatGPT and test in a new conversation. The timer does not refresh ChatGPT's
tool list automatically. Check the VM services and logs with:

```bash
systemctl --user status dashylife-mcp-update.timer dashylife-tunnel.service
journalctl --user -u dashylife-mcp-update.service -n 50 --no-pager
journalctl --user -u dashylife-tunnel.service -n 50 --no-pager
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
| `pnpm test`      | Run API and MCP route regression tests |

---
