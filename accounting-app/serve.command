#!/bin/bash
# Double-click this file in Finder to serve Ledger, or run: bash serve.command
cd "$(dirname "$0")" || exit 1
echo "Ledger at http://127.0.0.1:8080/index.html"
echo "Leave this window open. Press Ctrl+C to stop."
exec python3 -m http.server 8080
