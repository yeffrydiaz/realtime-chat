FROM node:18-alpine

WORKDIR /app

# Install dependencies first (layer cache friendly)
COPY package.json package-lock.json* ./
RUN npm install

# Copy application source
COPY src/ ./src/
COPY public/ ./public/

EXPOSE 3000

CMD ["npm", "start"]
