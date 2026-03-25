FROM node:18-alpine

WORKDIR /app

# Install production dependencies first (layer cache friendly)
COPY package.json package-lock.json* ./
RUN npm install --production --frozen-lockfile

# Copy application source
COPY src/ ./src/

EXPOSE 5000

CMD ["node", "src/index.js"]
