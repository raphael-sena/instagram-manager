# Backup diário do banco: cliente do PostgreSQL + gpg + rclone (envio ao Cloudflare R2) + os scripts de backup
FROM postgres:16
RUN apt-get update && apt-get install -y --no-install-recommends gnupg tar rclone curl ca-certificates && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /root/.config/rclone && touch /root/.config/rclone/rclone.conf   # remotos vêm só de RCLONE_CONFIG_* (env)
COPY scripts/backup /app/scripts/backup
WORKDIR /app
ENTRYPOINT []
CMD ["bash", "/app/scripts/backup/backup-diario.sh"]
