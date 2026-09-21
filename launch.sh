#!/usr/bin/env bash
# ==============================================================================
# KV Files PRO — Production-Grade Service Management Daemon & CLI
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ------------------------------------------------------------------------------
# Terminal Color & Styling Support (Auto-detects TTY & respects NO_COLOR)
# ------------------------------------------------------------------------------
if [[ -t 1 ]] && [[ -z "${NO_COLOR:-}" ]]; then
    BOLD='\033[1m'
    DIM='\033[2m'
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    NC='\033[0m' # No Color
else
    BOLD=''
    DIM=''
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    CYAN=''
    NC=''
fi

info()    { echo -e "${CYAN}ℹ${NC}  $*"; }
success() { echo -e "${GREEN}✔${NC}  ${BOLD}$*${NC}"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✖${NC}  ${BOLD}$*${NC}" >&2; }

BANNER_PRINTED=0
banner() {
    [[ "$BANNER_PRINTED" -eq 1 ]] && return 0
    BANNER_PRINTED=1
    echo -e "${BLUE}${BOLD}"
    echo "  _  ____      __   ______ _ _             _____  _____   ____  "
    echo " | |/ /\ \    / /  |  ____(_) |           |  __ \|  __ \ / __ \ "
    echo " | ' /  \ \  / /   | |__   _| | ___  ___  | |__) | |__) | |  | |"
    echo " |  <    \ \/ /    |  __| | | |/ _ \/ __| |  ___/|  _  /| |  | |"
    echo " | . \    \  /     | |    | | |  __/\__ \ | |    | | \ \| |__| |"
    echo " |_|\_\    \/      |_|    |_|_|\___||___/ |_|    |_|  \_\\____/ "
    echo -e "       ${YELLOW}⚡ KV Files PRO — Enterprise Production Daemon ⚡${NC}\n"
}

# ------------------------------------------------------------------------------
# Safe .env File Loader
# ------------------------------------------------------------------------------
load_env_file() {
    local env_file="$1"
    [[ -f "$env_file" ]] || return 0
    while IFS= read -r line || [[ -n "$line" ]]; do
        line="$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
        [[ -z "$line" || "$line" =~ ^# ]] && continue
        if [[ "$line" =~ ^(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
            local key="${BASH_REMATCH[2]}"
            local val="${BASH_REMATCH[3]}"
            # Strip surrounding matching quotes
            if [[ "$val" == \"*\" && "$val" == *\" ]]; then
                val="${val#\"}"
                val="${val%\"}"
            elif [[ "$val" == \'*\' && "$val" == *\' ]]; then
                val="${val#\'}"
                val="${val%\'}"
            fi
            # Do not overwrite variables already explicitly passed in environment
            if [[ -z "${!key+x}" ]]; then
                export "$key"="$val"
            fi
        fi
    done < "$env_file"
}

# Load default project .env if present
ENV_FILE="${KV_ENV_FILE:-${SCRIPT_DIR}/.env}"
load_env_file "$ENV_FILE"

# Configuration defaults (Precedence: CLI flags > Env Vars > .env > Defaults)
HOST="${KV_HOST:-0.0.0.0}"
PORT="${KV_PORT:-8866}"
DATA_DIR="${KV_DATA_DIR:-${SCRIPT_DIR}/data}"
STORAGE_ROOTS="${KV_STORAGE_ROOTS:-${SCRIPT_DIR}/storage}"
RUST_LOG="${RUST_LOG:-kv_files=info,tower_http=info}"

# Canonicalize relative directory paths to absolute paths
[[ "$DATA_DIR" != /* ]] && DATA_DIR="${SCRIPT_DIR}/${DATA_DIR#./}"
[[ "$STORAGE_ROOTS" != /* ]] && STORAGE_ROOTS="${SCRIPT_DIR}/${STORAGE_ROOTS#./}"

BINARY="${SCRIPT_DIR}/target/release/kv-files"
PID_FILE="${DATA_DIR}/kv-files.pid"
LOG_FILE="${DATA_DIR}/kv-files.log"

STARTUP_TIMEOUT=20
STOP_TIMEOUT=15

ensure_directories() {
    mkdir -p "$DATA_DIR"
    mkdir -p "$STORAGE_ROOTS"
    chmod 755 "$DATA_DIR" 2>/dev/null || true
    chmod 755 "$STORAGE_ROOTS" 2>/dev/null || true
}

get_lan_ip() {
    local ip
    ip="$(ip route get 1 2>/dev/null | awk '{print $7; exit}')"
    if [[ -z "$ip" ]]; then
        ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
    fi
    echo "${ip:-127.0.0.1}"
}

# ------------------------------------------------------------------------------
# Process & Socket Inspection (PID tracking & discovery)
# ------------------------------------------------------------------------------
get_running_pid() {
    # 1. Check PID_FILE first
    if [[ -f "$PID_FILE" ]]; then
        local pid
        pid="$(cat "$PID_FILE" 2>/dev/null | tr -d '[:space:]' || true)"
        if [[ -n "$pid" && "$pid" =~ ^[0-9]+$ ]]; then
            if kill -0 "$pid" 2>/dev/null; then
                local comm
                comm="$(cat "/proc/${pid}/comm" 2>/dev/null || ps -p "$pid" -o comm= 2>/dev/null || true)"
                comm="$(echo "$comm" | tr -d '[:space:]')"
                if [[ "$comm" == "kv-files" || "$comm" == "kv-file" ]]; then
                    echo "$pid"
                    return 0
                fi
            fi
        fi
        # Stale PID file: remove it
        rm -f "$PID_FILE" 2>/dev/null || true
    fi

    # 2. Check if a process is listening on PORT
    local listen_pid=""
    if command -v lsof &>/dev/null; then
        listen_pid="$(lsof -iTCP:"${PORT}" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true)"
    elif command -v fuser &>/dev/null; then
        listen_pid="$(fuser "${PORT}"/tcp 2>/dev/null | awk '{print $1}' || true)"
    fi

    if [[ -n "$listen_pid" && "$listen_pid" =~ ^[0-9]+$ ]]; then
        local comm
        comm="$(cat "/proc/${listen_pid}/comm" 2>/dev/null || ps -p "$listen_pid" -o comm= 2>/dev/null || true)"
        comm="$(echo "$comm" | tr -d '[:space:]')"
        if [[ "$comm" == "kv-files" || "$comm" == "kv-file" ]]; then
            ensure_directories
            echo "$listen_pid" > "$PID_FILE"
            echo "$listen_pid"
            return 0
        fi
    fi

    # 3. Check pgrep for matching kv-files process
    local candidate_pids
    candidate_pids="$(pgrep -x "kv-files" 2>/dev/null || true)"
    for cpid in $candidate_pids; do
        local cmdline
        cmdline="$(tr '\0' ' ' < "/proc/${cpid}/cmdline" 2>/dev/null || true)"
        if [[ "$cmdline" =~ ${SCRIPT_DIR} || "$cmdline" =~ ${DATA_DIR} || "$cmdline" =~ "--port ${PORT}" ]]; then
            ensure_directories
            echo "$cpid" > "$PID_FILE"
            echo "$cpid"
            return 0
        fi
    done

    return 1
}

is_running() {
    get_running_pid >/dev/null 2>&1
}

check_port_conflict() {
    local port="$1"
    local allow_pid="${2:-}"
    local conflict_pid=""

    if command -v lsof &>/dev/null; then
        conflict_pid="$(lsof -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true)"
    elif command -v fuser &>/dev/null; then
        conflict_pid="$(fuser "${port}"/tcp 2>/dev/null | awk '{print $1}' || true)"
    fi

    if [[ -n "$conflict_pid" && "$conflict_pid" =~ ^[0-9]+$ ]]; then
        if [[ -n "$allow_pid" && "$conflict_pid" == "$allow_pid" ]]; then
            return 0
        fi
        local conflict_name
        conflict_name="$(cat "/proc/${conflict_pid}/comm" 2>/dev/null || ps -p "$conflict_pid" -o comm= 2>/dev/null || echo "unknown")"
        error "Port ${port} is already in use by PID ${conflict_pid} (${conflict_name})!"
        echo -e "  Please stop that process or specify a different port with ${CYAN}KV_PORT=<port>${NC} or ${CYAN}--port <port>${NC}."
        return 1
    fi
    return 0
}

wait_for_health() {
    local target_pid="$1"
    local timeout="${2:-$STARTUP_TIMEOUT}"
    local check_host="$HOST"
    if [[ "$check_host" == "0.0.0.0" || "$check_host" == "::" || -z "$check_host" ]]; then
        check_host="127.0.0.1"
    fi
    local health_url="http://${check_host}:${PORT}/api/v1/auth/setup-status"

    info "Waiting for service health check on ${health_url} (timeout: ${timeout}s)..."
    local interval=0.5
    local steps
    steps="$(awk "BEGIN {print int($timeout / $interval)}")"

    for ((s = 1; s <= steps; s++)); do
        # Detect immediate crash
        if ! kill -0 "$target_pid" 2>/dev/null; then
            echo ""
            error "Process (PID: ${target_pid}) terminated unexpectedly during startup!"
            echo -e "${YELLOW}--- Last 25 lines of ${LOG_FILE} ---${NC}"
            tail -n 25 "$LOG_FILE" 2>/dev/null || true
            echo -e "${YELLOW}-------------------------------------${NC}"
            rm -f "$PID_FILE" 2>/dev/null || true
            return 1
        fi

        # Probe health endpoint
        local http_code
        http_code="$(curl -s -o /dev/null -w "%{http_code}" -m 2 "$health_url" 2>/dev/null || true)"
        if [[ "$http_code" == "200" ]]; then
            return 0
        fi

        sleep "$interval"
    done

    warn "Startup health probe timed out after ${timeout}s (last HTTP status: ${http_code:-none})."
    echo -e "  Process (PID: ${target_pid}) is still alive, but did not respond with 200 OK."
    echo -e "  Inspect logs with ${CYAN}./launch.sh logs${NC}."
    return 2
}

# ------------------------------------------------------------------------------
# Build Pipeline (Frontend + Backend)
# ------------------------------------------------------------------------------
build_frontend() {
    local edition="${1:-pro}"
    info "Building web frontend (${edition} edition)..."
    if ! command -v npm &>/dev/null; then
        error "npm is not installed. Please install Node.js & npm first."
        return 1
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
    info "Compiling Rust release binary (embedded assets, ${edition})..."
    if ! command -v cargo &>/dev/null; then
        error "cargo is not installed. Please install Rust toolchain first."
        return 1
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
    local clean=false
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --community|-c) edition="community"; shift ;;
            --pro|-p) edition="pro"; shift ;;
            --clean) clean=true; shift ;;
            *) shift ;;
        esac
    done

    if [[ "$clean" == true ]]; then
        info "Cleaning prior build artifacts..."
        cargo clean 2>/dev/null || true
        rm -rf "${SCRIPT_DIR}/web/dist" 2>/dev/null || true
    fi

    echo -e "${BOLD}Starting full project build for ${CYAN}${edition^^}${NC}...${NC}\n"
    build_frontend "$edition"
    build_backend "$edition"

    if [[ -f "$BINARY" ]]; then
        local bsize
        bsize="$(du -h "$BINARY" | awk '{print $1}')"
        local bver
        bver="$("$BINARY" --version 2>/dev/null || echo "2.1.0")"
        echo ""
        success "Release artifact ready: ${BINARY} (${bver}, ${bsize})"
    fi
}

# ------------------------------------------------------------------------------
# Service Lifecycle Commands (start, stop, restart, status)
# ------------------------------------------------------------------------------
cmd_start() {
    local fg_mode=false
    local force_build=false
    local timeout="$STARTUP_TIMEOUT"

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --fg|--foreground|-f) fg_mode=true; shift ;;
            --build|-b) force_build=true; shift ;;
            --timeout|-t) timeout="$2"; shift 2 ;;
            --port|-p) PORT="$2"; export KV_PORT="$2"; shift 2 ;;
            --host|-H) HOST="$2"; export KV_HOST="$2"; shift 2 ;;
            --data-dir) DATA_DIR="$2"; export KV_DATA_DIR="$2"; PID_FILE="${DATA_DIR}/kv-files.pid"; LOG_FILE="${DATA_DIR}/kv-files.log"; shift 2 ;;
            --storage-roots) STORAGE_ROOTS="$2"; export KV_STORAGE_ROOTS="$2"; shift 2 ;;
            *) warn "Unknown option: $1"; shift ;;
        esac
    done

    banner
    ensure_directories

    local running_pid
    if running_pid="$(get_running_pid)"; then
        warn "KV Files is already running (PID: ${running_pid})."
        echo -e "Use ${CYAN}./launch.sh status${NC} or ${CYAN}./launch.sh restart${NC}."
        return 0
    fi

    # Check for port collisions
    if ! check_port_conflict "$PORT"; then
        return 1
    fi

    # Auto-build if binary is missing or requested
    if [[ "$force_build" == true ]] || [[ ! -f "$BINARY" ]]; then
        if [[ ! -f "$BINARY" ]]; then
            info "Binary not found at ${BINARY}. Initiating automatic production build..."
        fi
        build_frontend "pro"
        build_backend "pro"
    fi

    local lan_ip
    lan_ip="$(get_lan_ip)"

    export KV_HOST="$HOST"
    export KV_PORT="$PORT"
    export KV_DATA_DIR="$DATA_DIR"
    export KV_STORAGE_ROOTS="$STORAGE_ROOTS"
    export RUST_LOG

    if [[ "$fg_mode" == true ]]; then
        info "Starting KV Files in foreground mode..."
        echo -e "Listening at:"
        echo -e "  - Local:   ${CYAN}http://localhost:${PORT}${NC}"
        echo -e "  - Network: ${CYAN}http://${lan_ip}:${PORT}${NC}"
        echo -e "  - Storage: ${DIM}${STORAGE_ROOTS}${NC}"
        echo -e "  - Data:    ${DIM}${DATA_DIR}${NC}\n"
        exec "$BINARY" --host "$HOST" --port "$PORT" --data-dir "$DATA_DIR" --storage-roots "$STORAGE_ROOTS"
    fi

    info "Starting KV Files service daemon in background..."
    nohup "$BINARY" \
        --host "$HOST" \
        --port "$PORT" \
        --data-dir "$DATA_DIR" \
        --storage-roots "$STORAGE_ROOTS" \
        >> "$LOG_FILE" 2>&1 < /dev/null &

    local new_pid=$!
    echo "$new_pid" > "$PID_FILE"

    if wait_for_health "$new_pid" "$timeout"; then
        success "KV Files is running and operational! (PID: ${new_pid})"
        echo ""
        echo -e "  🌐 ${BOLD}Web Portal:${NC}     ${GREEN}http://localhost:${PORT}${NC}"
        echo -e "  📱 ${BOLD}Network URL:${NC}    ${GREEN}http://${lan_ip}:${PORT}${NC}"
        echo -e "  📁 ${BOLD}Storage Root:${NC}   ${DIM}${STORAGE_ROOTS}${NC}"
        echo -e "  💾 ${BOLD}Database Dir:${NC}   ${DIM}${DATA_DIR}${NC}"
        echo -e "  📄 ${BOLD}Log File:${NC}       ${DIM}${LOG_FILE}${NC}"
        echo ""
        echo -e "Useful commands:"
        echo -e "  ${CYAN}./launch.sh status${NC}    — Check service health & resource usage"
        echo -e "  ${CYAN}./launch.sh logs${NC}      — Stream live application logs"
        echo -e "  ${CYAN}./launch.sh stop${NC}      — Gracefully terminate the server"
        echo -e "  ${CYAN}./launch.sh doctor${NC}    — Run pre-flight production health checks"
        echo ""
    else
        return 1
    fi
}

cmd_stop() {
    local force=false
    local timeout="$STOP_TIMEOUT"

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --force|-f) force=true; shift ;;
            --timeout|-t) timeout="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    local pid
    if ! pid="$(get_running_pid)"; then
        warn "KV Files is not currently running."
        rm -f "$PID_FILE" 2>/dev/null || true
        return 0
    fi

    banner
    info "Stopping KV Files (PID: ${pid})..."

    if [[ "$force" == true ]]; then
        warn "Force killing process immediately (SIGKILL)..."
        kill -9 "$pid" 2>/dev/null || true
    else
        kill -15 "$pid" 2>/dev/null || true
        local interval=0.5
        local steps
        steps="$(awk "BEGIN {print int($timeout / $interval)}")"
        local stopped=false

        for ((s = 1; s <= steps; s++)); do
            if ! kill -0 "$pid" 2>/dev/null; then
                stopped=true
                break
            fi
            sleep "$interval"
        done

        if [[ "$stopped" != true ]]; then
            warn "Process did not stop within ${timeout}s. Escalating to SIGKILL..."
            kill -9 "$pid" 2>/dev/null || true
            sleep 0.5
        fi
    fi

    rm -f "$PID_FILE" 2>/dev/null || true
    success "KV Files server stopped successfully."
}

cmd_restart() {
    banner
    info "Restarting KV Files service..."
    cmd_stop "$@" || true
    sleep 1
    cmd_start "$@"
}

cmd_status() {
    banner
    echo -e "${BOLD}KV Files Production Status Check${NC}\n"

    local pid
    if pid="$(get_running_pid)"; then
        local lan_ip
        lan_ip="$(get_lan_ip)"

        # Process stats
        local proc_stats
        proc_stats="$(ps -p "$pid" -o %cpu,%mem,etime,rss --no-headers 2>/dev/null || true)"
        local ppid
        ppid="$(ps -p "$pid" -o ppid= 2>/dev/null | tr -d ' ' || echo "1")"
        local exe
        exe="$(readlink -f "/proc/${pid}/exe" 2>/dev/null || echo "$BINARY")"

        local cpu="0.0" mem="0.0" etime="00:00" rss="0" rss_mb="0"
        if [[ -n "$proc_stats" ]]; then
            read -r cpu mem etime rss <<< "$proc_stats"
            rss_mb=$(( rss / 1024 ))
        fi

        # File descriptors
        local open_fds=0
        if [[ -d "/proc/${pid}/fd" ]]; then
            open_fds="$(ls -1 "/proc/${pid}/fd" 2>/dev/null | wc -l || echo 0)"
        fi
        local max_fds
        max_fds="$(ulimit -n 2>/dev/null || echo "unlimited")"

        # Health probe with latency
        local check_host="$HOST"
        [[ "$check_host" == "0.0.0.0" || "$check_host" == "::" || -z "$check_host" ]] && check_host="127.0.0.1"
        local probe_url="http://${check_host}:${PORT}/api/v1/auth/setup-status"
        local probe_res
        probe_res="$(curl -s -w "\n%{http_code}\n%{time_total}" -m 2 "$probe_url" 2>/dev/null || true)"
        local http_code
        http_code="$(echo "$probe_res" | tail -n 2 | head -n 1)"
        local latency
        latency="$(echo "$probe_res" | tail -n 1)"
        local latency_ms="?"
        if [[ -n "$latency" ]]; then
            latency_ms="$(awk "BEGIN {printf \"%.1f\", $latency * 1000}" 2>/dev/null || echo "?")"
        fi
        local health_body
        health_body="$(echo "$probe_res" | sed -e '$ d' | sed -e '$ d' | tr -d '\n')"

        if [[ "$http_code" == "200" ]]; then
            success "Service is ACTIVE and HEALTHY (PID: ${pid})"
        else
            warn "Service process is ALIVE (PID: ${pid}), but health probe returned HTTP ${http_code:-timeout}"
        fi

        echo ""
        echo -e "  ${BOLD}Process Details:${NC}"
        echo -e "    - PID:          ${CYAN}${pid}${NC} (Parent PID: ${ppid})"
        echo -e "    - Binary:       ${DIM}${exe}${NC}"
        echo -e "    - Uptime:       ${CYAN}${etime}${NC}"
        echo -e "    - CPU Usage:    ${CYAN}${cpu}%${NC}"
        echo -e "    - Memory RSS:   ${CYAN}${rss_mb} MB${NC} (${mem}%)"
        echo -e "    - File Handles: ${CYAN}${open_fds}${NC} open (Limit: ${max_fds})"

        echo ""
        echo -e "  ${BOLD}Network & Endpoints:${NC}"
        echo -e "    - Web Portal:   ${GREEN}http://localhost:${PORT}${NC}"
        echo -e "    - Network URL:  ${GREEN}http://${lan_ip}:${PORT}${NC}"
        if [[ "$http_code" == "200" ]]; then
            echo -e "    - API Health:   ${GREEN}HTTP 200 OK${NC} (${latency_ms}ms) — ${DIM}${health_body}${NC}"
        else
            echo -e "    - API Health:   ${RED}Unavailable (HTTP ${http_code:-timeout})${NC}"
        fi

        echo ""
        echo -e "  ${BOLD}Storage & Persistence:${NC}"
        local db_file="${DATA_DIR}/kv_files.db"
        local db_size="None"
        local wal_size="0 B"
        if [[ -f "$db_file" ]]; then
            db_size="$(du -h "$db_file" 2>/dev/null | awk '{print $1}')"
            [[ -f "${db_file}-wal" ]] && wal_size="$(du -h "${db_file}-wal" 2>/dev/null | awk '{print $1}')"
        fi
        local storage_disk_info
        storage_disk_info="$(df -h "$STORAGE_ROOTS" 2>/dev/null | tail -n 1 | awk '{print $4 " free of " $2 " (" $5 " used)"}' || echo "N/A")"

        echo -e "    - Storage Root: ${DIM}${STORAGE_ROOTS}${NC} (${storage_disk_info})"
        echo -e "    - SQLite DB:    ${DIM}${db_file}${NC} (${db_size}, WAL: ${wal_size})"

        echo ""
        echo -e "  ${BOLD}Diagnostics & Logging:${NC}"
        local log_size="0 B"
        local log_mod="N/A"
        if [[ -f "$LOG_FILE" ]]; then
            log_size="$(du -h "$LOG_FILE" 2>/dev/null | awk '{print $1}')"
            log_mod="$(date -r "$LOG_FILE" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || stat -c %y "$LOG_FILE" 2>/dev/null || echo "N/A")"
        fi
        echo -e "    - Log File:     ${DIM}${LOG_FILE}${NC} (${log_size}, updated: ${log_mod})"

        if [[ -n "${KV_LICENSE_KEY:-}" ]]; then
            echo -e "    - License:      ${GREEN}PRO License Configured${NC} (${KV_LICENSE_KEY:0:15}...)"
        fi
    else
        warn "Service is STOPPED."
        echo -e "Run ${CYAN}./launch.sh start${NC} to start the service."

        # Check if port is in conflict
        if command -v lsof &>/dev/null; then
            local lpid
            lpid="$(lsof -iTCP:"${PORT}" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true)"
            if [[ -n "$lpid" ]]; then
                local lcomm
                lcomm="$(cat "/proc/${lpid}/comm" 2>/dev/null || ps -p "$lpid" -o comm= 2>/dev/null || echo "unknown")"
                echo ""
                warn "Warning: Port ${PORT} is currently occupied by foreign process PID ${lpid} (${lcomm})!"
            fi
        fi
    fi
    echo ""
}

# ------------------------------------------------------------------------------
# Production Logging & Log Rotation
# ------------------------------------------------------------------------------
cmd_logs() {
    local follow=true
    local lines=50
    local filter_err=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            -f|--follow) follow=true; shift ;;
            --no-follow) follow=false; shift ;;
            -n|--lines) lines="$2"; shift 2 ;;
            --err|--error|--errors) filter_err=true; shift ;;
            --clear)
                if [[ -f "$LOG_FILE" ]]; then
                    : > "$LOG_FILE"
                    success "Cleared log file: ${LOG_FILE}"
                fi
                return 0
                ;;
            *) shift ;;
        esac
    done

    if [[ ! -f "$LOG_FILE" ]]; then
        error "No log file found at ${LOG_FILE}."
        return 1
    fi

    if [[ "$filter_err" == true ]]; then
        info "Displaying warnings and errors from ${LOG_FILE}..."
        grep -E "ERROR|WARN|error|warn|panicked|fatal" "$LOG_FILE" | tail -n "$lines"
        return 0
    fi

    if [[ "$follow" == true ]]; then
        echo -e "${CYAN}Streaming live logs from ${LOG_FILE} (Ctrl+C to exit)...${NC}\n"
        tail -n "$lines" -f "$LOG_FILE"
    else
        tail -n "$lines" "$LOG_FILE"
    fi
}

cmd_logrotate() {
    banner
    info "Executing production log rotation for ${LOG_FILE}..."
    if [[ ! -f "$LOG_FILE" ]]; then
        warn "Log file ${LOG_FILE} does not exist yet. Nothing to rotate."
        return 0
    fi

    local max_generations=5
    rm -f "${LOG_FILE}.${max_generations}.gz" "${LOG_FILE}.${max_generations}" 2>/dev/null || true

    for ((g = max_generations - 1; g >= 1; g--)); do
        local next=$((g + 1))
        if [[ -f "${LOG_FILE}.${g}.gz" ]]; then
            mv "${LOG_FILE}.${g}.gz" "${LOG_FILE}.${next}.gz"
        elif [[ -f "${LOG_FILE}.${g}" ]]; then
            mv "${LOG_FILE}.${g}" "${LOG_FILE}.${next}"
        fi
    done

    # Safe copytruncate pattern preserves file descriptor for running process
    cp "$LOG_FILE" "${LOG_FILE}.1"
    : > "$LOG_FILE"

    if command -v gzip &>/dev/null; then
        gzip -f "${LOG_FILE}.1" 2>/dev/null || true
        success "Rotated ${LOG_FILE} -> ${LOG_FILE}.1.gz"
    else
        success "Rotated ${LOG_FILE} -> ${LOG_FILE}.1"
    fi
    info "Active log file truncated and ready for incoming writes."
}

# ------------------------------------------------------------------------------
# Pre-Flight System Diagnostics (Doctor)
# ------------------------------------------------------------------------------
cmd_doctor() {
    banner
    echo -e "${BOLD}KV Files Pre-Flight System Diagnostics (Doctor)${NC}\n"
    local passed=0
    local warnings=0
    local errors=0

    check_item() {
        local name="$1"
        local status="$2"
        local msg="$3"
        if [[ "$status" == "ok" ]]; then
            echo -e "  ${GREEN}✔${NC}  ${BOLD}${name}${NC}: ${msg}"
            passed=$((passed + 1))
        elif [[ "$status" == "warn" ]]; then
            echo -e "  ${YELLOW}⚠${NC}  ${BOLD}${name}${NC}: ${msg}"
            warnings=$((warnings + 1))
        else
            echo -e "  ${RED}✖${NC}  ${BOLD}${name}${NC}: ${msg}"
            errors=$((errors + 1))
        fi
    }

    # 1. Operating System
    local os_name
    os_name="$(uname -s 2>/dev/null || echo "Unknown")"
    local os_arch
    os_arch="$(uname -m 2>/dev/null || echo "Unknown")"
    local kernel_ver
    kernel_ver="$(uname -r 2>/dev/null || echo "Unknown")"
    check_item "Host Platform" "ok" "${os_name} ${kernel_ver} (${os_arch})"

    # 2. Permissions & Directories
    ensure_directories
    if [[ -w "$DATA_DIR" && -r "$DATA_DIR" ]]; then
        check_item "Data Directory" "ok" "${DATA_DIR} (Readable & Writable)"
    else
        check_item "Data Directory" "err" "Permission denied on ${DATA_DIR}"
    fi

    if [[ -w "$STORAGE_ROOTS" && -r "$STORAGE_ROOTS" ]]; then
        check_item "Storage Directory" "ok" "${STORAGE_ROOTS} (Readable & Writable)"
    else
        check_item "Storage Directory" "err" "Permission denied on ${STORAGE_ROOTS}"
    fi

    # 3. Disk Space
    local free_gb
    free_gb="$(df -BG "$DATA_DIR" 2>/dev/null | tail -n 1 | awk '{sub(/G/,"",$4); print $4}')"
    if [[ -n "$free_gb" && "$free_gb" -ge 5 ]]; then
        check_item "Disk Space" "ok" "${free_gb} GB free on data volume"
    elif [[ -n "$free_gb" && "$free_gb" -ge 1 ]]; then
        check_item "Disk Space" "warn" "Only ${free_gb} GB free on data volume"
    else
        check_item "Disk Space" "err" "Low disk space (< 1 GB) on data volume"
    fi

    # 4. File Descriptor Limits
    local max_fd
    max_fd="$(ulimit -n 2>/dev/null || echo 1024)"
    if [[ "$max_fd" =~ ^[0-9]+$ && "$max_fd" -ge 4096 ]]; then
        check_item "File Descriptors" "ok" "ulimit -n = ${max_fd}"
    elif [[ "$max_fd" == "unlimited" ]]; then
        check_item "File Descriptors" "ok" "ulimit -n is unlimited"
    else
        check_item "File Descriptors" "warn" "ulimit -n is ${max_fd} (recommended >= 4096 for production concurrency)"
    fi

    # 5. Core Utilities
    if command -v curl &>/dev/null; then
        check_item "curl CLI" "ok" "$(curl --version | head -n 1 | awk '{print $1 " " $2}')"
    else
        check_item "curl CLI" "err" "curl is required for health monitoring"
    fi

    if command -v ss &>/dev/null || command -v lsof &>/dev/null; then
        check_item "Network Tools" "ok" "ss / lsof available for socket detection"
    else
        check_item "Network Tools" "warn" "Neither ss nor lsof found"
    fi

    # 6. Python 3 & SQLite
    if command -v python3 &>/dev/null; then
        local py_ver
        py_ver="$(python3 -V 2>&1)"
        if python3 -c "import sqlite3" &>/dev/null; then
            check_item "Python & SQLite" "ok" "${py_ver} with embedded sqlite3 engine"
        else
            check_item "Python & SQLite" "warn" "${py_ver} found, but sqlite3 module is missing"
        fi
    else
        check_item "Python & SQLite" "warn" "python3 is recommended for licensing, backups, and maintenance"
    fi

    # 7. Node & npm
    if command -v node &>/dev/null && command -v npm &>/dev/null; then
        check_item "Node.js / npm" "ok" "Node $(node -v), npm v$(npm -v)"
    else
        check_item "Node.js / npm" "warn" "Node.js / npm not found (required for frontend builds)"
    fi

    # 8. Rust & Cargo
    if command -v cargo &>/dev/null; then
        check_item "Rust Toolchain" "ok" "$(cargo -V)"
    else
        check_item "Rust Toolchain" "warn" "Cargo not found (required for backend compilation)"
    fi

    # 9. SQLite DB Integrity
    local db_file="${DATA_DIR}/kv_files.db"
    if [[ -f "$db_file" ]]; then
        if command -v python3 &>/dev/null; then
            local integrity
            integrity="$(python3 -c "import sqlite3; con = sqlite3.connect('${db_file}'); print(con.execute('PRAGMA quick_check;').fetchone()[0]); con.close()" 2>/dev/null || echo "failed")"
            if [[ "$integrity" == "ok" ]]; then
                check_item "Database Integrity" "ok" "${db_file} passes quick_check"
            else
                check_item "Database Integrity" "err" "${db_file} integrity check error: ${integrity}"
            fi
        fi
    else
        check_item "Database Integrity" "ok" "New deployment (database will initialize on first launch)"
    fi

    # 10. Compiled Binary
    if [[ -f "$BINARY" ]]; then
        local bin_ver
        bin_ver="$("$BINARY" --version 2>/dev/null || echo "unknown")"
        local bin_size
        bin_size="$(du -h "$BINARY" 2>/dev/null | awk '{print $1}')"
        check_item "Compiled Binary" "ok" "${BINARY} (${bin_ver}, ${bin_size})"
    else
        check_item "Compiled Binary" "warn" "Binary not compiled yet (run ./launch.sh build)"
    fi

    # 11. Port Check
    local pid_now
    pid_now="$(get_running_pid || true)"
    if check_port_conflict "$PORT" "$pid_now" &>/dev/null; then
        if [[ -n "$pid_now" ]]; then
            check_item "Port Status" "ok" "Port ${PORT} is bound by current KV Files process (PID: ${pid_now})"
        else
            check_item "Port Status" "ok" "Port ${PORT} is free and ready"
        fi
    else
        check_item "Port Status" "err" "Port ${PORT} is occupied by an external process"
    fi

    echo ""
    echo -e "${BOLD}Diagnostic Summary:${NC} Passed: ${GREEN}${passed}${NC} | Warnings: ${YELLOW}${warnings}${NC} | Errors: ${RED}${errors}${NC}\n"
    if [[ "$errors" -gt 0 ]]; then
        return 1
    fi
    return 0
}

# ------------------------------------------------------------------------------
# Online Database Backup & Optimization (Non-blocking)
# ------------------------------------------------------------------------------
cmd_backup() {
    local dest_dir="${DATA_DIR}/backups"
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --dest|-d) dest_dir="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    banner
    info "Initiating non-blocking online database backup..."
    mkdir -p "$dest_dir"

    local db_file="${DATA_DIR}/kv_files.db"
    if [[ ! -f "$db_file" ]]; then
        error "Database file ${db_file} not found. Start service once to initialize database."
        return 1
    fi

    if ! command -v python3 &>/dev/null; then
        error "python3 is required for non-blocking online SQLite backup."
        return 1
    fi

    local timestamp
    timestamp="$(date +"%Y%m%d_%H%M%S")"
    local snapshot_file="${dest_dir}/.tmp_snapshot_${timestamp}.db"
    local archive_file="${dest_dir}/kv-files-backup-${timestamp}.tar.gz"

    # Online consistent SQLite backup (does not block concurrent read/writes)
    python3 - <<EOF
import sqlite3, sys
try:
    src = sqlite3.connect('${db_file}')
    bck = sqlite3.connect('${snapshot_file}')
    src.backup(bck)
    bck.close()
    src.close()
except Exception as e:
    sys.stderr.write(f"Backup failed: {e}\n")
    sys.exit(1)
EOF

    # Package snapshot + configuration into tar.gz
    local include_files=()
    include_files+=(-C "$dest_dir" "$(basename "$snapshot_file")")
    if [[ -f "${SCRIPT_DIR}/.env" ]]; then
        include_files+=(-C "${SCRIPT_DIR}" ".env")
    fi
    if [[ -f "${DATA_DIR}/license.key" ]]; then
        include_files+=(-C "${DATA_DIR}" "license.key")
    fi

    tar -czf "$archive_file" "${include_files[@]}" 2>/dev/null
    rm -f "$snapshot_file"

    local archive_size
    archive_size="$(du -h "$archive_file" | awk '{print $1}')"
    success "Backup archive created: ${archive_file} (${archive_size})"
}

cmd_vacuum() {
    banner
    info "Optimizing SQLite database (VACUUM & PRAGMA optimize)..."
    local db_file="${DATA_DIR}/kv_files.db"
    if [[ ! -f "$db_file" ]]; then
        error "Database file ${db_file} does not exist."
        return 1
    fi

    if ! command -v python3 &>/dev/null; then
        error "python3 is required for vacuum operation."
        return 1
    fi

    local size_before
    size_before="$(du -h "$db_file" | awk '{print $1}')"

    python3 - <<EOF
import sqlite3, sys
try:
    con = sqlite3.connect('${db_file}')
    con.execute('PRAGMA optimize;')
    con.execute('VACUUM;')
    con.close()
except Exception as e:
    sys.stderr.write(f"Vacuum error: {e}\n")
    sys.exit(1)
EOF

    local size_after
    size_after="$(du -h "$db_file" | awk '{print $1}')"
    success "Database optimized! Size before: ${size_before} -> Size after: ${size_after}"
}

# ------------------------------------------------------------------------------
# Native Systemd Service Management
# ------------------------------------------------------------------------------
cmd_systemd() {
    banner
    local subaction="${1:-status}"
    shift 2>/dev/null || true

    local is_root=false
    if [[ "$EUID" -eq 0 ]]; then
        is_root=true
    fi

    local unit_dir
    local unit_file
    local systemctl_cmd

    if [[ "$is_root" == true ]]; then
        unit_dir="/etc/systemd/system"
        unit_file="${unit_dir}/kv-files.service"
        systemctl_cmd="systemctl"
    else
        unit_dir="${HOME}/.config/systemd/user"
        unit_file="${unit_dir}/kv-files.service"
        systemctl_cmd="systemctl --user"
    fi

    generate_unit() {
        cat <<EOF
[Unit]
Description=KV Files PRO - Enterprise High-Performance File Manager
Documentation=https://github.com/vndangkhoa/kv-file
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
$(if [[ "$is_root" == true ]]; then
    local current_user="${SUDO_USER:-$(whoami)}"
    local current_group
    current_group="$(id -gn "$current_user" 2>/dev/null || echo "$current_user")"
    echo "User=${current_user}"
    echo "Group=${current_group}"
fi)
WorkingDirectory=${SCRIPT_DIR}
EnvironmentFile=-${SCRIPT_DIR}/.env
ExecStart=${BINARY} --host ${HOST} --port ${PORT} --data-dir ${DATA_DIR} --storage-roots ${STORAGE_ROOTS}
Restart=always
RestartSec=5s
LimitNOFILE=65536
KillMode=mixed
TimeoutStopSec=15
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kv-files

# Security Sandboxing
NoNewPrivileges=true
ProtectSystem=full
PrivateTmp=true

[Install]
WantedBy=$([[ "$is_root" == true ]] && echo "multi-user.target" || echo "default.target")
EOF
    }

    case "$subaction" in
        generate)
            info "Generated systemd unit definition:"
            echo "--------------------------------------------------------"
            generate_unit
            echo "--------------------------------------------------------"
            ;;
        install)
            info "Installing systemd service unit..."
            mkdir -p "$unit_dir"
            generate_unit > "$unit_file"
            success "Created unit file: ${unit_file}"
            $systemctl_cmd daemon-reload
            $systemctl_cmd enable kv-files.service
            success "kv-files service enabled for automatic startup on boot."
            echo -e "To start: ${CYAN}${systemctl_cmd} start kv-files${NC}"
            echo -e "To check: ${CYAN}${systemctl_cmd} status kv-files${NC}"
            ;;
        uninstall)
            info "Removing systemd service unit..."
            $systemctl_cmd stop kv-files.service 2>/dev/null || true
            $systemctl_cmd disable kv-files.service 2>/dev/null || true
            rm -f "$unit_file"
            $systemctl_cmd daemon-reload
            success "kv-files systemd unit uninstalled."
            ;;
        status)
            $systemctl_cmd status kv-files.service || true
            ;;
        start|stop|restart|reload)
            $systemctl_cmd "$subaction" kv-files.service
            ;;
        *)
            echo "Usage: ./launch.sh systemd [install|uninstall|status|start|stop|restart|generate]"
            ;;
    esac
}

# ------------------------------------------------------------------------------
# Keygen, Dev, Mock, Docker Helpers
# ------------------------------------------------------------------------------
cmd_keygen() {
    banner
    info "Running KV File PRO Master License Key Generator..."
    if ! command -v python3 &>/dev/null; then
        error "python3 is not installed. Please install Python 3 first."
        return 1
    fi
    python3 "${SCRIPT_DIR}/scripts/keygen.py" "$@"
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
            success "Docker stack started. Access at http://localhost:${PORT}"
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
        return 1
    fi
    python3 "${SCRIPT_DIR}/scripts/spawn_mock_files.py" "$@"
}

cmd_help() {
    banner
    echo -e "${BOLD}Usage:${NC} ./launch.sh [global options] [command] [command options]\n"
    echo -e "${BOLD}Core Service Commands:${NC}"
    echo -e "  ${CYAN}start${NC}     [--fg] [--build] [-t <sec>]  Start KV Files daemon (or foreground)"
    echo -e "  ${CYAN}stop${NC}      [--force] [-t <sec>]         Gracefully stop the background server"
    echo -e "  ${CYAN}restart${NC}   [--build]                    Restart the background server"
    echo -e "  ${CYAN}status${NC}                                 Show comprehensive service & system health"
    echo -e "  ${CYAN}logs${NC}      [-f] [-n <num>] [--err]      Stream or view application logs\n"
    echo -e "${BOLD}Production Diagnostics & Maintenance:${NC}"
    echo -e "  ${CYAN}doctor${NC}    (or ${CYAN}check${NC})                 Run pre-flight system diagnostics"
    echo -e "  ${CYAN}logrotate${NC}                              Rotate and compress application logs"
    echo -e "  ${CYAN}backup${NC}    [--dest <dir>]               Create online non-blocking DB backup"
    echo -e "  ${CYAN}vacuum${NC}                                 Optimize and defragment SQLite database"
    echo -e "  ${CYAN}systemd${NC}   [install|status|start|...]   Manage native Linux systemd service\n"
    echo -e "${BOLD}Build & Development:${NC}"
    echo -e "  ${CYAN}build${NC}     [--pro|--community] [--clean] Full build (React SPA + Rust binary)"
    echo -e "  ${CYAN}dev${NC}                                    Launch concurrent backend + Vite HMR"
    echo -e "  ${CYAN}keygen${NC}    [issue|verify]               Generate/verify Ed25519 licenses"
    echo -e "  ${CYAN}mock${NC}      [--clean]                    Generate realistic mock storage files"
    echo -e "  ${CYAN}docker${NC}    [up|down|restart|logs]       Docker Compose management\n"
    echo -e "${BOLD}Global Options & Configuration:${NC}"
    echo -e "  ${DIM}--port <port>, -p <port>${NC}           Override listening port (default: 8866)"
    echo -e "  ${DIM}--host <host>, -H <host>${NC}           Override listening host (default: 0.0.0.0)"
    echo -e "  ${DIM}--data-dir <dir>${NC}                   Override data directory (default: ./data)"
    echo -e "  ${DIM}--storage-roots <path>${NC}             Override storage root (default: ./storage)"
    echo -e "  ${DIM}--env-file <file>${NC}                  Specify custom .env configuration file\n"
}

# ------------------------------------------------------------------------------
# Main Dispatcher & Global Option Parser
# ------------------------------------------------------------------------------
ACTION=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --env-file)
            ENV_FILE="$2"
            load_env_file "$ENV_FILE"
            shift 2
            ;;
        --port|-p)
            PORT="$2"
            export KV_PORT="$2"
            shift 2
            ;;
        --host|-H)
            HOST="$2"
            export KV_HOST="$2"
            shift 2
            ;;
        --data-dir)
            DATA_DIR="$2"
            export KV_DATA_DIR="$2"
            PID_FILE="${DATA_DIR}/kv-files.pid"
            LOG_FILE="${DATA_DIR}/kv-files.log"
            shift 2
            ;;
        --storage-roots)
            STORAGE_ROOTS="$2"
            export KV_STORAGE_ROOTS="$2"
            shift 2
            ;;
        start|stop|restart|status|logs|logrotate|doctor|check|backup|vacuum|systemd|build|keygen|dev|mock|docker|help|--help|-h)
            ACTION="$1"
            shift
            break
            ;;
        *)
            ACTION="$1"
            shift
            break
            ;;
    esac
done

ACTION="${ACTION:-start}"

case "$ACTION" in
    start)          cmd_start "$@" ;;
    stop)           cmd_stop "$@" ;;
    restart)        cmd_restart "$@" ;;
    status)         cmd_status ;;
    logs)           cmd_logs "$@" ;;
    logrotate)      cmd_logrotate ;;
    doctor|check)   cmd_doctor ;;
    backup)         cmd_backup "$@" ;;
    vacuum)         cmd_vacuum ;;
    systemd)        cmd_systemd "$@" ;;
    build)          cmd_build "$@" ;;
    keygen)         cmd_keygen "$@" ;;
    dev)            cmd_dev "$@" ;;
    mock)           cmd_mock "$@" ;;
    docker)         cmd_docker "$@" ;;
    help|--help|-h) cmd_help ;;
    *)
        error "Unknown command: '$ACTION'"
        echo -e "Run ${CYAN}./launch.sh help${NC} for available options."
        exit 1
        ;;
esac
