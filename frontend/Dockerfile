# Multi-stage Dockerfile for UPI Offline Mesh React Frontend

# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (cached if package files don't change)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build static bundle
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
