# =============================================================================
# AgroOps — Dockerfile producción (Next.js 16 standalone)
# Multi-stage. Solo usado para deploy a VPS. Desarrollo Mac es nativo
# (pnpm dev). Requiere next.config.ts con `output: 'standalone'`.
#
# Resultado: imagen ~150MB (vs ~800MB sin standalone).
# Servidor escucha en 0.0.0.0:3000 dentro del contenedor.
# El host (VPS) bindea localhost:3170 → contenedor:3000 vía
# docker-compose.prod.yml (convención SRS offset +170).
# =============================================================================

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time public vars (las runtime van en compose env)
ARG NEXT_PUBLIC_APP_NAME=AgroOps
ARG NEXT_PUBLIC_APP_URL=https://agroops.systemrapid.io
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN pnpm build

# ---- runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# wget viene con alpine pero por si acaso; lo necesita el HEALTHCHECK
RUN apk add --no-cache wget

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# Storage dir para PDFs albarán (HU-17) y backups locales (HU-24).
# El volumen persistente real se monta vía docker-compose.
RUN mkdir -p /app/storage && chown -R nextjs:nodejs /app/storage

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck llama al endpoint REAL /api/health (HU-25).
# Devuelve 200 si DB+Redis OK, 503 si alguno caído (Docker reinicia).
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
