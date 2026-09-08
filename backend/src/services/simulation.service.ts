import crypto from 'node:crypto';
import { dynamicSimulationService } from './dynamicSimulation.service.js';
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
  LLMProviderOptions,
} from '../types/simulation.types.js';

export class SimulationService {
  /**
   * Main entrypoint: Intelligently routes prompt to high-fidelity specialized 3D scenes
   * for core physics domains, and to the universal dynamic engine for arbitrary topics.
   */
  async generateFromPrompt(
    prompt: string,
    providerOptions?: LLMProviderOptions
  ): Promise<GenerateSimulationResponse> {
    const trimmed = prompt.trim();
    if (!trimmed) {
      throw new Error('Prompt cannot be empty');
    }

    // 1. Classify domain using multi-LLM service (Agent Router / OpenAI / Gemini / etc.)
    const {
      simulationType,
      parameters: rawParams,
      modelUsed,
      retries,
      fallbackUsed,
    } = await aiService.extractSimulationParameters(trimmed, providerOptions);

    // 2. If classified into a specialized high-fidelity 3D domain, use its specialized 3D engine!
    if (
      simulationType === 'double_slit' ||
      simulationType === 'refraction' ||
      simulationType === 'particle_drift' ||
      simulationType === 'collision' ||
      simulationType === 'projectile' ||
      simulationType === 'pendulum' ||
      simulationType === 'harmonic_oscillator'
    ) {
      const validatedParameters = this.validateParameters(
        simulationType,
        rawParams
      );

      const { trajectory, results } = runSimulation(
        simulationType,
        validatedParameters as any
      );

      const explanation = await explanationService.generateExplanation(
        trimmed,
        simulationType,
        validatedParameters as any,
        results,
        providerOptions
      );

      const simulationId = `sim_${simulationType}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

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
          provider: providerOptions?.provider || 'openai',
        },
      };
    }

    // 3. For any arbitrary / new custom physics topic, generate dynamic 3D simulation!
    return await dynamicSimulationService.generateDynamicSimulation(
      trimmed,
      providerOptions
    );
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
        return rawParams;
    }
  }
}

export const simulationService = new SimulationService();
