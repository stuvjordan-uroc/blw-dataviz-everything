FROM node:18-slim
WORKDIR /usr/src/app
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm ci --omit=dev || true
RUN npm run build
CMD ["node", "dist/index.js"]
