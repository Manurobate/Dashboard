#!/bin/sh

: "${DB_USER:?Variable DB_USER requise}"
: "${DB_PASSWORD:?Variable DB_PASSWORD requise}"
: "${DB_NAME:?Variable DB_NAME requise}"

BACKUP_DIR="${BACKUP_DIR:-/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/dump_${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

MYSQL_PWD="${DB_PASSWORD}" mariadb-dump \
  --host="${DB_HOST:-db}" \
  --port="${DB_PORT:-3306}" \
  --user="${DB_USER}" \
  --single-transaction \
  --routines \
  --triggers \
  "${DB_NAME}" > "${BACKUP_FILE}" \
  || { echo "[$(date)] ERREUR : dump échoué" >&2; rm -f "${BACKUP_FILE}"; exit 1; }

echo "[$(date)] Dump créé : ${BACKUP_FILE} ($(du -sh "${BACKUP_FILE}" | cut -f1))"

STALE=$(find "${BACKUP_DIR}" -name "dump_*.sql" -mtime +30)
if [ -n "${STALE}" ]; then
  find "${BACKUP_DIR}" -name "dump_*.sql" -mtime +30 -delete
  echo "[$(date)] Nettoyage : dumps de plus de 30 jours supprimés"
fi
