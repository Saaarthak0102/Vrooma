#!/usr/bin/env bash
# ==============================================================================
# VROOMA DATABASE SCHEMA & SEED BACKUP SCRIPT (Linux/macOS)
# Dumps full public/private schemas, RLS policies, functions and seed data.
# ==============================================================================

set -euo pipefail

BACKUP_DIR="./supabase/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PROJECT_ID="${SUPABASE_PROJECT_ID:-eobtzcwinjmimzisypca}"

mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo " Starting Vrooma Database Backup"
echo " Target Project: $PROJECT_ID"
echo " Timestamp:      $TIMESTAMP"
echo "=========================================="

SCHEMA_FILE="$BACKUP_DIR/schema_${TIMESTAMP}.sql"
ROLES_FILE="$BACKUP_DIR/roles_${TIMESTAMP}.sql"
DATA_FILE="$BACKUP_DIR/data_${TIMESTAMP}.sql"

# Check if supabase CLI is available
if command -v supabase &> /dev/null; then
  echo "--> Dumping schema via Supabase CLI..."
  supabase db dump --project-ref "$PROJECT_ID" --schema public,private -f "$SCHEMA_FILE"
  
  echo "--> Dumping database roles..."
  supabase db dump --project-ref "$PROJECT_ID" --role-only -f "$ROLES_FILE" || true

  echo "--> Dumping catalog seed data..."
  supabase db dump --project-ref "$PROJECT_ID" --data-only --use-copy -f "$DATA_FILE" || true

  echo "Backup successfully created in $BACKUP_DIR:"
  ls -lh "$BACKUP_DIR"/*"${TIMESTAMP}"*
elif [ -n "${DATABASE_URL:-}" ]; then
  echo "--> Dumping schema via pg_dump using DATABASE_URL..."
  pg_dump "$DATABASE_URL" --schema=public --schema=private --schema-only --no-owner --no-privileges -f "$SCHEMA_FILE"
  echo "Schema backup successfully created: $SCHEMA_FILE"
else
  echo "[WARNING] Neither 'supabase' CLI nor 'DATABASE_URL' is available."
  echo "Please install supabase CLI (npm i -g supabase) or set DATABASE_URL."
  exit 1
fi

echo "=========================================="
echo " Database Backup Completed Successfully"
echo "=========================================="

