FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile || pnpm install \
  && pnpm --filter @vahanplus/contracts build \
  && pnpm --filter @vahanplus/scraper-bihar-epass build \
  && pnpm --filter @vahanplus/epass-orchestrator build \
  && pnpm --filter @vahanplus/khanan-import build \
  && pnpm --filter @vahanplus/db exec prisma generate \
  && pnpm --filter @vahanplus/db build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api-express ./apps/api-express
COPY --from=build /app/packages ./packages
WORKDIR /app/apps/api-express
EXPOSE 3001
CMD ["node", "src/index.js"]
