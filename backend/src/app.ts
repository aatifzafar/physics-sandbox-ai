import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import healthRoutes from './routes/health.routes.js';
import simulationRoutes from './routes/simulation.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { DEFAULT_FRONTEND_URL, HTTP_STATUS } from './utils/constants.js';

dotenv.config();

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  const allowedOrigins = (process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL)
    .split(',')
    .map((origin) => origin.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes('*') ||
          allowedOrigins.includes(origin) ||
          (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost'))
        ) {
          return callback(null, true);
        }
        return callback(new Error(`CORS policy does not allow access from ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Request logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api', healthRoutes);
  app.use('/api/simulations', simulationRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested API endpoint was not found.',
      },
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
