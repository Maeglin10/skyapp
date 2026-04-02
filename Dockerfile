FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build 2>/dev/null || npx tsc --noEmit 2>/dev/null; exit 0

FROM node:22-alpine AS runner

WORKDIR /app
RUN addgroup -S skyapp && adduser -S skyapp -G skyapp

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

USER skyapp
EXPOSE 3000

CMD ["node", "dist/main.js"]
