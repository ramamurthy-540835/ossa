#!/bin/bash

# OSSA Dashboard — start | stop | restart | status
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VM_IP="${VM_IP:-10.100.15.44}"
FRONTEND_PORT=3001
BACKEND_PORT=8000

# Pin the API URL so next.config.js rewrites always hit the right port
# (overrides any stale NEXT_PUBLIC_API_URL from other projects in the shell)
export NEXT_PUBLIC_API_URL="http://${VM_IP}:${BACKEND_PORT}"
PID_DIR="$SCRIPT_DIR/.pids"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"
BACKEND_LOG="$PID_DIR/backend.log"
FRONTEND_LOG="$PID_DIR/frontend.log"

mkdir -p "$PID_DIR"

# ── helpers ──────────────────────────────────────────────────────────────────

is_running() {
    local pid_file="$1"
    [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null
}

kill_service() {
    local name="$1" pid_file="$2" pattern="$3"
    if is_running "$pid_file"; then
        local pid
        pid=$(cat "$pid_file")
        kill "$pid" 2>/dev/null
        rm -f "$pid_file"
        echo "   Stopped $name (pid $pid)"
    fi
    pkill -f "$pattern" 2>/dev/null || true
}

wait_for_http() {
    local url="$1" retries=20
    for ((i=1; i<=retries; i++)); do
        curl -s "$url" > /dev/null 2>&1 && return 0
        echo -n "."
        sleep 1
    done
    return 1
}

# ── stop ─────────────────────────────────────────────────────────────────────

cmd_stop() {
    echo "Stopping OSSA Dashboard..."
    kill_service "backend"  "$BACKEND_PID_FILE"  "python3.*main\.py"
    kill_service "frontend" "$FRONTEND_PID_FILE" "next dev"
    echo "Done."
}

# ── status ────────────────────────────────────────────────────────────────────

cmd_status() {
    echo "OSSA Dashboard status"
    echo "---------------------"
    if is_running "$BACKEND_PID_FILE"; then
        echo "  Backend  : RUNNING  (pid $(cat "$BACKEND_PID_FILE"))  http://$VM_IP:$BACKEND_PORT"
    else
        echo "  Backend  : stopped"
    fi
    if is_running "$FRONTEND_PID_FILE"; then
        echo "  Frontend : RUNNING  (pid $(cat "$FRONTEND_PID_FILE"))  http://$VM_IP:$FRONTEND_PORT"
    else
        echo "  Frontend : stopped"
    fi
}

# ── start ─────────────────────────────────────────────────────────────────────

cmd_start() {
    echo "Starting OSSA Dashboard  (VM: $VM_IP)"
    echo ""

    # ── Backend ──────────────────────────────────────────────────────────────
    echo "1) Backend..."

    if is_running "$BACKEND_PID_FILE"; then
        echo "   Already running (pid $(cat "$BACKEND_PID_FILE")) — skipping."
    else
        fuser -k "${BACKEND_PORT}/tcp" 2>/dev/null || true
        sleep 1

        cd "$SCRIPT_DIR/backend"
        [[ ! -d venv ]] && python3 -m venv venv
        source venv/bin/activate
        pip install -q -r requirements.txt

        python3 main.py >> "$BACKEND_LOG" 2>&1 &
        echo $! > "$BACKEND_PID_FILE"
        cd "$SCRIPT_DIR"

        echo -n "   Waiting for backend"
        if wait_for_http "http://localhost:$BACKEND_PORT/health"; then
            echo " — up (pid $(cat "$BACKEND_PID_FILE"))"
        else
            echo " — FAILED. Last 20 lines of log:"
            tail -20 "$BACKEND_LOG"
            exit 1
        fi
    fi

    # ── Frontend ─────────────────────────────────────────────────────────────
    echo ""
    echo "2) Frontend..."

    if is_running "$FRONTEND_PID_FILE"; then
        echo "   Already running (pid $(cat "$FRONTEND_PID_FILE")) — skipping."
    else
        fuser -k "${FRONTEND_PORT}/tcp" 2>/dev/null || true
        sleep 1

        cd "$SCRIPT_DIR/frontend"
        [[ ! -d node_modules ]] && npm install --legacy-peer-deps -q

        npm run dev -- --port "$FRONTEND_PORT" >> "$FRONTEND_LOG" 2>&1 &
        echo $! > "$FRONTEND_PID_FILE"
        cd "$SCRIPT_DIR"

        echo -n "   Waiting for frontend"
        if wait_for_http "http://localhost:$FRONTEND_PORT"; then
            echo " — up (pid $(cat "$FRONTEND_PID_FILE"))"
        else
            echo " — FAILED. Last 20 lines of log:"
            tail -20 "$FRONTEND_LOG"
            exit 1
        fi
    fi

    echo ""
    echo "OSSA Dashboard is ready!"
    echo ""
    echo "  Dashboard:  http://$VM_IP:$FRONTEND_PORT"
    echo "  API:        http://$VM_IP:$BACKEND_PORT"
    echo "  API Docs:   http://$VM_IP:$BACKEND_PORT/docs"
    echo ""
    echo "  ./start.sh stop      — stop everything"
    echo "  ./start.sh restart   — full restart"
    echo "  ./start.sh status    — check what's running"
    echo ""
}

# ── dispatch ──────────────────────────────────────────────────────────────────

CMD="${1:-start}"

case "$CMD" in
    start)   cmd_start   ;;
    stop)    cmd_stop    ;;
    restart) cmd_stop; sleep 1; cmd_start ;;
    status)  cmd_status  ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
