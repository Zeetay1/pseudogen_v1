# ---------- Frontend Dockerfile (Production) ----------

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for efficient caching
COPY package*.json ./

RUN npm install

# Copy the rest of the code
COPY . .

# Build the app for production
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
