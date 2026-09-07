# Sheettomate API — Railway / production image (monorepo root)
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci

FROM deps AS build
COPY shared ./shared
COPY server ./server
RUN npm run build:api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=build /app/shared ./shared
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/prisma ./server/prisma
COPY --from=build /app/server/package.json ./server/package.json
COPY scripts/railway-start.sh /app/scripts/railway-start.sh
RUN chmod +x /app/scripts/railway-start.sh
WORKDIR /app/server
EXPOSE 4000
CMD ["sh", "/app/scripts/railway-start.sh"]
