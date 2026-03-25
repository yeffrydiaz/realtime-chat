'use strict';

require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');

const app = require('./app');
const connectDB = require('./config/db');
const registerSocketHandlers = require('./socket');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  const httpServer = http.createServer(app);

  const pubClient = new createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('Redis pub error:', err));
  subClient.on('error', (err) => console.error('Redis sub error:', err));

  await Promise.all([pubClient.connect(), subClient.connect()]);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.adapter(createAdapter(pubClient, subClient));

  registerSocketHandlers(io);

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  async function shutdown(signal) {
    console.log(`\nReceived ${signal}. Shutting down gracefully…`);
    httpServer.close(async () => {
      try {
        await pubClient.quit();
        await subClient.quit();
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        console.log('All connections closed. Exiting.');
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
