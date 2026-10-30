#!/usr/bin/env bash
# Ensaio de backup/restauração: faz um backup real, restaura num banco descartável, confere e testa as recusas
# (senha errada, arquivo adulterado, banco já existente, criptografia obrigatória). Não altera o banco de origem.
#
#   PGPASSWORD=instagram scripts/backup/testar-backup.sh        # banco do docker-compose.dev.yml (já migrado)
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
exigir pg_dump; exigir psql; exigir gpg
dir="$(dirname "${BASH_SOURCE[0]}")"

tmp="$(mktemp -d)"; scratch="instagram_ensaio_$$"; ok=0; falha=0
limpar() { for b in "$scratch" "${scratch}_x" "${scratch}_y" "${scratch}_vazio"; do psql -d postgres -qc "drop database if exists \"$b\" with (force)" 2>/dev/null; done; rm -rf "$tmp"; }
trap limpar EXIT
passa() { echo "  ok   $1"; ok=$((ok+1)); }
quebra() { echo "  FALHA $1"; falha=$((falha+1)); }
deve_dar_certo() { local d="$1"; shift; if "$@" >"$tmp/saida" 2>&1; then passa "$d"; else quebra "$d"; sed 's/^/       /' "$tmp/saida" | tail -5; fi; }
deve_falhar() { local d="$1"; shift; if "$@" >"$tmp/saida" 2>&1; then quebra "$d (era para recusar)"; else passa "$d"; fi; }

export BACKUP_DIR="$tmp/backups" BACKUP_PASSPHRASE="senha-do-ensaio-$$"
echo "Origem: banco '$PGDATABASE' em $PGHOST:$PGPORT"

echo "Backup"
deve_dar_certo "gera o backup criptografado" "$dir/backup.sh"
arquivo="$(ls "$BACKUP_DIR"/instagram-*.tar.gpg 2>/dev/null | head -1)"
[ -f "$arquivo" ] && [ -f "$arquivo.sha256" ] && passa "gera o .tar.gpg e o .sha256" || { quebra "arquivos do backup ausentes"; exit 1; }
grep -aq "PGDMP" "$arquivo" && quebra "o conteúdo do dump aparece em claro no arquivo criptografado" || passa "o arquivo não mostra o conteúdo em claro"
deve_falhar "BACKUP_EXIGIR_CRIPTOGRAFIA=1 sem senha é recusado" env -u BACKUP_PASSPHRASE BACKUP_EXIGIR_CRIPTOGRAFIA=1 "$dir/backup.sh"

psql -d postgres -qc "create database \"${scratch}_vazio\""
deve_falhar "banco sem o esquema da aplicação é recusado" env PGDATABASE="${scratch}_vazio" "$dir/backup.sh"

echo "Restauração"
deve_dar_certo "restaura e confere (esquema, contagens)" "$dir/restaurar.sh" "$arquivo" --banco "$scratch"
deve_falhar "não escreve por cima de banco existente" "$dir/restaurar.sh" "$arquivo" --banco "$scratch"
deve_falhar "recusa restaurar sobre o banco de origem" "$dir/restaurar.sh" "$arquivo" --banco "$PGDATABASE"
deve_falhar "senha errada é recusada" env BACKUP_PASSPHRASE="errada" "$dir/restaurar.sh" "$arquivo" --banco "${scratch}_x"
deve_dar_certo "--recriar substitui o banco de destino" "$dir/restaurar.sh" "$arquivo" --banco "$scratch" --recriar

echo "Adulteração"
cp "$arquivo" "$tmp/adulterado.tar.gpg"; cp "$arquivo.sha256" "$tmp/adulterado.tar.gpg.sha256"
printf '\xff' | dd of="$tmp/adulterado.tar.gpg" bs=1 seek=200 count=1 conv=notrunc 2>/dev/null
deve_falhar "arquivo alterado é pego pelo checksum" "$dir/restaurar.sh" "$tmp/adulterado.tar.gpg" --banco "${scratch}_y"
rm "$tmp/adulterado.tar.gpg.sha256"
deve_falhar "arquivo alterado é pego pela criptografia (sem checksum)" "$dir/restaurar.sh" "$tmp/adulterado.tar.gpg" --banco "${scratch}_y"
[ -z "$(psql -d postgres -Atqc "select 1 from pg_database where datname in ('${scratch}_x','${scratch}_y')")" ] && passa "recusas não deixam banco pela metade" || quebra "sobrou banco de uma restauração recusada"

echo
echo "Resultado: $ok ok, $falha falha(s)"
[ "$falha" = "0" ]
