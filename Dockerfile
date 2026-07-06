ARG BASE_IMAGE=mirror.gcr.io/library/node:22-alpine
FROM ${BASE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN if [ -f package-lock.json ]; then npm ci; else npm i; fi

FROM ${BASE_IMAGE} AS builder
WORKDIR /app
ENV NODE_ENV=production

# Variáveis NEXT_PUBLIC_* precisam estar disponíveis em tempo de build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BASE_PATH
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM ${BASE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Sem output "standalone" (incompatível com o custom server): copiamos
# node_modules completo + build do Next + o custom server (server.ts, via tsx).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/server.ts ./server.ts

EXPOSE 3001
CMD ["npm", "run", "start"]
