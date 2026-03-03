#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# GameHost Platform — One Command Update
# Usage: bash update.sh
# ============================================================

# ─── Colors & Formatting ──────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
BLUE='\033[34m'
MAGENTA='\033[35m'
GRAY='\033[90m'
WHITE='\033[97m'
NC='\033[0m'

# ─── Logging Helpers ──────────────────────────────────────
section() {
  echo ""
  echo -e "${GRAY}   ┌─────────────────────────────────────────────────────────────${NC}"
  echo -e "${GRAY}   │${NC}  ${BLUE}${BOLD}▶ $1${NC}"
  echo -e "${GRAY}   ├─────────────────────────────────────────────────────────────${NC}"
}

ok() {
  echo -e "${GRAY}   │${NC}  ${GREEN}✔${NC}  ${WHITE}$1${NC}"
}

info() {
  echo -e "${GRAY}   │${NC}  ${CYAN}→${NC}  ${WHITE}$1${NC}"
}

detail() {
  echo -e "${GRAY}   │${NC}     ${DIM}$1${NC}"
}

warn() {
  echo -e "${GRAY}   │${NC}  ${YELLOW}⚠${NC}  ${YELLOW}$1${NC}"
}

fail() {
  echo -e "${GRAY}   │${NC}  ${RED}✘${NC}  ${RED}${BOLD}$1${NC}"
  section_end
  exit 1
}

step_time() {
  local start=$1 label=$2
  local elapsed=$(( $(date +%s) - start ))
  echo -e "${GRAY}   │${NC}  ${GREEN}✔${NC}  ${WHITE}${label}${NC} ${DIM}(${elapsed}s)${NC}"
}

section_end() {
  echo -e "${GRAY}   └─────────────────────────────────────────────────────────────${NC}"
}

spinner() {
  local pid=$1 label=$2
  local frames=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r${GRAY}   │${NC}  ${CYAN}${frames[$i]}${NC}  ${WHITE}${label}${NC}  "
    i=$(( (i+1) % ${#frames[@]} ))
    sleep 0.1
  done
  printf "\r"
}

env_get() {
  local file=$1 key=$2
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d'=' -f2-
}

# ─── Start ─────────────────────────────────────────────────
START_TIME=$(date +%s)

echo ""
echo -e "${GRAY}   ══════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}   ⟳  GameHost Platform Update${NC}"
echo -e "${DIM}${GRAY}      $(date '+%Y-%m-%d %H:%M:%S %Z')${NC}"
echo -e "${GRAY}   ══════════════════════════════════════════════════════════════════${NC}"

# ─── Pre-flight Checks ───────────────────────────────────
section "Pre-flight Checks"

command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
DOCKER_VER=$(docker --version 2>/dev/null | awk '{print $3}' | tr -d ',')
ok "Docker ${DIM}v${DOCKER_VER}${NC}"

command -v docker compose >/dev/null 2>&1 && COMPOSE="docker compose" || {
  command -v docker-compose >/dev/null 2>&1 && COMPOSE="docker-compose" || fail "Docker Compose not found."
}
COMPOSE_VER=$($COMPOSE version --short 2>/dev/null || $COMPOSE version 2>/dev/null | awk '{print $NF}')
ok "Docker Compose ${DIM}v${COMPOSE_VER}${NC}"

[ -f .env ] || fail ".env not found — run install.sh first"
ok ".env exists"

# Show current running containers
RUNNING=$($COMPOSE ps --format '{{.Name}}' 2>/dev/null | wc -l || echo "0")
detail "${RUNNING} container(s) currently running"

section_end

# ─── Pull Latest Code ────────────────────────────────────
section "Source Code"

if command -v git >/dev/null 2>&1 && [ -d .git ]; then
  GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
  info "Branch: ${BOLD}${GIT_BRANCH}${NC}"
  info "Pulling latest changes..."

  PULL_START=$(date +%s)
  git pull --rebase > /dev/null 2>&1 && step_time $PULL_START "Git pull successful" || warn "Git pull failed — using local files"
else
  warn "No git repo — using local files"
fi

section_end

# ─── Rebuild ──────────────────────────────────────────────
section "Rebuilding"
info "Building new container images..."

BUILD_START=$(date +%s)

$COMPOSE build --no-cache > /dev/null 2>&1 &
BUILD_PID=$!
spinner $BUILD_PID "Building images"
wait $BUILD_PID

step_time $BUILD_START "All images rebuilt"

section_end

# ─── Restart ──────────────────────────────────────────────
section "Restarting Services"

SERVICE_START=$(date +%s)

$COMPOSE down > /dev/null 2>&1
ok "Old containers stopped"
$COMPOSE up -d > /dev/null 2>&1
ok "PostgreSQL 16           ${DIM}(gamehost-db)${NC}"
ok "Redis 7                 ${DIM}(gamehost-redis)${NC}"
ok "Backend — NestJS        ${DIM}(gamehost-backend)${NC}"
ok "Frontend — Next.js      ${DIM}(gamehost-frontend)${NC}"
ok "Nginx — Reverse Proxy   ${DIM}(gamehost-nginx)${NC}"

step_time $SERVICE_START "All services restarted"

section_end

# ─── Database ─────────────────────────────────────────────
section "Database"

DB_USER_VAL=$(env_get .env DB_USER)
DB_USER_VAL=${DB_USER_VAL:-gamehost}

info "Waiting for PostgreSQL..."

DB_WAIT_START=$(date +%s)
for i in $(seq 1 30); do
  if $COMPOSE exec -T postgres pg_isready -U "${DB_USER_VAL}" >/dev/null 2>&1; then
    step_time $DB_WAIT_START "PostgreSQL is ready"
    break
  fi
  [ "$i" -eq 30 ] && fail "PostgreSQL did not start in time"
  sleep 2
done

MIGRATE_START=$(date +%s)
info "Running migrations..."
$COMPOSE exec -T backend npx prisma migrate deploy > /dev/null 2>&1
step_time $MIGRATE_START "Migrations applied"

section_end

# ─── Done ─────────────────────────────────────────────────
END_TIME=$(date +%s)
TOTAL_ELAPSED=$(( END_TIME - START_TIME ))

if [ "$TOTAL_ELAPSED" -ge 60 ]; then
  ELAPSED_FMT="$(( TOTAL_ELAPSED / 60 ))m $(( TOTAL_ELAPSED % 60 ))s"
else
  ELAPSED_FMT="${TOTAL_ELAPSED}s"
fi

FE_PORT=$(env_get .env FRONTEND_PORT)
BE_PORT=$(env_get .env BACKEND_PORT)
FE_PORT=${FE_PORT:-3000}
BE_PORT=${BE_PORT:-4000}

echo ""
echo -e "${GRAY}   ╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${GREEN}${BOLD}✔  Update complete!${NC}                                        ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${DIM}Completed in ${ELAPSED_FMT}${NC}                                          ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${CYAN}Frontend${NC}     http://localhost:${FE_PORT}                          ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${CYAN}Backend${NC}      http://localhost:${BE_PORT}                          ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${CYAN}Health${NC}       http://localhost:${BE_PORT}/api/health                ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${DIM}Your .env and database data were preserved.${NC}                ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}   ${DIM}View logs: docker compose logs -f backend${NC}                  ${GRAY}║${NC}"
echo -e "${GRAY}   ║${NC}                                                              ${GRAY}║${NC}"
echo -e "${GRAY}   ╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
