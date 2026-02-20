FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# This must be present at build time for client bundles.
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci --include=dev
RUN npm --prefix apps/web run build

EXPOSE 8080

CMD ["npm", "--prefix", "apps/web", "run", "start", "--", "-p", "8080", "-H", "0.0.0.0"]
