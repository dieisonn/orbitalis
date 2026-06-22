FROM node:20-alpine AS builder

WORKDIR /app

COPY orbitalis-api/package*.json ./
COPY orbitalis-api/prisma ./prisma/

RUN npm install

COPY orbitalis-api/ .

RUN npx prisma generate && npm run build

# ── Runtime ──────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY orbitalis-api/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY orbitalis-api/prisma ./prisma/

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/src/main"]
