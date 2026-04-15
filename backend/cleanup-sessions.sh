#!/usr/bin/env bash
# Supprime les sessions expirées de la base SQLite.
# Usage :
#   ./cleanup-sessions.sh            — utilise data.db dans le même dossier
#   ./cleanup-sessions.sh /autre/chemin/data.db
#
# Cron (toutes les heures) :
#   0 * * * * /chemin/vers/backend/cleanup-sessions.sh >> /var/log/cleanup-sessions.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB="${1:-$SCRIPT_DIR/data.db}"

if [[ ! -f "$DB" ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERREUR : base de données introuvable : $DB" >&2
  exit 1
fi

if ! command -v sqlite3 &>/dev/null; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERREUR : sqlite3 n'est pas installé." >&2
  exit 1
fi

DELETED=$(sqlite3 "$DB" "
  DELETE FROM sessions WHERE expires_at < datetime('now');
  SELECT changes();
")

echo "[$(date '+%Y-%m-%d %H:%M:%S')] $DELETED session(s) expirée(s) supprimée(s) (base : $DB)"
