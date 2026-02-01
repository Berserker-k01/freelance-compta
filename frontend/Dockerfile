FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build the application
RUN npm run build

# Start the application
CMD ["npm", "start"]

EXPOSE 3000
