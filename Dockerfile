FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src
RUN addgroup -S media && adduser -S media -G media
RUN mkdir -p /tmp/media-api && chown -R media:media /tmp/media-api
USER media

EXPOSE 8000
CMD ["node","src/app.js"]