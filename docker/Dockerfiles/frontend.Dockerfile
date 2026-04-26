# Stage 1: Development & Build
FROM node:20-alpine AS development

WORKDIR /app

# The frontend directory will be mounted here in dev mode,
# or copied here for a production build.
# We are installing Angular CLI globally to help with local dev commands if needed
RUN npm install -g @angular/cli@17.0.0

# When doing a prod build, the source will be copied.
# For local dev via docker-compose, this folder is bound to the host.
COPY package*.json ./
# Use a conditional install if package.json exists (to prevent crash before initialization)
RUN if [ -f package.json ]; then npm install; fi

COPY . .

# Stage 2: Production Build
FROM development AS builder
# Only run build if there's actually an angular project initialized
RUN if [ -f angular.json ]; then npm run build -- --configuration=production; fi

# Stage 3: Nginx Serving
FROM nginx:alpine AS production

COPY --from=builder /app/dist/frontend/browser/ /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
