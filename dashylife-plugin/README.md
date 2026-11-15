# DashyLife MCP

Servidor MCP local para consultar e gerenciar tarefas e jogos do DashyLife. Ele usa o SDK oficial de TypeScript e o transporte `stdio`, portanto funciona com clientes MCP compatíveis, inclusive hosts conectados a modelos locais.

## Instalação e configuração

1. Na VM, defina `DASHYLIFE_ADMIN_KEY` em um arquivo `.env` ao lado do `docker-compose.yml`. Use uma chave administrativa longa e aleatória e mantenha esse arquivo privado.
2. Recrie o serviço da API. A chave mestre autoriza o painel de gerenciamento; ela nunca é usada como chave do MCP.
3. Na aba **Configurações**, conecte-se com a chave mestre e ative o MCP. Copie a chave MCP gerada; ela é exibida uma única vez.
4. Configure a chave MCP como `DASHYLIFE_MCP_API_KEY` no cliente MCP. Defina também `DASHYLIFE_URL` com o endereço do seu servidor DashyLife.
5. Instale as dependências neste diretório com `pnpm install --ignore-workspace` e configure o cliente para iniciar `node server/index.js` com este diretório como `cwd`.

O processo MCP precisa rodar no homelab ou em uma máquina com rota até o IP local da VM. Um processo MCP na nuvem não alcança diretamente endereços privados da LAN.

## Ferramentas

`list_todos`, `create_todo`, `update_todo`, `delete_todo`, `list_games`, `create_game`, `update_game` e `delete_game`.

Ativar o MCP sempre exige a chave MCP em chamadas de ferramenta. Desativá-lo na aba Configurações revoga a chave e bloqueia suas rotas. As chamadas ficam registradas no visualizador de logs da mesma aba; os últimos 10.000 registros são mantidos, sem conteúdo de tarefas/jogos ou credenciais.

Para depurar falhas locais de conexão, consulte o `stderr` do processo MCP. O canal `stdout` fica reservado ao protocolo MCP.
