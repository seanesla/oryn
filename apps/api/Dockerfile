FROM node:22-slim

WORKDIR /app

# Cloud Run sets PORT. Default to 8080.
ENV PORT=8080
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci

EXPOSE 8080

CMD ["npm", "--prefix", "apps/api", "run", "start"]
