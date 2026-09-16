#!/usr/bin/env bash
# ==============================================================================
# KV Files — Project Launch & Service Management Script
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration defaults (can be overridden by environment variables)
HOST="${KV_HOST:-0.0.0.0}"
PORT="${KV_PORT:-8866}"
DATA_DIR="${KV_DATA_DIR:-${SCRIPT_DIR}/data}"
STORAGE_ROOTS="${KV_STORAGE_ROOTS:-${SCRIPT_DIR}/storage}"
RUST_LOG="${RUST_LOG:-kv_files=info,tower_http=info}"

BINARY="${SCRIPT_DIR}/target/release/kv-files"
PID_FILE="${DATA_DIR}/kv-files.pid"
LOG_FILE="${DATA_DIR}/kv-files.log"

# UI styling
BOLD='\033[1m'
DIM='\033[2m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()    { echo -e "${CYAN}ℹ${NC}  $*"; }
success() { echo -e "${GREEN}✔${NC}  ${BOLD}$*${NC}"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✖${NC}  ${BOLD}$*${NC}" >&2; }
banner()  {
    echo -e "${BLUE}${BOLD}"
    echo "  _  ____      __   ______ _ _             _____  _____   ____  "
    echo " | |/ /\ \    / /  |  ____(_) |           |  __ \|  __ \ / __ \ "
    echo " | ' /  \ \  / /   | |__   _| | ___  ___  | |__) | |__) | |  | |"
    echo " |  <    \ \/ /    |  __| | | |/ _ \/ __| |  ___/|  _  /| |  | |"
    echo " | . \    \  /     | |    | | |  __/\__ \ | |    | | \ \| |__| |"
    echo " |_|\_\    \/      |_|    |_|_|\___||___/ |_|    |_|  \_\\____/ "
    echo -e "       ${YELLOW}⚡ KV Files PRO — Military-Grade Asymmetric Edition ⚡${NC}\n"
}

ensure_directories() {
    mkdir -p "$DATA_DIR"
    mkdir -p "$STORAGE_ROOTS"
}

is_running() {
    if [[ -f "$PID_FILE" ]]; then
        local pid
        pid="$(cat "$PID_FILE" 2>/dev/null || true)"
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

get_lan_ip() {
    ip route get 1 2>/dev/null | awk '{print $7; exit}' || echo "127.0.0.1"
}

build_frontend() {
    local edition="${1:-pro}"
    info "Building web frontend (${edition} edition)..."
    if ! command -v npm &>/dev/null; then
        error "npm is not installed. Please install Node.js & npm first."
        exit 1
    fi

    (
        cd "${SCRIPT_DIR}/web"
        if [[ ! -d "node_modules" ]]; then
            info "Installing npm dependencies in web/..."
            npm install
        fi
        if [[ "$edition" == "community" ]]; then
            npm run build:community
        else
            npm run build:pro
        fi
    )
    success "Frontend built successfully (${edition})."
}

build_backend() {
    local edition="${1:-pro}"
    info "Compiling Rust release binary (with embedded frontend assets, ${edition})..."
    if ! command -v cargo &>/dev/null; then
        error "cargo is not installed. Please install Rust toolchain first."
        exit 1
    fi

    if [[ "$edition" == "community" ]]; then
        cargo build --release --no-default-features
    else
        cargo build --release
    fi
    success "Backend binary compiled successfully: target/release/kv-files"
}

cmd_build() {
    banner
    local edition="pro"
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --community|-c) edition="community"; shift ;;
            --pro|-p) edition="pro"; shift ;;
            *) shift ;;
        esac
    done
    echo -e "${BOLD}Starting full project build for ${CYAN}${edition^^}${NC}...${NC}\n"
    build_frontend "$edition"
    build_backend "$edition"
    success "All components built successfully for ${edition^^}!"
}

cmd_keygen() {
    banner
    info "Running KV File PRO Master License Key Generator..."
    if ! command -v python3 &>/dev/null; then
        error "python3 is not installed. Please install Python 3 first."
        exit 1
    fi
    python3 "${SCRIPT_DIR}/scripts/keygen.py" "$@"
}

cmd_start() {
    local fg_mode=false
    local force_build=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --fg|--foreground|-f) fg_mode=true; shift ;;
            --build|-b) force_build=true; shift ;;
            *) warn "Unknown option: $1"; shift ;;
        esac
    done

    banner
    ensure_directories

    if is_running; then
        local current_pid
        current_pid="$(cat "$PID_FILE")"
        warn "KV Files is already running (PID: ${current_pid})."
        echo -e "Use ${CYAN}./launch.sh status${NC} or ${CYAN}./launch.sh restart${NC}."
        exit 0
    fi

    # Auto-build if binary is missing or requested
    if [[ "$force_build" == true ]] || [[ ! -f "$BINARY" ]]; then
        if [[ ! -f "$BINARY" ]]; then
            info "Binary not found at ${BINARY}. Initiating automatic build..."
        fi
        build_frontend
        build_backend
    fi

    local lan_ip
    lan_ip="$(get_lan_ip)"

    if [[ "$fg_mode" == true ]]; then
        info "Starting KV Files in foreground mode..."
        echo -e "Listening at:"
        echo -e "  - Local:   ${CYAN}http://localhost:${PORT}${NC}"
        echo -e "  - Network: ${CYAN}http://${lan_ip}:${PORT}${NC}"
        echo -e "  - Storage: ${DIM}${STORAGE_ROOTS}${NC}"
        echo -e "  - Data:    ${DIM}${DATA_DIR}${NC}\n"
        export RUST_LOG
        exec "$BINARY" --host "$HOST" --port "$PORT" --data-dir "$DATA_DIR" --storage-roots "$STORAGE_ROOTS"
    fi

    info "Starting KV Files service in background..."
    export RUST_LOG
    setsid "$BINARY" \
        --host "$HOST" \
        --port "$PORT" \
        --data-dir "$DATA_DIR" \
        --storage-roots "$STORAGE_ROOTS" \
        >> "$LOG_FILE" 2>&1 < /dev/null &
    
    local new_pid=$!
    disown "$new_pid" 2>/dev/null || true
    echo "$new_pid" > "$PID_FILE"

    # Wait briefly for process to initialize and perform healthcheck
    sleep 1.2

    if kill -0 "$new_pid" 2>/dev/null; then
        success "KV Files is running! (PID: ${new_pid})"
        echo ""
        echo -e "  🌐 ${BOLD}Web Portal:${NC}     ${GREEN}http://localhost:${PORT}${NC}"
        echo -e "  📱 ${BOLD}Network URL:${NC}    ${GREEN}http://${lan_ip}:${PORT}${NC}"
        echo -e "  📁 ${BOLD}Storage Root:${NC}   ${DIM}${STORAGE_ROOTS}${NC}"
        echo -e "  💾 ${BOLD}Database Dir:${NC}   ${DIM}${DATA_DIR}${NC}"
        echo -e "  📄 ${BOLD}Log File:${NC}       ${DIM}${LOG_FILE}${NC}"
        echo ""
        echo -e "Useful commands:"
        echo -e "  ${CYAN}./launch.sh status${NC}  — Check service health & resource usage"
        echo -e "  ${CYAN}./launch.sh logs${NC}    — Stream live application logs"
        echo -e "  ${CYAN}./launch.sh stop${NC}    — Gracefully terminate the server"
        echo ""
    else
        error "Server failed to start. Last log entries from ${LOG_FILE}:"
        echo "--------------------------------------------------------"
        tail -n 20 "$LOG_FILE" 2>/dev/null || true
        echo "--------------------------------------------------------"
        rm -f "$PID_FILE"
        exit 1
    fi
}

cmd_stop() {
    banner
    if ! is_running; then
        warn "KV Files is not currently running."
        rm -f "$PID_FILE"
        exit 0
    fi

    local pid
    pid="$(cat "$PID_FILE")"
    info "Stopping KV Files (PID: ${pid})..."
    kill -15 "$pid" 2>/dev/null || true

    local count=0
    while kill -0 "$pid" 2>/dev/null; do
        sleep 0.5
        count=$((count + 1))
        if [[ $count -ge 20 ]]; then
            warn "Process did not stop within 10s. Force killing (SIGKILL)..."
            kill -9 "$pid" 2>/dev/null || true
            break
        fi
    done

    rm -f "$PID_FILE"
    success "KV Files server stopped successfully."
}

cmd_restart() {
    cmd_stop
    sleep 0.5
    cmd_start "$@"
}

cmd_status() {
    banner
    echo -e "${BOLD}KV Files Status Check${NC}\n"

    if is_running; then
        local pid
        pid="$(cat "$PID_FILE")"
        local lan_ip
        lan_ip="$(get_lan_ip)"

        success "Service is ACTIVE and RUNNING (PID: ${pid})"
        
        # Memory & CPU stats via ps
        local proc_stats
        proc_stats="$(ps -p "$pid" -o %cpu,%mem,etime,rss --no-headers 2>/dev/null || true)"
        if [[ -n "$proc_stats" ]]; then
            read -r cpu mem etime rss <<< "$proc_stats"
            local rss_mb=$(( rss / 1024 ))
            echo -e "  - CPU Usage:    ${CYAN}${cpu}%${NC}"
            echo -e "  - Memory Usage: ${CYAN}${rss_mb} MB (${mem}%)${NC}"
            echo -e "  - Uptime:       ${CYAN}${etime}${NC}"
        fi

        echo -e "  - Web Portal:   ${GREEN}http://localhost:${PORT}${NC}"
        echo -e "  - Network URL:  ${GREEN}http://${lan_ip}:${PORT}${NC}"

        # Probe health endpoint
        local health_resp
        health_resp="$(curl -s -m 3 "http://127.0.0.1:${PORT}/api/v1/auth/setup-status" 2>/dev/null || true)"
        if [[ -n "$health_resp" ]]; then
            echo -e "  - API Health:   ${GREEN}OK${NC} (${health_resp})"
        else
            echo -e "  - API Health:   ${YELLOW}Not responding on port ${PORT}${NC}"
        fi
    else
        warn "Service is STOPPED."
        echo -e "Run ${CYAN}./launch.sh start${NC} to start the service."
    fi
    echo ""
}

cmd_logs() {
    if [[ ! -f "$LOG_FILE" ]]; then
        error "No log file found at ${LOG_FILE}."
        exit 1
    fi
    echo -e "${CYAN}Streaming logs from ${LOG_FILE} (Ctrl+C to exit)...${NC}\n"
    tail -n 50 -f "$LOG_FILE"
}

cmd_dev() {
    banner
    info "Starting in DEVELOPMENT mode..."
    echo -e "  - Backend will run on ${CYAN}http://localhost:${PORT}${NC}"
    echo -e "  - Vite Dev server will run on ${CYAN}http://localhost:5173${NC} with hot-reload"
    echo -e "  - Vite automatically proxies ${DIM}/api${NC} requests to ${CYAN}http://localhost:${PORT}${NC}\n"

    ensure_directories

    local BACKEND_PID=""
    local FRONTEND_PID=""

    cleanup() {
        echo ""
        info "Shutting down development servers..."
        if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
            kill -15 "$BACKEND_PID" 2>/dev/null || true
        fi
        if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
            kill -15 "$FRONTEND_PID" 2>/dev/null || true
        fi
        wait 2>/dev/null || true
        success "Development servers terminated."
    }
    trap cleanup INT TERM EXIT

    # Ensure dependencies installed in web
    if [[ ! -d "web/node_modules" ]]; then
        info "Installing web dependencies..."
        (cd web && npm install)
    fi

    # Start backend
    if [[ -f "$BINARY" ]]; then
        "$BINARY" --host "$HOST" --port "$PORT" --data-dir "$DATA_DIR" --storage-roots "$STORAGE_ROOTS" &
        BACKEND_PID=$!
    else
        cargo run -- --host "$HOST" --port "$PORT" --data-dir "$DATA_DIR" --storage-roots "$STORAGE_ROOTS" &
        BACKEND_PID=$!
    fi

    # Start Vite dev server
    (cd web && npm run dev) &
    FRONTEND_PID=$!

    # Wait on both processes
    wait
}

cmd_docker() {
    banner
    info "Managing KV Files via Docker Compose..."
    local action="${1:-up}"

    case "$action" in
        up|start)
            info "Starting containers with docker compose up -d..."
            docker compose up -d
            success "Docker stack started. Access at http://localhost:8866"
            ;;
        down|stop)
            info "Stopping containers with docker compose down..."
            docker compose down
            success "Docker stack stopped."
            ;;
        restart)
            docker compose restart
            success "Docker stack restarted."
            ;;
        logs)
            docker compose logs -f
            ;;
        build)
            info "Building container image locally..."
            docker build -t kv-file:local .
            success "Image kv-file:local built."
            ;;
        *)
            echo "Usage: ./launch.sh docker [up|down|restart|logs|build]"
            ;;
    esac
}

cmd_mock() {
    banner
    info "Running Mock File Extensions Generator..."
    if ! command -v python3 &>/dev/null; then
        error "python3 is not installed. Please install Python 3 first."
        exit 1
    fi
    python3 "${SCRIPT_DIR}/scripts/spawn_mock_files.py" "$@"
}

cmd_help() {
    banner
    echo -e "${BOLD}Usage:${NC} ./launch.sh [command] [options]\n"
    echo -e "${BOLD}Commands:${NC}"
    echo -e "  ${CYAN}start${NC} [--fg] [--build]  Start the KV Files server in background (default) or foreground"
    echo -e "  ${CYAN}stop${NC}                  Gracefully stop the background server"
    echo -e "  ${CYAN}restart${NC} [--build]        Restart the background server"
    echo -e "  ${CYAN}status${NC}                 Show service health, memory, uptime, and URLs"
    echo -e "  ${CYAN}logs${NC}                   Stream live logs from data/kv-files.log"
    echo -e "  ${CYAN}build${NC} [--pro|--comm]   Build web frontend and Rust binary (PRO or Community)"
    echo -e "  ${CYAN}keygen${NC} [issue|verify]  Generate or verify Ed25519 asymmetric customer licenses"
    echo -e "  ${CYAN}dev${NC}                    Launch concurrent backend + Vite dev server (HMR enabled)"
    echo -e "  ${CYAN}mock${NC} [--clean]         Spawn or clean realistic mock file extensions in storage/"
    echo -e "  ${CYAN}docker${NC} [up|down|logs]  Manage Docker Compose deployment"
    echo -e "  ${CYAN}help${NC}                   Display this help menu\n"
    echo -e "${BOLD}Environment Variables:${NC}"
    echo -e "  ${DIM}KV_PORT${NC}           Port to bind to (default: 8866)"
    echo -e "  ${DIM}KV_HOST${NC}           Host address to bind to (default: 0.0.0.0)"
    echo -e "  ${DIM}KV_DATA_DIR${NC}       Directory for SQLite DB and logs (default: ./data)"
    echo -e "  ${DIM}KV_STORAGE_ROOTS${NC}  Path to storage directory (default: ./storage)"
    echo -e "  ${DIM}KV_LICENSE_KEY${NC}    Offline Ed25519 Pro license key (KVPRO-...)"
    echo -e "  ${DIM}RUST_LOG${NC}          Tracing level (default: kv_files=info,tower_http=info)\n"
}

# Main routing
ACTION="${1:-start}"
shift 2>/dev/null || true

case "$ACTION" in
    start)   cmd_start "$@" ;;
    stop)    cmd_stop ;;
    restart) cmd_restart "$@" ;;
    status)  cmd_status ;;
    logs)    cmd_logs ;;
    build)   cmd_build "$@" ;;
    keygen)  cmd_keygen "$@" ;;
    dev)     cmd_dev ;;
    mock)    cmd_mock "$@" ;;
    docker)  cmd_docker "$@" ;;
    help|--help|-h) cmd_help ;;
    *)
        error "Unknown command: '$ACTION'"
        echo -e "Run ${CYAN}./launch.sh help${NC} for available options."
        exit 1
        ;;
esac
