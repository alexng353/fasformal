FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY bun.lock package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/ packages/
RUN bun install --frozen-lockfile

# Build the web app
FROM deps AS build
COPY . .
RUN bun run --filter '@fasformal/web' build

# Production image
FROM base AS runtime
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/apps/api/node_modules apps/api/node_modules
COPY --from=deps /app/apps/web/node_modules apps/web/node_modules
COPY --from=deps /app/packages packages
COPY apps/api apps/api
COPY --from=build /app/apps/web/dist apps/web/dist

ENV NODE_ENV=production
EXPOSE 8888

CMD ["bun", "run", "apps/api/src/index.ts"]
