# syntax=docker/dockerfile:1
# pharmcare-web — Next.js standalone image for the VPS / pve1.
# Build:  docker build -t pharmcare-web .
#         docker build --target migrate -t pharmcare-migrate .   (drizzle-kit, run once per release)
# Env (DATABASE_URL, HIS_RELAY_URL, …) is supplied at run time, not baked in.

FROM node:24.13.1-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24.13.1-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# env() is validated lazily, so the build needs no runtime secrets.
RUN npm run build

# One-off migration runner: `docker run --rm -e MIGRATION_DATABASE_URL=… pharmcare-migrate`
FROM build AS migrate
CMD ["npx", "drizzle-kit", "migrate"]

FROM node:24.13.1-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Docker sets HOSTNAME to the container id; Next would then bind only to that address.
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1
CMD ["node", "server.js"]
