FROM node:22-slim

WORKDIR /app

# Cloud Run sets PORT. Default to 8080.
ENV PORT=8080
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci --include=dev

# Cloud Run needs our start script, which uses tsx.
# Keep devDependencies in the image for hackathon/demo simplicity.
# (Production hardening would compile to dist and run node.)


EXPOSE 8080

CMD ["npm", "--prefix", "apps/api", "run", "start"]
