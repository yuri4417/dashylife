# DashyLife plugin

Plugin MCP local para consultar e editar tarefas e jogos via API HTTP do DashyLife.

## Configuração

1. Instale o plugin no cliente que executará o MCP local.
2. Edite `mcp.json`: substitua `http://192.168.1.10:8081` pela URL do DashyLife na sua LAN (no Compose atual, porta `8081`).
3. O processo MCP deve rodar no próprio homelab ou em uma máquina com rota até esse IP. Um MCP remoto na nuvem não consegue acessar um IP privado diretamente.
4. Reinicie/recarregue o cliente.

Variáveis: `DASHYLIFE_URL` (obrigatória) e `DASHYLIFE_API_KEY` (opcional). Configure a mesma chave no serviço DashyLife e no MCP; o MCP envia `Authorization: Bearer <chave>`.

## Ferramentas

`list_todos`, `create_todo`, `update_todo`, `delete_todo`, `list_games`, `create_game`, `update_game`, `delete_game`.

A API atual não exige autenticação. Restrinja a porta 8081 à LAN e use uma camada de autenticação/reverse proxy antes de expor o serviço fora dela.
