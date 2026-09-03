import { Router, Request, Response } from 'express';
import { HTTP_STATUS } from '../utils/constants.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'PhysicsAI backend is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
