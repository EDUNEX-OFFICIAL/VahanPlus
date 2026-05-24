FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile || pnpm install \
  && pnpm --filter @vahan360/db exec prisma generate \
  && pnpm --filter @vahan360/db build \
  && pnpm --filter @vahan360/api-nest build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api-nest/dist ./dist
EXPOSE 3002
ENV NEST_PORT=3002
CMD ["node", "dist/main.js"]
