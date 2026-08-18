#!/usr/bin/env bash
# Scaffold a new Capacitor app shell under a target directory.
# Usage:
#   ./scripts/new-capacitor-app.sh --name "My App" --id tech.renace.myapp --dir ../my-app
set -euo pipefail

NAME=""
APP_ID=""
DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name) NAME="$2"; shift 2 ;;
    --id) APP_ID="$2"; shift 2 ;;
    --dir) DIR="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$NAME" || -z "$APP_ID" || -z "$DIR" ]]; then
  echo "Usage: $0 --name \"App Name\" --id tech.renace.slug --dir ../slug"
  exit 1
fi

mkdir -p "$DIR"
cd "$DIR"

if [[ ! -f package.json ]]; then
  npm init -y >/dev/null
fi

npm pkg set name="$(echo "$APP_ID" | tr '.' '-')"
npm pkg set private=true
npm pkg set scripts.build="echo 'Add your static export here → out/'"
npm pkg set scripts.cap:sync="npm run build && npx cap sync"
npm pkg set scripts.cap:ios="npm run cap:sync && npx cap open ios"
npm pkg set scripts.cap:android="npm run cap:sync && npx cap open android"
npm pkg set scripts.ios:archive="./scripts/ios-ship.sh archive"
npm pkg set scripts.ios:upload="./scripts/ios-ship.sh upload"
npm pkg set scripts.ios:ship="./scripts/ios-ship.sh ship"

npm install @capacitor/core @capacitor/ios @capacitor/android
npm install -D @capacitor/cli

npx cap init "$NAME" "$APP_ID" --web-dir out

mkdir -p out scripts
cat > out/index.html <<EOF
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
  <title>$NAME</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0505;color:#ffd89a;font-family:system-ui,sans-serif}
    h1{letter-spacing:.12em;text-transform:uppercase}
  </style>
</head>
<body>
  <h1>$NAME</h1>
</body>
</html>
EOF

# Copy ship script if available next to this factory template
SCRIPT_SRC="$(cd "$(dirname "$0")" && pwd)/ios-ship.sh"
if [[ -f "$SCRIPT_SRC" ]]; then
  cp "$SCRIPT_SRC" scripts/ios-ship.sh
  chmod +x scripts/ios-ship.sh
fi

cat > capacitor.config.ts <<EOF
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "$APP_ID",
  appName: "$NAME",
  webDir: "out",
  server: { androidScheme: "https" },
};

export default config;
EOF

npx cap add ios || true
npx cap add android || true
npx cap sync

echo ""
echo "✅ Scaffolded $NAME ($APP_ID) in $DIR"
echo "Next:"
echo "  1) Replace out/ with your static web build"
echo "  2) cd $DIR && npm run cap:ios   # set Team in Xcode"
echo "  3) npm run ios:ship            # archive + upload when ready"
