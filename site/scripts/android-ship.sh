#!/usr/bin/env bash
# Capacitor Android release AAB + optional Play Console upload
# Usage:
#   ./scripts/android-ship.sh sync|bundle|upload|ship|keystore
# Env (signing — required for release):
#   ANDROID_KEYSTORE_PATH   path to .jks / .keystore
#   ANDROID_KEYSTORE_PASSWORD
#   ANDROID_KEY_ALIAS
#   ANDROID_KEY_PASSWORD
# Env (upload — optional, Play Console API):
#   PLAY_SERVICE_ACCOUNT_JSON  path to Google Play service-account JSON
#   PLAY_PACKAGE_NAME          default: tech.renace.astro.match
#   PLAY_TRACK                 internal|alpha|beta|production (default: internal)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PACKAGE="${PLAY_PACKAGE_NAME:-tech.renace.astro.match}"
TRACK="${PLAY_TRACK:-internal}"
AAB_DIR="$ROOT/android/app/build/outputs/bundle/release"
AAB_PATH="$AAB_DIR/app-release.aab"
KEY_PROPS="$ROOT/android/key.properties"
ENV_ANDROID="$ROOT/.env.android"

# Load local secrets if present (never commit)
if [[ -f "$ENV_ANDROID" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_ANDROID"
fi

ensure_java() {
  if command -v java >/dev/null 2>&1 && java -version >/dev/null 2>&1; then
    return 0
  fi
  local studio_jbr="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  if [[ -x "$studio_jbr/bin/java" ]]; then
    export JAVA_HOME="$studio_jbr"
    export PATH="$JAVA_HOME/bin:$PATH"
    return 0
  fi
  echo "ERROR: Java missing. Install Android Studio or set JAVA_HOME"
  exit 1
}

need_android() {
  if [[ ! -d android ]]; then
    echo "ERROR: android/ missing — run npx cap add android"
    exit 1
  fi
  ensure_java
}

write_key_props() {
  if [[ -z "${ANDROID_KEYSTORE_PATH:-}" || -z "${ANDROID_KEYSTORE_PASSWORD:-}" || -z "${ANDROID_KEY_ALIAS:-}" || -z "${ANDROID_KEY_PASSWORD:-}" ]]; then
    echo "ERROR: Set ANDROID_KEYSTORE_PATH ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD"
    exit 1
  fi
  local store_file
  store_file="$(cd "$(dirname "$ANDROID_KEYSTORE_PATH")" && pwd)/$(basename "$ANDROID_KEYSTORE_PATH")"
  if [[ ! -f "$store_file" ]]; then
    echo "ERROR: Keystore not found: $store_file"
    exit 1
  fi
  cat > "$KEY_PROPS" <<EOF
storePassword=${ANDROID_KEYSTORE_PASSWORD}
keyPassword=${ANDROID_KEY_PASSWORD}
keyAlias=${ANDROID_KEY_ALIAS}
storeFile=${store_file}
EOF
  echo "OK Wrote ${KEY_PROPS} (gitignored)"
}

sync_web() {
  echo "-> Building web + Capacitor sync..."
  npm run build
  npx cap sync android
}

bundle() {
  need_android
  if [[ ! -d out ]]; then
    sync_web
  fi
  if [[ ! -f "$KEY_PROPS" ]]; then
    write_key_props
  fi
  echo "-> ./gradlew bundleRelease..."
  (cd android && ./gradlew bundleRelease --quiet)
  if [[ ! -f "$AAB_PATH" ]]; then
    echo "ERROR: AAB not found at $AAB_PATH"
    exit 1
  fi
  echo "OK AAB: $AAB_PATH"
  ls -la "$AAB_PATH"
}

upload() {
  need_android
  if [[ ! -f "$AAB_PATH" ]]; then
    echo "ERROR: No AAB — run bundle first"
    exit 1
  fi

  if [[ -n "${PLAY_SERVICE_ACCOUNT_JSON:-}" && -f "${PLAY_SERVICE_ACCOUNT_JSON}" ]]; then
    if command -v bundletool >/dev/null && command -v java >/dev/null; then
      :
    fi
    if command -v fastlane >/dev/null; then
      echo "-> Uploading with fastlane supply (track=${TRACK})..."
      fastlane supply \
        --aab "$AAB_PATH" \
        --package_name "$PACKAGE" \
        --json_key "$PLAY_SERVICE_ACCOUNT_JSON" \
        --track "$TRACK" \
        --skip_upload_metadata \
        --skip_upload_images \
        --skip_upload_screenshots
      echo "OK Uploaded to Play track=${TRACK}"
      return
    fi
    echo "WARN: fastlane not found — opening AAB folder. Install: gem install fastlane"
  fi

  echo "-> Opening AAB for manual Play Console upload"
  echo "AAB: $AAB_PATH"
  echo "Play Console → ${PACKAGE} → Production/Testing → Create release → upload AAB"
  if command -v open >/dev/null; then
    open "$AAB_DIR"
    open "https://play.google.com/console" 2>/dev/null || true
  fi
}

keystore_create() {
  local out="${ANDROID_KEYSTORE_PATH:-$ROOT/android/astro-match-release.jks}"
  local alias="${ANDROID_KEY_ALIAS:-astro-match}"
  echo "-> Creating keystore at $out (alias=$alias)"
  echo "You will be prompted for passwords and certificate info."
  keytool -genkeypair -v \
    -keystore "$out" \
    -alias "$alias" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000
  echo "OK Keystore created."
  echo "export ANDROID_KEYSTORE_PATH=\"$out\""
  echo "export ANDROID_KEY_ALIAS=\"$alias\""
  echo "export ANDROID_KEYSTORE_PASSWORD='…'"
  echo "export ANDROID_KEY_PASSWORD='…'"
}

ship() {
  sync_web
  bundle
  upload
}

cmd="${1:-ship}"
case "$cmd" in
  sync) sync_web ;;
  bundle) bundle ;;
  upload) upload ;;
  keystore) keystore_create ;;
  ship) ship ;;
  *)
    echo "Usage: $0 sync|bundle|upload|ship|keystore"
    exit 1
    ;;
esac
