# ---------- build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- runtime ----------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=4s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
