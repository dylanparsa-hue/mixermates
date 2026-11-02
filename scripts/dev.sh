#!/bin/zsh
set -euo pipefail
cd "${0:A:h:h}"
# Codex desktop ships Node separately. Prefer a normal local installation.
if ! command -v node >/dev/null 2>&1; then
  runtime_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
  export PATH="$runtime_node:$PATH"
fi
if [[ ! -d node_modules ]]; then
  print 'Install dependencies first with pnpm install (see README.md).'
  exit 1
fi
exec node node_modules/next/dist/bin/next dev --hostname 0.0.0.0
