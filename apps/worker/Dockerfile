# Build context: monorepo root
FROM node:22-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/worker/package.json apps/worker/
COPY apps/api/package.json apps/api/
COPY apps/api/prisma apps/api/prisma
RUN pnpm install --filter @dekanat/worker... --frozen-lockfile=false

FROM deps AS build
WORKDIR /app
COPY apps/worker apps/worker
COPY apps/api/prisma apps/api/prisma
WORKDIR /app/apps/worker
RUN pnpm exec prisma generate --schema ../api/prisma/schema.prisma \
  && pnpm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
WORKDIR /app/apps/worker
CMD ["node", "dist/index.js"]
