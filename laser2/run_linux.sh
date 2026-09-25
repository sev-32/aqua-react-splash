#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
npm run build
( sleep 1; xdg-open http://127.0.0.1:4173 >/dev/null 2>&1 || true ) &
python3 tools/serve.py
