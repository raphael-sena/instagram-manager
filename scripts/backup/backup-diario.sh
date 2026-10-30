#!/usr/bin/env bash
# Executa o backup agora e depois a cada BACKUP_INTERVALO_HORAS (padrão 24). Usado pelo serviço "backup" do compose.
# BACKUP_HEARTBEAT_URL (opcional, ex.: healthchecks.io): ping a cada backup bom e "/fail" quando falha.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
horas="${BACKUP_INTERVALO_HORAS:-24}"
avisar() { [ -n "${BACKUP_HEARTBEAT_URL:-}" ] && curl -fsS -m 10 --retry 3 -o /dev/null "$BACKUP_HEARTBEAT_URL$1" || true; }
while true; do
  if ./backup.sh; then echo "[$(date '+%F %T')] backup ok"; avisar ""; else echo "[$(date '+%F %T')] BACKUP FALHOU" >&2; avisar "/fail"; fi
  sleep "$((horas * 3600))"
done
