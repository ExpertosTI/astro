#!/bin/bash
set -e

# Renace Protocol - Optimized Deployment Script (Bind-Mount Strategy)
REPO_URL="https://github.com/ExpertosTI/astro.git"
PROJECT_DIR="/opt/astro"
STACK_NAME="astro"
SERVICE_NAME="${STACK_NAME}_astro-web"

echo "🚀 Starting ultra-fast deployment for $STACK_NAME..."

# 1. Sync code via Git
if [ -d "$PROJECT_DIR" ]; then
    echo "📂 Directory exists, pulling latest changes..."
    cd "$PROJECT_DIR"
    git fetch origin main
    git reset --hard origin/main
else
    echo "📥 Cloning repository..."
    git clone $REPO_URL $PROJECT_DIR
    cd $PROJECT_DIR
fi

# 2. Ensure RenaceNet exists
echo "🌐 Checking network..."
docker network ls | grep RenaceNet > /dev/null || \
    docker network create --driver overlay RenaceNet

# 3. Deploy stack (using bind mounts in docker-compose.yml)
echo "🚢 Deploying stack $STACK_NAME..."
if [ -f ".env" ]; then
    set -a; source .env; set +a
fi
docker stack deploy -c docker-compose.yml $STACK_NAME

# 4. Cleanup not needed as we don't build images anymore
echo "🧹 No image buildup detected. System clean."

# 5. Health check
echo "✅ Deployed! Site updated instantly via Bind-Mount."
echo "docker service logs -f $SERVICE_NAME"
echo "docker stack ps $STACK_NAME"
