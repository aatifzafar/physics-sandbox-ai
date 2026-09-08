import { Request, Response, NextFunction } from 'express';
import { simulationService } from '../services/simulation.service.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { LLMProviderOptions } from '../types/simulation.types.js';

export class SimulationController {
  async generate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { prompt, providerOptions: bodyProviderOptions } = req.body;

      // Extract provider options from body or optional headers
      const providerOptions: LLMProviderOptions = {
        provider:
          bodyProviderOptions?.provider ||
          (req.headers['x-llm-provider'] as any),
        apiKey:
          bodyProviderOptions?.apiKey ||
          (req.headers['x-llm-api-key'] as string),
        model:
          bodyProviderOptions?.model ||
          (req.headers['x-llm-model'] as string),
        baseUrl:
          bodyProviderOptions?.baseUrl ||
          (req.headers['x-llm-base-url'] as string),
      };

      const result = await simulationService.generateFromPrompt(
        prompt,
        providerOptions
      );
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const simulationController = new SimulationController();
