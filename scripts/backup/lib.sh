#!/usr/bin/env bash
# Funções comuns de backup/restauração. Não executar direto: é carregado pelos outros scripts desta pasta.
# Adaptado do Bellitas (mesmo formato de pacote), sem a parte de fotos: as mídias do Instagram Manager são
# transitórias (apagadas depois da publicação, D4) e não entram no backup.

# Conexão: variáveis padrão do libpq. Os padrões abaixo são os do docker-compose.dev.yml.
export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-5434}"
export PGUSER="${PGUSER:-instagram}"
export PGDATABASE="${PGDATABASE:-instagram}"

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PASTA_BACKUPS="${BACKUP_DIR:-$RAIZ/backups}"
RETENCAO_DIAS="${BACKUP_RETENCAO_DIAS:-30}"

# Tabelas conferidas no manifesto e depois da restauração (acrescentar as novas a cada fase)
TABELAS_CONFERIDAS="${BACKUP_TABELAS:-configuracao}"

erro() { echo "ERRO: $*" >&2; exit 1; }
aviso() { echo "AVISO: $*" >&2; }
info() { echo "==> $*"; }

exigir() { command -v "$1" >/dev/null 2>&1 || erro "'$1' não encontrado. Instale o cliente do PostgreSQL (pg_dump/pg_restore/psql) e o gpg."; }

sha256_de() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

contagens() { # banco
  local banco="$1" t n
  for t in $TABELAS_CONFERIDAS; do
    n="$(psql -d "$banco" -Atqc "select count(*) from $t")" || return 1
    echo "$t=$n"
  done
}

# Versão do esquema = quantidade de migrations do Drizzle aplicadas
versao_esquema() {
  psql -d "$1" -Atqc "select count(*) from drizzle.__drizzle_migrations" 2>/dev/null || true
}

# Banco vazio, ou que a aplicação ainda não migrou, não é um backup válido.
esquema_valido() { [[ "${1:-}" =~ ^[1-9][0-9]*$ ]]; }

# Criptografia simétrica com integridade (gpg AES-256): adulterar o arquivo ou errar a senha faz a abertura falhar.
cifrar() { # entrada saida
  gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 --symmetric --cipher-algo AES256 --compress-algo none \
    --output "$2" "$1" 3<<<"$BACKUP_PASSPHRASE"
}
decifrar() { # entrada saida
  [ -n "${BACKUP_PASSPHRASE:-}" ] || erro "Este backup é criptografado: defina BACKUP_PASSPHRASE."
  gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 --decrypt --output "$2" "$1" 3<<<"$BACKUP_PASSPHRASE" 2>/dev/null \
    || erro "Não foi possível abrir o backup: senha errada ou arquivo adulterado/corrompido."
}
