import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { DEFAULT_PORT } from './utils/constants.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`⚡ PhysicsAI Backend Server is running`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🌐 Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 AI Provider: Google Gemini (@google/genai)`);
  console.log(`========================================`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Is another instance of this server already running? Try killing it or setting a different PORT in .env.`
    );
    process.exit(1);
  } else {
    console.error('Server encountered an unexpected error:', err);
    process.exit(1);
  }
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down server gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
