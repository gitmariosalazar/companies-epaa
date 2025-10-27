# Dependencies: Node.js, npm
# Base Image: Node.js official image 24 on alpine linux
FROM node:24-alpine3.22 AS deps
# Set working directory
WORKDIR /usr/src/app
# Copy package.json and package-lock.json
COPY package.json ./
COPY package-lock.json ./
# Install dependencies
RUN npm install --legacy-peer-deps

# Build Stage - docker build -t qrcode-service .
FROM node:24-alpine3.22 AS builder
# Set working directory
WORKDIR /usr/src/app
# Copy the dependencies from the deps stage
COPY --from=deps /usr/src/app/node_modules ./node_modules
# Copy the rest of the application code
COPY . .
# Build the application
RUN npm run build
# Clean up dev dependencies
RUN npm prune --production
RUN npm ci --only --production && npm cache clean --force

# Create the application image
FROM node:24-alpine3.22 AS production
# Set working directory
WORKDIR /usr/src/app
# Copy the built application from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

# Set environment variables
ENV NODE_ENV=production

# Use a non-root user to run the application
USER node

# Expose the application port
EXPOSE 3012
# Start the application
CMD ["node", "dist/main.js"]