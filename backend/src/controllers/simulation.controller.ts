import { Request, Response, NextFunction } from 'express';
import { simulationService } from '../services/simulation.service.js';
import { HTTP_STATUS } from '../utils/constants.js';

export class SimulationController {
  async generate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { prompt } = req.body;
      const result = await simulationService.generateFromPrompt(prompt);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const simulationController = new SimulationController();
