#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
printf 'Open http://localhost:8080 in your browser. Press Ctrl+C to stop.\n'
exec python3 -m http.server 8080 --bind 127.0.0.1 --directory dist
