#!/bin/bash
set -e

# Renace Protocol - Deployment Script
REPO_URL="https://github.com/ExpertosTI/astro.git"
PROJECT_DIR="/opt/astro"
STACK_NAME="astro"
SERVICE_NAME="${STACK_NAME}_astro-web"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

echo "🚀 Starting deployment for $STACK_NAME (branch: $DEPLOY_BRANCH)..."

# 1. Sync code via Git
if [ -d "$PROJECT_DIR" ]; then
    echo "📂 Directory exists, pulling latest changes..."
    cd "$PROJECT_DIR"
    git fetch origin "$DEPLOY_BRANCH"
    git checkout "$DEPLOY_BRANCH" 2>/dev/null || git checkout -b "$DEPLOY_BRANCH" "origin/$DEPLOY_BRANCH"
    git reset --hard "origin/$DEPLOY_BRANCH"
else
    echo "📥 Cloning repository..."
    git clone --branch "$DEPLOY_BRANCH" $REPO_URL $PROJECT_DIR
    cd $PROJECT_DIR
fi

# 2. Load env + Evolution WhatsApp
load_env_file() {
  local file="$1" line key val
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    case "$line" in
      ''|\#*) continue ;;
    esac
    key="${line%%=*}"
    val="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    key="${key#"${key%%[![:space:]]*}"}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    if [[ "$val" =~ ^\"(.*)\"$ ]]; then val="${BASH_REMATCH[1]}"
    elif [[ "$val" =~ ^\'(.*)\'$ ]]; then val="${BASH_REMATCH[1]}"
    fi
    export "$key=$val"
  done < "$file"
}
if [ -f ".env" ]; then
    set -a; source .env; set +a
fi
if [ -f ".evolution.local" ]; then
    load_env_file ".evolution.local"
    echo "✓ Evolution loaded (${EVOLUTION_INSTANCE:-?}) → admin …${ADMIN_WHATSAPP: -4}"
elif [ -n "${EVOLUTION_API_URL:-}" ]; then
    echo "✓ Evolution from .env (${EVOLUTION_INSTANCE:-?})"
else
    echo "⚠️  WhatsApp notify: crea .evolution.local (ver .evolution.local.example)"
fi

# Defaults alineados con ZAV / evoapi Renace
export EVOLUTION_API_URL="${EVOLUTION_API_URL:-https://evoapi.renace.tech}"
export EVOLUTION_INSTANCE="${EVOLUTION_INSTANCE:-renace}"
export SMTP_PROFILE="${SMTP_PROFILE:-hostinger}"
export SMTP_HOST="${SMTP_HOST:-smtp.hostinger.com}"
export SMTP_PORT="${SMTP_PORT:-465}"
export SMTP_USER="${SMTP_USER:-info@renace.tech}"
export SMTP_FROM="${SMTP_FROM:-info@renace.tech}"
export SMTP_FROM_NAME="${SMTP_FROM_NAME:-ASTRO SDQ}"
export SMTP_REPLY_TO="${SMTP_REPLY_TO:-${SMTP_USER}}"
export ADMIN_EMAIL="${ADMIN_EMAIL:-astrosdq@gmail.com}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-2BK2}"
export SITE_URL="${SITE_URL:-https://astro.renace.tech}"

if [ -z "${EVOLUTION_API_KEY:-}" ]; then
  echo "⚠️  EVOLUTION_API_KEY vacío — corre ./scripts/push-evo.sh desde tu Mac"
fi
if [ -z "${SMTP_PASS:-}" ]; then
  echo "⚠️  SMTP_PASS vacío — Correo Renace quedará not_configured (sync desde ZAV/.env)"
else
  echo "✓ SMTP Renace (${SMTP_USER}) pass set (${#SMTP_PASS} chars)"
fi
if [ "${EVOLUTION_INSTANCE}" != "renace" ]; then
  echo "⚠️  EVOLUTION_INSTANCE=${EVOLUTION_INSTANCE} — ZAV usa 'renace'. Corrige .evolution.local"
fi

# 3. Verificar que el build incluye ASTRO Match
if [ ! -f "site/out/match/index.html" ]; then
    echo "❌ ERROR: site/out/match/index.html no existe."
    echo "   Rama actual: $(git branch --show-current) @ $(git rev-parse --short HEAD)"
    echo "   Usa DEPLOY_BRANCH=feature/astro-match-app o ./deploy-match.sh"
    exit 1
fi
echo "✓ Build Match verificado ($(git rev-parse --short HEAD))"

# 3b. Tablas Match en Postgres (Insforge)
if [ -x "scripts/apply-match-schema.sh" ]; then
  echo "📡 Verificando tablas ASTRO Match..."
  ./scripts/apply-match-schema.sh || echo "⚠️  Schema no aplicado — ejecuta scripts/apply-match-schema.sh manualmente"
fi

# 4. Build Docker image (Optimized for 1-CPU VPS)
echo "🛠 Building image with low priority..."

# Forzar baja prioridad absoluta de CPU e I/O para no interrumpir otros servicios
export DOCKER_BUILDKIT=1
nice -n 19 ionice -c 3 docker compose build --pull

# 5. Ensure RenaceNet exists
echo "🌐 Checking network..."
docker network ls | grep RenaceNet > /dev/null || \
    docker network create --driver overlay RenaceNet

# 6. Deploy stack
echo "🚢 Deploying stack $STACK_NAME..."
docker stack deploy -c docker-compose.yml $STACK_NAME

# 7. Force service to pick up new local image
echo "🔄 Forcing service update..."
docker service update --force $SERVICE_NAME 2>/dev/null || true
docker service update --force ${STACK_NAME}_notify 2>/dev/null || true

# 8. Cleanup
echo "🧹 Cleaning up old images..."
docker image prune -f

# 9. Health check
echo "✅ Deployed branch $DEPLOY_BRANCH @ $(git rev-parse --short HEAD)"
echo "docker service logs -f $SERVICE_NAME"
echo "docker stack ps $STACK_NAME"
