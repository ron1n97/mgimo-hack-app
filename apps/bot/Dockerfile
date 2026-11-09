# Build context: monorepo root
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/bot/package.json apps/bot/
COPY packages/shared/package.json packages/shared/
COPY packages/cabinet-tools/package.json packages/cabinet-tools/
RUN pnpm install --filter @dekanat/bot... --frozen-lockfile=false

FROM deps AS build
WORKDIR /app
COPY packages/shared packages/shared
COPY packages/cabinet-tools packages/cabinet-tools
COPY apps/bot apps/bot
RUN pnpm --filter @dekanat/shared run build \
  && pnpm --filter @dekanat/cabinet-tools run build \
  && pnpm --filter @dekanat/bot run build \
  && pnpm --filter @dekanat/bot deploy --prod --legacy /out

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out/ ./
CMD ["node", "dist/index.js"]
