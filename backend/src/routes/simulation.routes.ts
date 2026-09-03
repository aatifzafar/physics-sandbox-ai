import { Router } from 'express';
import { simulationController } from '../controllers/simulation.controller.js';
import { validateBody } from '../middleware/validation.js';
import { generateSimulationRequestSchema } from '../schemas/simulation.schema.js';

const router = Router();

router.post(
  '/generate',
  validateBody(generateSimulationRequestSchema),
  simulationController.generate.bind(simulationController)
);

export default router;
