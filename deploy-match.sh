#!/bin/bash
# Despliega ASTRO Match desde feature/astro-match-app
set -euo pipefail
export DEPLOY_BRANCH=feature/astro-match-app
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/deploy.sh"
