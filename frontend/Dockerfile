# ── Stage 1: install deps ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Backend URL — injected at build time so next.config.js rewrites know the target
ARG NEXT_PUBLIC_API_URL=https://ossa-backend-gygcwrc62a-uc.a.run.app
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# ── Stage 3: production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# standalone output: self-contained server.js + minimal node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Cloud Run sets PORT; Next.js standalone server.js reads it
EXPOSE 3000
CMD ["node", "server.js"]
