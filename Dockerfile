FROM node:20-slim AS build
WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Production stage ──
FROM node:20-slim

# Install Chromium for whatsapp-web.js (Puppeteer)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       chromium \
       ca-certificates \
       fonts-liberation \
       libnss3 \
       libatk-bridge2.0-0 \
       libx11-xcb1 \
       libxcomposite1 \
       libxrandr2 \
       libgbm1 \
       libasound2 \
       libpangocairo-1.0-0 \
       libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

WORKDIR /app

# Copy production files
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma

EXPOSE 3000

# Default: run the API server
# Override with: node dist/workers/start.js for the workers service
CMD ["node", "dist/index.js"]
