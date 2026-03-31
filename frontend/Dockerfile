FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build and run in production mode
RUN npm run build
ENV NODE_ENV=production
CMD ["npm", "run", "start"]

EXPOSE 3000
