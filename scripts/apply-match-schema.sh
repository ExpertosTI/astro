#!/bin/bash
# Crea tablas ASTRO Match en PostgreSQL (Insforge/PostgREST)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/../site/scripts/match-schema.sql"

usage() {
  cat <<'EOF'
Uso:
  ./scripts/apply-match-schema.sh          # aplica schema (auto-detecta contenedor y usuario)
  ./scripts/apply-match-schema.sh discover # muestra contenedor, env y roles disponibles

Variables opcionales:
  POSTGRES_CONTAINER   nombre del contenedor o servicio swarm (ej. insforge_postgres)
  POSTGRES_USER        usuario psql (si no, se lee del contenedor)
  POSTGRES_DB          base de datos (si no, se lee del contenedor)
EOF
}

resolve_pg_container() {
  local hint="${1:-}"

  if [ -n "$hint" ]; then
    if docker ps --format '{{.Names}}' | grep -qx "$hint"; then
      echo "$hint"
      return 0
    fi
    local task
    task="$(docker ps --format '{{.Names}}' | grep -E "^${hint}\\.[0-9]+\\." | head -1 || true)"
    if [ -n "$task" ]; then
      echo "$task"
      return 0
    fi
  fi

  local found
  found="$(docker ps --format '{{.Names}}' | grep -Ei 'insforge.*postgres|postgres.*insforge' | head -1 || true)"
  if [ -n "$found" ]; then
    echo "$found"
    return 0
  fi

  docker ps --format '{{.Names}}' | grep -Ei 'postgres' | head -1 || true
}

read_container_env() {
  local container="$1"
  local key="$2"
  docker exec "$container" sh -c "printenv $key 2>/dev/null" 2>/dev/null | tr -d '\r' || true
}

discover_credentials() {
  local container="$1"
  local user db

  user="$(read_container_env "$container" POSTGRES_USER)"
  db="$(read_container_env "$container" POSTGRES_DB)"

  if [ -z "$user" ]; then
    user="$(read_container_env "$container" PGUSER)"
  fi
  if [ -z "$db" ]; then
    db="$(read_container_env "$container" PGDATABASE)"
  fi

  # Insforge / stacks custom suelen usar estos nombres
  if [ -z "$user" ]; then
    for candidate in insforge admin supabase; do
      if docker exec "$container" psql -U "$candidate" -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
        user="$candidate"
        break
      fi
    done
  fi

  if [ -z "$db" ] && [ -n "$user" ]; then
    if docker exec "$container" psql -U "$user" -d "$user" -c 'SELECT 1' >/dev/null 2>&1; then
      db="$user"
    elif docker exec "$container" psql -U "$user" -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
      db="postgres"
    elif docker exec "$container" psql -U "$user" -d insforge -c 'SELECT 1' >/dev/null 2>&1; then
      db="insforge"
    fi
  fi

  echo "${user}|${db}"
}

run_discover() {
  local container
  container="$(resolve_pg_container "${POSTGRES_CONTAINER:-}")"

  echo "=== Contenedores Postgres ==="
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | grep -Ei 'postgres|NAMES' || true
  echo ""

  if [ -z "$container" ]; then
    echo "❌ No hay contenedor Postgres en ejecución."
    exit 1
  fi

  echo "Contenedor seleccionado: $container"
  echo ""
  echo "=== Variables de entorno (postgres) ==="
  docker exec "$container" env 2>/dev/null | grep -Ei 'POSTGRES|PG' || echo "(ninguna)"
  echo ""

  local postgrest
  postgrest="$(docker ps --format '{{.Names}}' | grep -Ei 'insforge.*postgrest|postgrest.*insforge' | head -1 || true)"
  if [ -n "$postgrest" ]; then
    echo "=== PostgREST ($postgrest) ==="
    docker exec "$postgrest" env 2>/dev/null | grep -Ei 'PGRST|POSTGRES|DATABASE' || echo "(ninguna)"
    echo ""
  fi

  local creds user db
  creds="$(discover_credentials "$container")"
  user="${creds%%|*}"
  db="${creds#*|}"

  echo "=== Credenciales detectadas ==="
  echo "POSTGRES_USER=${user:-?}"
  echo "POSTGRES_DB=${db:-?}"
  echo ""
  echo "Comando sugerido:"
  echo "  POSTGRES_CONTAINER=$container POSTGRES_USER=${user:-TU_USER} POSTGRES_DB=${db:-TU_DB} ./scripts/apply-match-schema.sh"
}

apply_schema() {
  if [ ! -f "$SQL_FILE" ]; then
    echo "❌ No se encontró $SQL_FILE"
    exit 1
  fi

  local container
  container="$(resolve_pg_container "${POSTGRES_CONTAINER:-}")"

  if [ -z "$container" ]; then
    echo "❌ No se encontró contenedor Postgres."
    echo "   Ejecuta: ./scripts/apply-match-schema.sh discover"
    exit 1
  fi

  local user="${POSTGRES_USER:-}"
  local db="${POSTGRES_DB:-}"

  if [ -z "$user" ] || [ -z "$db" ]; then
    local creds
    creds="$(discover_credentials "$container")"
    user="${user:-${creds%%|*}}"
    db="${db:-${creds#*|}}"
  fi

  if [ -z "$user" ] || [ -z "$db" ]; then
    echo "❌ No se pudo detectar usuario/base de datos en $container"
    echo "   Ejecuta: ./scripts/apply-match-schema.sh discover"
    exit 1
  fi

  echo "📡 Aplicando schema ASTRO Match en $container (user=$user db=$db)..."

  if ! docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U "$user" -d "$db" < "$SQL_FILE"; then
    echo ""
    echo "❌ Falló psql. Prueba manualmente:"
    echo "   docker exec -i $container psql -U $user -d $db < site/scripts/match-schema.sql"
    echo "   O ejecuta: ./scripts/apply-match-schema.sh discover"
    exit 1
  fi

  echo "✓ Tablas creadas."

  local verify_url="${MATCH_API_VERIFY_URL:-https://astro.renace.tech/api/insforge/match_profiles?limit=1}"
  local http_body http_code
  http_body="$(curl -sS "$verify_url" 2>/dev/null || true)"
  http_code="$(curl -s -o /dev/null -w '%{http_code}' "$verify_url" 2>/dev/null || echo '000')"

  if [ "$http_code" = "200" ]; then
    echo "✓ API match_profiles responde OK: $http_body"
  else
    echo "⚠️  API aún no responde 200 (HTTP $http_code)."
    echo "   Respuesta: $http_body"
    echo "   Puede requerir reiniciar PostgREST: docker service update --force insforge_postgrest"
  fi

  local leads_url="${LEADS_API_VERIFY_URL:-https://astro.renace.tech/api/insforge/leads?limit=1}"
  local leads_code
  leads_code="$(curl -s -o /dev/null -w '%{http_code}' "$leads_url" 2>/dev/null || echo '000')"
  if [ "$leads_code" = "200" ]; then
    echo "✓ API leads responde OK (HTTP $leads_code)"
  else
    echo "⚠️  API leads HTTP $leads_code — si es 404, reaplica schema o reinicia PostgREST"
  fi
}

case "${1:-apply}" in
  discover|info)
    run_discover
    ;;
  apply|"")
    apply_schema
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "Opción desconocida: $1"
    usage
    exit 1
    ;;
esac
