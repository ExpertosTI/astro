#!/usr/bin/env bash
# Capacitor iOS archive + optional App Store Connect upload
# Usage:
#   ./scripts/ios-ship.sh sync|archive|upload|ship
# Env (optional):
#   IOS_DEVELOPMENT_TEAM=XXXXXXXXXX
#   IOS_SCHEME=App
#   IOS_WORKSPACE=ios/App/App.xcworkspace
#   ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_PATH  (App Store Connect API key .p8)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SCHEME="${IOS_SCHEME:-App}"
WORKSPACE="${IOS_WORKSPACE:-ios/App/App.xcworkspace}"
PROJECT="${IOS_PROJECT:-ios/App/App.xcodeproj}"
CONFIG="${IOS_CONFIG:-Release}"
DERIVED="${IOS_DERIVED:-$ROOT/ios/build}"
ARCHIVE_PATH="${IOS_ARCHIVE_PATH:-$DERIVED/App.xcarchive}"
EXPORT_DIR="${IOS_EXPORT_DIR:-$DERIVED/export}"
EXPORT_PLIST="${IOS_EXPORT_PLIST:-$ROOT/scripts/ios-export-options.plist}"
TEAM="${IOS_DEVELOPMENT_TEAM:-M5LFB3VWUY}"

need_macos() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "ERROR: iOS builds require macOS + Xcode"
    exit 1
  fi
}

ensure_tools() {
  need_macos
  command -v xcodebuild >/dev/null || { echo "ERROR: xcodebuild missing - install Xcode"; exit 1; }
  command -v pod >/dev/null || echo "WARN: CocoaPods not found - run: sudo gem install cocoapods"
}

sync_web() {
  echo "-> Building web + Capacitor sync..."
  npm run build
  npx cap sync ios
  if [[ -f ios/App/Podfile ]]; then
    (cd ios/App && pod install)
  fi
}

write_export_plist() {
  mkdir -p "$(dirname "$EXPORT_PLIST")"
  if [[ ! -f "$EXPORT_PLIST" ]]; then
    cat > "$EXPORT_PLIST" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>uploadSymbols</key>
  <true/>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>destination</key>
  <string>export</string>
</dict>
</plist>
PLIST
    echo "OK Wrote ${EXPORT_PLIST}"
  fi
}

archive() {
  ensure_tools
  if [[ ! -d out ]]; then
    echo "-> out/ missing - running sync first"
    sync_web
  fi

  mkdir -p "$DERIVED"
  write_export_plist

  echo "-> Archiving scheme=${SCHEME}..."

  local -a build_cmd
  if [[ -d "$WORKSPACE" ]]; then
    build_cmd=(xcodebuild -workspace "$WORKSPACE")
  else
    build_cmd=(xcodebuild -project "$PROJECT")
  fi
  build_cmd+=(
    -scheme "$SCHEME"
    -configuration "$CONFIG"
    -destination "generic/platform=iOS"
    -archivePath "$ARCHIVE_PATH"
    -allowProvisioningUpdates
  )
  if [[ -n "$TEAM" ]]; then
    build_cmd+=(DEVELOPMENT_TEAM="$TEAM")
  fi
  build_cmd+=(clean archive)

  if command -v xcpretty >/dev/null; then
    "${build_cmd[@]}" | xcpretty
  else
    "${build_cmd[@]}"
  fi

  echo "-> Exporting IPA..."
  rm -rf "$EXPORT_DIR"
  mkdir -p "$EXPORT_DIR"
  xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_DIR" \
    -exportOptionsPlist "$EXPORT_PLIST" \
    -allowProvisioningUpdates

  echo "OK IPA(s):"
  ls -la "$EXPORT_DIR"/*.ipa 2>/dev/null || echo "WARN: No IPA found - set Signing Team in Xcode first"
}

upload() {
  ensure_tools
  local ipa
  ipa="$(ls -1 "$EXPORT_DIR"/*.ipa 2>/dev/null | head -1 || true)"
  if [[ -z "$ipa" ]]; then
    echo "ERROR: No IPA in ${EXPORT_DIR} - run archive first"
    exit 1
  fi

  if [[ -n "${ASC_KEY_ID:-}" && -n "${ASC_ISSUER_ID:-}" && -n "${ASC_KEY_PATH:-}" ]]; then
    echo "-> Uploading with App Store Connect API key..."
    # Ensure altool can find the .p8 (copy/link into private_keys if needed)
    local keys_dir="$HOME/.appstoreconnect/private_keys"
    mkdir -p "$keys_dir"
    if [[ -f "$ASC_KEY_PATH" ]]; then
      cp -f "$ASC_KEY_PATH" "$keys_dir/AuthKey_${ASC_KEY_ID}.p8" 2>/dev/null || true
    fi
    xcrun altool --upload-app \
      --type ios \
      --file "$ipa" \
      --apiKey "$ASC_KEY_ID" \
      --apiIssuer "$ASC_ISSUER_ID"
  else
    echo "-> Opening export folder / Transporter for manual upload"
    echo "IPA: ${ipa}"
    echo "Set ASC_KEY_ID ASC_ISSUER_ID ASC_KEY_PATH for headless upload"
    if command -v open >/dev/null; then
      open -a Transporter "$ipa" 2>/dev/null || open "$EXPORT_DIR"
    fi
  fi
}

ship() {
  sync_web
  archive
  upload
}

cmd="${1:-ship}"
case "$cmd" in
  sync) sync_web ;;
  archive) archive ;;
  upload) upload ;;
  ship) ship ;;
  *)
    echo "Usage: $0 sync|archive|upload|ship"
    exit 1
    ;;
esac
