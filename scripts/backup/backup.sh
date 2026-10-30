#!/usr/bin/env bash
# Backup do banco: pg_dump + manifesto, num único arquivo criptografado.
#
#   PGPASSWORD=... BACKUP_PASSPHRASE=... scripts/backup/backup.sh
#
# Variáveis: PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE · BACKUP_DIR (destino, padrão ./backups)
#            BACKUP_PASSPHRASE · BACKUP_EXIGIR_CRIPTOGRAFIA=1 (recusa gerar backup sem senha)
#            BACKUP_RETENCAO_DIAS (padrão 30) · BACKUP_ENVIAR_CMD (recebe o arquivo como $1, ex.: 'rclone copy "$1" r2:instagram-db-backup/')
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

exigir pg_dump; exigir psql; exigir gpg
if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  [ "${BACKUP_EXIGIR_CRIPTOGRAFIA:-0}" = "1" ] && erro "BACKUP_EXIGIR_CRIPTOGRAFIA=1 e BACKUP_PASSPHRASE não definida."
  aviso "Sem BACKUP_PASSPHRASE o backup NÃO será criptografado, e ele contém as credenciais (cifradas) do painel. Use só para testes."
fi

carimbo="$(date +%Y%m%d-%H%M%S)"
nome="instagram-$carimbo"
mkdir -p "$PASTA_BACKUPS"
chmod 700 "$PASTA_BACKUPS"
trabalho="$(mktemp -d "$PASTA_BACKUPS/.tmp-$carimbo.XXXXXX")"
trap 'rm -rf "$trabalho"' EXIT
umask 077

info "Banco '$PGDATABASE' em $PGHOST:$PGPORT"
versao="$(versao_esquema "$PGDATABASE")"
esquema_valido "$versao" || erro "O banco '$PGDATABASE' não tem o esquema da aplicação (a aplicação já subiu e migrou?). Nada foi salvo."

pg_dump --format=custom --no-owner --no-privileges --file "$trabalho/banco.dump" "$PGDATABASE"

{
  echo "instagram_backup=1"
  echo "criado_em=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "banco=$PGDATABASE"
  echo "versao_esquema=$versao"
  echo "sha256_banco=$(sha256_de "$trabalho/banco.dump")"
  contagens "$PGDATABASE" | sed 's/^/contagem./'
} > "$trabalho/MANIFESTO.txt"

tar -C "$trabalho" -cf "$trabalho/pacote.tar" banco.dump MANIFESTO.txt
if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
  final="$PASTA_BACKUPS/$nome.tar.gpg"
  cifrar "$trabalho/pacote.tar" "$final"
else
  final="$PASTA_BACKUPS/$nome.tar"
  mv "$trabalho/pacote.tar" "$final"
fi
chmod 600 "$final"
echo "$(sha256_de "$final")  $(basename "$final")" > "$final.sha256"
info "Backup criado: $final ($(du -h "$final" | cut -f1)) · esquema v$versao"

# um backup só no mesmo servidor não protege de perda do servidor
if [ -n "${BACKUP_ENVIAR_CMD:-}" ]; then
  info "Enviando…"
  sh -c "$BACKUP_ENVIAR_CMD" _ "$final" || erro "O envio falhou (o backup local foi mantido em $final)."
  sh -c "$BACKUP_ENVIAR_CMD" _ "$final.sha256" || true
else
  aviso "BACKUP_ENVIAR_CMD não definido: o backup ficou só nesta máquina."
fi

find "$PASTA_BACKUPS" -maxdepth 1 -name 'instagram-*.tar*' -mtime "+$RETENCAO_DIAS" -print -delete | sed 's/^/removido (retenção): /' || true
