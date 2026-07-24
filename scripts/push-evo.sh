#!/usr/bin/env bash
# ── ASTRO — sync Evolution + Renace SMTP (mismo patrón que ZAV) ──
# Usage:
#   ./scripts/push-evo.sh              # sync secrets + deploy-match
#   ./scripts/push-evo.sh --no-deploy  # solo .evolution.local al VPS
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VPS="${VPS:-root@45.9.191.18}"
REMOTE_DIR="${REMOTE_DIR:-/opt/astro}"
LOCAL_EVO="$ROOT/.evolution.local"
RNV_EVO="${RNV_EVO:-/Users/brainiacx/APPS/rnv-manger/.evolution.local}"
ZAV_EVO="${ZAV_EVO:-/Users/brainiacx/APPS/ZAV/.evolution.local}"
ZAV_ENV="${ZAV_ENV:-/Users/brainiacx/APPS/ZAV/.env}"
DO_DEPLOY=1

for arg in "$@"; do
  case "$arg" in
    --no-deploy) DO_DEPLOY=0 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

cyan()  { printf "\033[36m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*" >&2; }

cd "$ROOT"

cyan "── Building .evolution.local from Renace sources ──"
python3 - <<PY
from pathlib import Path

def parse(path):
    kv = {}
    p = Path(path)
    if not p.exists():
        return kv
    for line in p.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        kv[k.strip()] = v.strip().strip('"').strip("'")
    return kv

rnv = parse("$RNV_EVO")
zav_evo = parse("$ZAV_EVO")
zav_env = parse("$ZAV_ENV")
existing = parse("$LOCAL_EVO")

key = rnv.get("EVOLUTION_API_KEY") or zav_evo.get("EVOLUTION_API_KEY") or existing.get("EVOLUTION_API_KEY") or ""
if not key:
    raise SystemExit("Missing EVOLUTION_API_KEY in rnv-manger / ZAV .evolution.local")

url = rnv.get("EVOLUTION_API_URL") or zav_evo.get("EVOLUTION_API_URL") or "https://evoapi.renace.tech"
# Live instance shared with ZAV
instance = "renace"

admin_wa = ""
for src in (
    existing.get("ADMIN_WHATSAPP"),
    rnv.get("WHATSAPP_NOTIFY_NUMBERS"),
    rnv.get("WHATSAPP_OWNER_NUMBER"),
    zav_evo.get("ADMIN_WHATSAPP"),
):
    if src:
        admin_wa = src.split(",")[0].strip()
        break

smtp_pass = zav_env.get("SMTP_PASS") or existing.get("SMTP_PASS") or ""
smtp_user = zav_env.get("SMTP_USER") or existing.get("SMTP_USER") or "info@renace.tech"
admin_email = zav_env.get("ADMIN_EMAIL") or existing.get("ADMIN_EMAIL") or smtp_user
admin_password = existing.get("ADMIN_PASSWORD") or "2BK2"

out = f"""# ASTRO SDQ — synced from Renace (rnv-manger + ZAV). DO NOT COMMIT.
EVOLUTION_API_URL={url}
EVOLUTION_API_KEY={key}
EVOLUTION_INSTANCE={instance}

ADMIN_WHATSAPP={admin_wa}
ADMIN_PASSWORD={admin_password}
ADMIN_EMAIL={admin_email}

SMTP_PROFILE=hostinger
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER={smtp_user}
SMTP_PASS={smtp_pass}
SMTP_FROM=info@renace.tech
SMTP_FROM_NAME=ASTRO SDQ
SMTP_REPLY_TO={smtp_user}
"""
Path("$LOCAL_EVO").write_text(out)
print(f"instance={instance} key_len={len(key)} smtp_set={bool(smtp_pass)} wa_tail={admin_wa[-4:] if admin_wa else 'EMPTY'}")
PY

chmod 600 "$LOCAL_EVO"
INST="$(grep '^EVOLUTION_INSTANCE=' "$LOCAL_EVO" | cut -d= -f2-)"
KEYLEN="$(grep '^EVOLUTION_API_KEY=' "$LOCAL_EVO" | cut -d= -f2- | tr -d '"' | tr -d "'" | wc -c | tr -d ' ')"
SMTPLEN="$(grep '^SMTP_PASS=' "$LOCAL_EVO" | cut -d= -f2- | tr -d '"' | tr -d "'" | wc -c | tr -d ' ')"
cyan "── Local ready (instance=$INST, evo_key=$KEYLEN chars, smtp_pass=$SMTPLEN chars) ──"

if [ "$SMTPLEN" -lt 8 ]; then
  red "WARNING: SMTP_PASS missing/short — Correo Renace quedará not_configured"
fi

cyan "── Upload .evolution.local → $VPS:$REMOTE_DIR ──"
scp -o StrictHostKeyChecking=accept-new "$LOCAL_EVO" "$VPS:$REMOTE_DIR/.evolution.local"

cyan "── Remote seed${DO_DEPLOY:+ + deploy} ──"
ssh -o StrictHostKeyChecking=accept-new "$VPS" bash -s -- "$REMOTE_DIR" "$DO_DEPLOY" <<'REMOTE'
set -euo pipefail
REMOTE_DIR="$1"
DO_DEPLOY="$2"
cd "$REMOTE_DIR"
chmod 600 .evolution.local

# Fingerprint only (no secrets)
echo "── Evolution / SMTP on server ──"
grep -E '^EVOLUTION_(API_URL|INSTANCE)=' .evolution.local || true
test -n "$(grep '^EVOLUTION_API_KEY=' .evolution.local | cut -d= -f2-)" && echo "EVOLUTION_API_KEY: set" || echo "EVOLUTION_API_KEY: MISSING"
test -n "$(grep '^SMTP_PASS=' .evolution.local | cut -d= -f2-)" && echo "SMTP_PASS: set" || echo "SMTP_PASS: MISSING"
grep -E '^SMTP_(HOST|USER|FROM_NAME)=' .evolution.local || true
WA="$(grep '^ADMIN_WHATSAPP=' .evolution.local | cut -d= -f2-)"
echo "ADMIN_WHATSAPP: …${WA: -4}"

if [ "$DO_DEPLOY" = "1" ]; then
  chmod +x deploy-match.sh
  ./deploy-match.sh
fi
REMOTE

green "✅ ASTRO Evolution + SMTP sync done → $VPS"
green "   Admin → WhatsApp (instance renace) · Correo Renace"
