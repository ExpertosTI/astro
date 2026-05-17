#!/bin/bash
set -e

# Renace Protocol - Deployment Script
REPO_URL="https://github.com/ExpertosTI/astro.git"
PROJECT_DIR="/opt/astro"
STACK_NAME="astro"
SERVICE_NAME="${STACK_NAME}_astro-web"

echo "🚀 Starting deployment for $STACK_NAME..."

# 1. Sync code via Git
if [ -d "$PROJECT_DIR" ]; then
    echo "📂 Directory exists, pulling latest changes..."
    cd "$PROJECT_DIR"
    git fetch origin renace.tech/clean-astro
    git reset --hard origin/renace.tech/clean-astro
else
    echo "📥 Cloning repository..."
    git clone $REPO_URL $PROJECT_DIR
    cd $PROJECT_DIR
fi

# 2. Check for .env (if project uses one)
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📄 Creating .env from .env.example..."
        cp .env.example .env
        echo "❌ Edit .env with production secrets, then re-run."
        exit 1
    else
        echo "ℹ️ No .env or .env.example found. Proceeding..."
    fi
fi

# 3. Build locally (Optimized for 1-CPU VPS)
echo "🛠 Building image with low priority..."

# Forzar baja prioridad absoluta de CPU e I/O para no interrumpir otros servicios
export DOCKER_BUILDKIT=1
nice -n 19 ionice -c 3 docker compose build --pull

# 4. Ensure RenaceNet exists
echo "🌐 Checking network..."
docker network ls | grep RenaceNet > /dev/null || \
    docker network create --driver overlay RenaceNet

# 5. Deploy stack
echo "🚢 Deploying stack $STACK_NAME..."
if [ -f ".env" ]; then
    set -a; source .env; set +a
fi
docker stack deploy -c docker-compose.yml $STACK_NAME

# 6. Force service to pick up new local image
echo "🔄 Forcing service update..."
docker service update --force $SERVICE_NAME 2>/dev/null || true

# 7. Cleanup
echo "🧹 Cleaning up old images..."
docker image prune -f

# 8. Health check
echo "✅ Deployed! Check status with:"
echo "docker service logs -f $SERVICE_NAME"
echo "docker stack ps $STACK_NAME"
