# Build context: monorepo root
FROM node:22-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/worker/package.json apps/worker/
COPY apps/api/package.json apps/api/
COPY apps/api/prisma apps/api/prisma
# Install worker + api so Prisma can resolve @prisma/client next to the schema
RUN pnpm install --filter @dekanat/worker... --filter @dekanat/api... --frozen-lockfile=false

FROM deps AS build
WORKDIR /app
COPY apps/worker apps/worker
COPY apps/api/prisma apps/api/prisma
# Generate against apps/api (where schema + @prisma/client live)
WORKDIR /app/apps/api
RUN pnpm exec prisma generate
WORKDIR /app/apps/worker
RUN pnpm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
WORKDIR /app/apps/worker
CMD ["node", "dist/index.js"]
