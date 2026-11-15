#!/usr/bin/env bash
set -Eeuo pipefail

# Synchronize the committed MCP source after the VM's checkout is updated.
repo="${DASHYLIFE_REPO:-$HOME/docker/dashylife}"
base="${DASHYLIFE_TUNNEL_DIR:-$HOME/.local/share/dashylife-tunnel}"
service="${DASHYLIFE_TUNNEL_SERVICE:-dashylife-tunnel.service}"
mkdir -p "$base"
exec 9>"$base/update.lock"
flock -n 9 || exit 0

revision=$(git -C "$repo" rev-parse HEAD)
tree=$(git -C "$repo" rev-parse 'HEAD:dashylife-plugin')
if [[ -f "$base/mcp-tree" ]] && [[ $(cat "$base/mcp-tree") == "$tree" ]] && [[ -f "$base/mcp/server/index.js" ]]; then
  exit 0
fi

stage=$(mktemp -d "$base/.mcp-stage.XXXXXXXX")
cleanup() { [[ ! -d "$stage" ]] || rm -rf -- "$stage"; }
trap cleanup EXIT
git -C "$repo" archive "$revision" dashylife-plugin | tar -x -C "$stage" --strip-components=1
test -f "$stage/server/index.js"
node --check "$stage/server/index.js"
(cd "$stage" && npm install --omit=dev --ignore-scripts --no-audit --no-fund --no-package-lock)
(cd "$stage" && node --input-type=module -e 'await import("@modelcontextprotocol/server"); await import("@modelcontextprotocol/server/stdio"); await import("zod/v4")')

backup="$base/.mcp-previous"
if [[ -e "$backup" ]]; then
  echo "Previous backup exists at $backup; inspect it before retrying." >&2
  exit 1
fi
had_previous=0
if [[ -d "$base/mcp" ]]; then mv "$base/mcp" "$backup"; had_previous=1; fi
mv "$stage" "$base/mcp"
rm -f -- "$base/health.url"
ready=0
if systemctl --user restart "$service"; then
  for ((attempt=0; attempt<30; attempt++)); do
    if [[ -s "$base/health.url" ]] && systemctl --user is-active --quiet "$service" && curl -fsS --max-time 2 "$(cat "$base/health.url")/readyz" >/dev/null; then
      ready=1
      break
    fi
    sleep 1
  done
fi
if (( ready )); then
  printf '%s\n' "$tree" > "$base/mcp-tree.tmp"
  mv "$base/mcp-tree.tmp" "$base/mcp-tree"
  if (( had_previous )); then rm -rf -- "$backup"; fi
  echo "MCP updated from commit $revision (tree $tree)."
else
  echo "Tunnel failed to start; restoring the previous MCP." >&2
  mv "$base/mcp" "$stage"
  if (( had_previous )); then mv "$backup" "$base/mcp"; systemctl --user restart "$service" || true; fi
  exit 1
fi
