FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install \
  && pnpm --filter @vahanplus/contracts build \
  && pnpm --filter @vahanplus/scraper-bihar-epass build \
  && pnpm --filter @vahanplus/scraper-core build \
  && pnpm --filter @vahanplus/epass-orchestrator build \
  && pnpm --filter @vahanplus/khanan-import build \
  && pnpm --filter @vahanplus/browser-pool build \
  && pnpm --filter @vahanplus/db exec prisma generate \
  && pnpm --filter @vahanplus/db build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production BROWSER_POOL_STUB=true
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/worker ./apps/worker
COPY --from=build /app/packages ./packages
WORKDIR /app/apps/worker
CMD ["node", "src/index.js"]
