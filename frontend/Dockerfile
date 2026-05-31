FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG APP_VERSION=dev
RUN if [ "$APP_VERSION" != "dev" ]; then npm version ${APP_VERSION} --no-git-tag-version --allow-same-version; fi
RUN npm run build

FROM nginx:1.27-alpine AS final
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
