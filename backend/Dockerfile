# ────────────────────────────────────────────────────────────────────────────
# Stage 1 — install ALL deps (including dev) for build
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps-all
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
# Skip Puppeteer's browser download — the runner uses system Chromium (Alpine musl-compatible)
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci

# ────────────────────────────────────────────────────────────────────────────
# Stage 2 — install only production deps
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps-prod
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
# Skip Puppeteer's browser download — the runner uses system Chromium (Alpine musl-compatible)
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci --omit=dev

# ────────────────────────────────────────────────────────────────────────────
# Stage 3 — build TypeScript → JavaScript
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps-all /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# Rewrite @/* path aliases in compiled output to relative paths
RUN npx tsc-alias -p tsconfig.json

# ────────────────────────────────────────────────────────────────────────────
# Stage 4 — minimal production runner
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Chromium and runtime libraries for Puppeteer PDF generation.
# Alpine's musl-compiled Chromium is used in preference to Puppeteer's bundled
# glibc binary, which does not run reliably on musl-based images.
# Package list covers TLS, font shaping, font rendering and trusted CA roots.
# Note: /usr/bin/chromium-browser is the Alpine `chromium` apk install path;
# verify with `docker run --rm <image> which chromium-browser` after build.
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to use system Chromium; skip any residual download attempts.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Production node_modules
COPY --from=deps-prod /app/node_modules ./node_modules

# Compiled Prisma client (generated in build stage)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client/runtime ./node_modules/@prisma/client/runtime

# Compiled application
COPY --from=build /app/dist ./dist

# Prisma schema (needed for migrations and runtime engine lookup)
COPY prisma ./prisma

# Package manifest (needed for some runtime introspection)
COPY package.json ./

COPY scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh && chown -R appuser:appgroup /app
USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["sh", "scripts/start.sh"]
