FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install node-pg-migrate
COPY src/ src/
COPY migrations/ migrations/
COPY docker-entrypoint.sh ./

RUN mkdir -p uploads && chown -R node:node /app
USER node

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
