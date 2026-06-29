#!/bin/bash
# Crea tablas ASTRO Match en PostgreSQL (Insforge/PostgREST)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/../site/scripts/match-schema.sql"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ No se encontró $SQL_FILE"
  exit 1
fi

if [ -n "${POSTGRES_CONTAINER:-}" ]; then
  PG_CONTAINER="$POSTGRES_CONTAINER"
else
  PG_CONTAINER="$(docker ps --format '{{.Names}}' | grep -Ei 'insforge.*postgres|postgres.*insforge' | head -1 || true)"
  if [ -z "$PG_CONTAINER" ]; then
    PG_CONTAINER="$(docker ps --format '{{.Names}}' | grep -Ei 'postgres' | head -1 || true)"
  fi
fi

if [ -z "$PG_CONTAINER" ]; then
  echo "❌ No se encontró contenedor Postgres."
  echo "   Exporta POSTGRES_CONTAINER=nombre_contenedor y vuelve a ejecutar."
  echo "   O aplica manualmente: psql -f $SQL_FILE"
  exit 1
fi

echo "📡 Aplicando schema ASTRO Match en $PG_CONTAINER (db=$POSTGRES_DB)..."
docker exec -i "$PG_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$SQL_FILE"

echo "✓ Tablas creadas. Verificando PostgREST..."
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1/api/insforge/match_profiles?limit=1' 2>/dev/null || echo '000')"
if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ API match_profiles responde OK"
else
  echo "ℹ️  Prueba desde el sitio: curl https://astro.renace.tech/api/insforge/match_profiles?limit=1"
  echo "   (Esperado: [] con HTTP 200 tras crear tablas y recargar PostgREST)"
fi
