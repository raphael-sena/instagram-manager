#!/usr/bin/env bash
# Restaura um backup num banco NOVO e confere o resultado.
#
#   PGPASSWORD=... BACKUP_PASSPHRASE=... scripts/backup/restaurar.sh backups/instagram-20261030-020000.tar.gpg [--banco nome] [--recriar]
#
# Por segurança não escreve por cima de um banco existente. Para substituir o banco de produção, restaure num banco novo,
# confira, e só então troque a configuração da aplicação (ou use --recriar, que apaga e recria o banco de destino).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

exigir pg_restore; exigir psql; exigir gpg
arquivo=""; banco_destino="instagram_restaurado"; recriar=0
while [ $# -gt 0 ]; do
  case "$1" in
    --banco) banco_destino="$2"; shift 2 ;;
    --recriar) recriar=1; shift ;;
    -h|--help) sed -n '2,7p' "$0"; exit 0 ;;
    *) [ -z "$arquivo" ] && arquivo="$1" || erro "Argumento desconhecido: $1"; shift ;;
  esac
done
[ -n "$arquivo" ] && [ -f "$arquivo" ] || erro "Informe o arquivo de backup."
[ "$banco_destino" != "$PGDATABASE" ] || [ "$recriar" = "1" ] || erro "O destino é o mesmo banco de origem ($PGDATABASE). Use outro nome em --banco."

trabalho="$(mktemp -d)"
trap 'rm -rf "$trabalho"' EXIT
umask 077

if [ -f "$arquivo.sha256" ]; then
  [ "$(sha256_de "$arquivo")" = "$(cut -d' ' -f1 < "$arquivo.sha256")" ] || erro "Checksum não confere: o arquivo foi alterado ou está corrompido."
  info "Checksum ok"
else
  aviso "Sem arquivo .sha256 ao lado do backup: a integridade só será verificada pela criptografia (se houver)."
fi

case "$arquivo" in
  *.gpg) decifrar "$arquivo" "$trabalho/pacote.tar" ;;
  *.tar) cp "$arquivo" "$trabalho/pacote.tar" ;;
  *) erro "Extensão não reconhecida (esperado .tar ou .tar.gpg)." ;;
esac
tar -C "$trabalho" -xf "$trabalho/pacote.tar" || erro "Pacote ilegível."
for f in banco.dump MANIFESTO.txt; do [ -f "$trabalho/$f" ] || erro "Pacote incompleto: falta $f."; done
manifesto() { { grep "^$1=" "$trabalho/MANIFESTO.txt" || true; } | head -1 | cut -d= -f2-; }
[ "$(sha256_de "$trabalho/banco.dump")" = "$(manifesto sha256_banco)" ] || erro "banco.dump não confere com o manifesto."
esquema_valido "$(manifesto versao_esquema)" || erro "Manifesto sem versão de esquema válida: este backup não contém o banco da aplicação."
info "Backup de $(manifesto criado_em) · banco '$(manifesto banco)' · esquema v$(manifesto versao_esquema)"

existe="$(psql -d postgres -Atqc "select 1 from pg_database where datname = '$banco_destino'")"
if [ -n "$existe" ]; then
  [ "$recriar" = "1" ] || erro "O banco '$banco_destino' já existe. Escolha outro nome ou use --recriar (apaga o conteúdo dele)."
  psql -d postgres -qc "drop database \"$banco_destino\" with (force)"
fi
psql -d postgres -qc "create database \"$banco_destino\""
info "Restaurando no banco '$banco_destino'…"
pg_restore --no-owner --no-privileges --exit-on-error -d "$banco_destino" "$trabalho/banco.dump"

falhas=0
[ "$(versao_esquema "$banco_destino")" = "$(manifesto versao_esquema)" ] || { aviso "Versão do esquema difere do manifesto."; falhas=$((falhas+1)); }
for linha in $(contagens "$banco_destino"); do
  esperado="$(manifesto "contagem.${linha%%=*}")"
  [ "${linha#*=}" = "$esperado" ] || { aviso "Contagem de ${linha%%=*}: restaurado ${linha#*=}, manifesto $esperado."; falhas=$((falhas+1)); }
done
[ "$falhas" = "0" ] || erro "Restauração concluída COM DIVERGÊNCIAS ($falhas). Não use este banco antes de investigar."
info "Restauração conferida: esquema e contagens batem com o manifesto. Banco: $banco_destino"
