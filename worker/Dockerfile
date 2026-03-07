FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
RUN npm run build
COPY dist/ ./dist/
EXPOSE 3001
CMD ["node", "dist/index.js"]
