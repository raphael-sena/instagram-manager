# Imagens da aplicação, a partir de um único build:
#   docker build --target web    -t instagram-manager-web .
#   docker build --target worker -t instagram-manager-worker .
FROM node:24-alpine AS build
RUN npm install -g pnpm@12.9.1
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ── web: Next.js (standalone) + migrations no boot ───────────────────────────
FROM node:24-alpine AS web
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/dist/migrate.mjs /app/dist/migrate.mjs.map ./dist/
COPY --from=build --chown=node:node /app/drizzle ./drizzle
USER node
EXPOSE 3000
# migrations antes do servidor: se falharem, o container não sobe e o deploy para (a versão anterior já foi substituída,
# mas o banco fica intacto — o CD faz backup antes)
CMD ["sh", "-c", "node --enable-source-maps dist/migrate.mjs && exec node server.js"]

# ── worker: filas, agendamentos e (fase 5) validação de vídeo com ffprobe ────
FROM node:24-alpine AS worker
RUN apk add --no-cache ffmpeg
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/dist/worker.mjs /app/dist/worker.mjs.map ./dist/
USER node
CMD ["node", "--enable-source-maps", "dist/worker.mjs"]
