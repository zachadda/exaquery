#!/bin/bash
# Start Exaquery (backend + frontend dev server)
set -e
cd "$(dirname "$0")"

# ── Find an available port starting from a given number ──
find_port() {
  local port=$1
  while lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; do
    echo "Port $port in use, trying $((port + 1))..." >&2
    port=$((port + 1))
  done
  echo "$port"
}

BACKEND_PORT=$(find_port "${BACKEND_PORT:-5000}")
FRONTEND_PORT=$(find_port "${FRONTEND_PORT:-3000}")

echo "Backend  → port $BACKEND_PORT"
echo "Frontend → port $FRONTEND_PORT"

# Install deps if needed
(cd ui && npm install --silent 2>/dev/null) || true
(cd backend && pip3 install -q -r requirements.txt 2>/dev/null) || true

# Start backend
cd backend
PORT=$BACKEND_PORT HTML=../ui/dist python3 server.py &
BACKEND_PID=$!

# Start frontend dev server
cd ../ui
VITE_BACKEND_PORT=$BACKEND_PORT VITE_PORT=$FRONTEND_PORT npx vite --port "$FRONTEND_PORT" --strictPort &
FRONTEND_PID=$!

echo ""
echo "Exaquery running at http://localhost:$FRONTEND_PORT"
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
