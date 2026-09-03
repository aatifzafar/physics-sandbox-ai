import crypto from 'node:crypto';
import { aiService } from './ai.service.js';
import { explanationService } from './explanation.service.js';
import { runSimulation } from '../physics/index.js';
import {
  projectileParametersSchema,
  pendulumParametersSchema,
  harmonicOscillatorParametersSchema,
  particleDriftParametersSchema,
  collisionParametersSchema,
  refractionParametersSchema,
  doubleSlitParametersSchema,
} from '../schemas/simulation.schema.js';
import {
  GenerateSimulationResponse,
  SimulationType,
  SimulationParameters,
} from '../types/simulation.types.js';

export class SimulationService {
  async generateFromPrompt(prompt: string): Promise<GenerateSimulationResponse> {
    // 1. Natural language understanding via Gemini AI service with domain classification & retry
    const {
      simulationType,
      parameters: rawParams,
      modelUsed,
      retries,
      fallbackUsed,
    } = await aiService.extractSimulationParameters(prompt);

    // 2. Validate simulation parameters strictly with Zod
    const validatedParameters = this.validateParameters(
      simulationType,
      rawParams
    );

    // 3. Compute simulation using deterministic physics engine
    const { trajectory, results } = runSimulation(
      simulationType,
      validatedParameters
    );

    // 4. Generate educational explanation based on validated physics calculations
    const explanation = await explanationService.generateExplanation(
      prompt,
      simulationType,
      validatedParameters,
      results
    );

    // 5. Package clean response with metadata
    const simulationId = `sim_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    return {
      success: true,
      simulation: {
        id: simulationId,
        type: simulationType,
        parameters: validatedParameters,
        trajectory,
        results,
      },
      explanation,
      metadata: {
        modelUsed,
        retries,
        fallbackUsed,
        template: simulationType,
      },
    };
  }

  private validateParameters(
    type: SimulationType,
    rawParams: Record<string, any>
  ): SimulationParameters {
    switch (type) {
      case 'double_slit': {
        const parsed = doubleSlitParametersSchema.safeParse(rawParams);
        if (!parsed.success) {
          const firstError =
            parsed.error.issues[0]?.message || 'Invalid double-slit experiment parameters';
          throw new Error(`Parameter validation failed: ${firstError}`);
        }
        return parsed.data;
      }
      case 'refraction': {
        const parsed = refractionParametersSchema.safeParse(rawParams);
        if (!parsed.success) {
          const firstError =
            parsed.error.issues[0]?.message || 'Invalid optical refraction parameters';
          throw new Error(`Parameter validation failed: ${firstError}`);
        }
        return parsed.data;
      }
      case 'particle_drift': {
        const parsed = particleDriftParametersSchema.safeParse(rawParams);
        if (!parsed.success) {
          const firstError =
            parsed.error.issues[0]?.message || 'Invalid particle drift parameters';
          throw new Error(`Parameter validation failed: ${firstError}`);
        }
        return parsed.data;
      }
      case 'collision': {
        const parsed = collisionParametersSchema.safeParse(rawParams);
        if (!parsed.success) {
          const firstError =
            parsed.error.issues[0]?.message || 'Invalid collision parameters';
          throw new Error(`Parameter validation failed: ${firstError}`);
        }
        return parsed.data;
      }
      case 'projectile': {
        const parsed = projectileParametersSchema.safeParse(rawParams);
        if (!parsed.success) {
          const firstError =
            parsed.error.issues[0]?.message || 'Invalid projectile parameters';
          throw new Error(`Parameter validation failed: ${firstError}`);
        }
        return parsed.data;
      }
      case 'pendulum': {
        const parsed = pendulumParametersSchema.safeParse(rawParams);
        if (!parsed.success) {
          const firstError =
            parsed.error.issues[0]?.message || 'Invalid pendulum parameters';
          throw new Error(`Parameter validation failed: ${firstError}`);
        }
        return parsed.data;
      }
      case 'harmonic_oscillator': {
        const parsed = harmonicOscillatorParametersSchema.safeParse(rawParams);
        if (!parsed.success) {
          const firstError =
            parsed.error.issues[0]?.message ||
            'Invalid harmonic oscillator parameters';
          throw new Error(`Parameter validation failed: ${firstError}`);
        }
        return parsed.data;
      }
      default:
        throw new Error(`Unsupported simulation type: ${type}`);
    }
  }
}

export const simulationService = new SimulationService();
