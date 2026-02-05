# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=24.13.0

# Build stage
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /usr/src/app

# Install dependencies and build the application
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN npm run build

# Runtime stage
FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV production

WORKDIR /usr/src/app

# Copy package files and install production dependencies
COPY --from=builder /usr/src/app/package.json /usr/src/app/package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Run the application as a non-root user.
USER node

# Expose the port that the application listens on.
EXPOSE 3000

# Run the application.
CMD npm start
