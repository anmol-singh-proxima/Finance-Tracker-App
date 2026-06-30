# Build stage for React
FROM node:18-alpine as react-builder

WORKDIR /react-app

# Copy React app
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy React source
COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/vite.config.js ./
COPY frontend/index.html ./

# Build React app
RUN npm run build

# Final stage for Node.js server
FROM node:18-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server source
COPY server/src ./src

# Copy React build to server public directory
COPY --from=react-builder /react-app/dist ./public

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start server
CMD ["npm", "start"]
