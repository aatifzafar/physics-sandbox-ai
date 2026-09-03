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
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void
      ) => {
        // Allow requests with no origin or matching allowed domains
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes('*') ||
          allowedOrigins.includes(origin) ||
          origin.endsWith('.onrender.com') ||
          origin.includes('localhost') ||
          origin.endsWith('.vercel.app') ||
          origin.endsWith('.netlify.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive in production
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
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      success: true,
      service: 'PhysicsAI Backend API',
      status: 'online',
      endpoints: {
        health: '/api/health',
        generate: '/api/simulations/generate (POST)',
      },
    });
  });

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
