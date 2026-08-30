#!/bin/bash

# kizuna-core installer: applies core schema (kizuna-core/sql/*.sql) plus any
# requested plugins (kizuna-core/plugins/<name>/0001_*.sql).
#
# Usage:
#   ./scripts/install.sh --db-url "$DATABASE_URL" --plugins user_data,onboarding,agenda
#   ./scripts/install.sh --db-url "$DATABASE_URL" --plugins-file path/to/kizuna.plugins.json
#
# --db-url can be omitted if $DATABASE_URL is already set in the environment.
# --plugins and --plugins-file are mutually exclusive; exactly one is required.
#
# Generic by design: knows nothing about any specific consuming project, only
# receives a plugin list by name.

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Instalando kizuna-core..."
echo ""

# Resolve directories relative to this script, regardless of caller's cwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SQL_DIR="$CORE_DIR/sql"
PLUGINS_DIR="$CORE_DIR/plugins"

DB_URL="${DATABASE_URL:-}"
PLUGINS_CSV=""
PLUGINS_FILE=""

# --- parse args -------------------------------------------------------------

while [ "$#" -gt 0 ]; do
  case "$1" in
    --db-url)
      DB_URL="$2"
      shift 2
      ;;
    --plugins)
      PLUGINS_CSV="$2"
      shift 2
      ;;
    --plugins-file)
      PLUGINS_FILE="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}❌ ERROR: argumento desconhecido: $1${NC}"
      exit 1
      ;;
  esac
done

if [ -z "$DB_URL" ]; then
  echo -e "${RED}❌ ERROR: DATABASE_URL não definida${NC}"
  echo ""
  echo "Defina a variável de ambiente ou passe --db-url:"
  echo '  export DATABASE_URL="postgresql://user:password@localhost/dbname"'
  echo '  ./scripts/install.sh --db-url "$DATABASE_URL" --plugins user_data,onboarding'
  exit 1
fi

if [ -n "$PLUGINS_CSV" ] && [ -n "$PLUGINS_FILE" ]; then
  echo -e "${RED}❌ ERROR: passe --plugins OU --plugins-file, não os dois${NC}"
  exit 1
fi

if [ -z "$PLUGINS_CSV" ] && [ -z "$PLUGINS_FILE" ]; then
  echo -e "${RED}❌ ERROR: informe a lista de plugins via --plugins <a,b,c> ou --plugins-file <path>${NC}"
  exit 1
fi

# --- resolve plugin list -----------------------------------------------------

PLUGINS=()

if [ -n "$PLUGINS_CSV" ]; then
  IFS=',' read -ra PLUGINS <<< "$PLUGINS_CSV"
else
  if [ ! -f "$PLUGINS_FILE" ]; then
    echo -e "${RED}❌ ERROR: arquivo de plugins não encontrado: $PLUGINS_FILE${NC}"
    exit 1
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}❌ ERROR: node é necessário para ler --plugins-file (parse de JSON)${NC}"
    exit 1
  fi

  PLUGINS_CSV_FROM_FILE="$(node -e '
    const fs = require("fs");
    const path = process.argv[1];
    let json;
    try {
      json = JSON.parse(fs.readFileSync(path, "utf8"));
    } catch (err) {
      console.error("invalid JSON: " + err.message);
      process.exit(1);
    }
    if (!json || !Array.isArray(json.plugins)) {
      console.error("expected an object with a \"plugins\" array");
      process.exit(1);
    }
    process.stdout.write(json.plugins.join(","));
  ' "$PLUGINS_FILE")" || {
    echo -e "${RED}❌ ERROR: falha ao ler $PLUGINS_FILE${NC}"
    exit 1
  }

  IFS=',' read -ra PLUGINS <<< "$PLUGINS_CSV_FROM_FILE"
fi

# --- validate plugin folders up front, before touching the database --------

for plugin in "${PLUGINS[@]}"; do
  plugin="$(echo "$plugin" | xargs)" # trim whitespace
  if [ -z "$plugin" ]; then
    continue
  fi
  if [ ! -d "$PLUGINS_DIR/$plugin" ]; then
    echo -e "${RED}❌ ERROR: plugin '$plugin' não encontrado em $PLUGINS_DIR${NC}"
    exit 1
  fi
done

# --- apply core sql/*.sql in order ------------------------------------------

echo -e "${YELLOW}1️⃣ Core (kizuna-core/sql)...${NC}"
for file in $(ls "$SQL_DIR"/*.sql | sort -V); do
  echo "   → $(basename "$file")"
  psql "$DB_URL" -f "$file" > /dev/null
done
echo -e "${GREEN}✅ Core aplicado${NC}"
echo ""

# --- apply requested plugins -------------------------------------------------

if [ "${#PLUGINS[@]}" -eq 0 ]; then
  echo -e "${YELLOW}Nenhum plugin solicitado.${NC}"
else
  echo -e "${YELLOW}2️⃣ Plugins...${NC}"
  for plugin in "${PLUGINS[@]}"; do
    plugin="$(echo "$plugin" | xargs)"
    if [ -z "$plugin" ]; then
      continue
    fi

    plugin_files=("$PLUGINS_DIR/$plugin"/0001_*.sql)
    if [ ! -e "${plugin_files[0]}" ]; then
      echo -e "${RED}❌ ERROR: nenhum 0001_*.sql encontrado em $PLUGINS_DIR/$plugin${NC}"
      exit 1
    fi

    for file in "${plugin_files[@]}"; do
      echo "   → $plugin: $(basename "$file")"
      psql "$DB_URL" -f "$file" > /dev/null
    done
  done
  echo -e "${GREEN}✅ Plugins aplicados${NC}"
fi

echo ""
echo -e "${GREEN}✨ Instalação do kizuna-core concluída!${NC}"
