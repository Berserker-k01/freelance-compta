FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Start the application in dev mode
CMD ["npm", "run", "dev"]

EXPOSE 3000
