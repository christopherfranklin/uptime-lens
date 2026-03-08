FROM node:22-slim AS builder
WORKDIR /app
COPY worker/package*.json ./worker/
RUN cd worker && npm ci
COPY worker/tsconfig.json ./worker/
COPY worker/src/ ./worker/src/
COPY lib/ ./lib/
RUN cd worker && npm run build

FROM node:22-slim
WORKDIR /app
COPY worker/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/worker/dist ./dist/
EXPOSE 3001
CMD ["node", "dist/worker/src/index.js"]
