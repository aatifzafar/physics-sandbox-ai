import { describe, it, expect } from 'vitest';
import { dynamicSimulationService } from '../services/dynamicSimulation.service.js';
import { llmService } from '../services/llm.service.js';

describe('Dynamic Simulation & Multi-Provider LLM Engine', () => {
  describe('LLM Service Provider Resolution', () => {
    it('should resolve default model for OpenAI provider', () => {
      const resolved = llmService.resolveProvider({
        provider: 'openai',
        apiKey: 'test-openai-key',
      });
      expect(resolved).not.toBeNull();
      expect(resolved?.provider).toBe('openai');
      expect(resolved?.model).toBe('gpt-4o-mini');
    });

    it('should resolve default model for Anthropic provider', () => {
      const resolved = llmService.resolveProvider({
        provider: 'anthropic',
        apiKey: 'test-anthropic-key',
      });
      expect(resolved).not.toBeNull();
      expect(resolved?.provider).toBe('anthropic');
      expect(resolved?.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should resolve default model for Groq provider', () => {
      const resolved = llmService.resolveProvider({
        provider: 'groq',
        apiKey: 'test-groq-key',
      });
      expect(resolved).not.toBeNull();
      expect(resolved?.provider).toBe('groq');
      expect(resolved?.model).toBe('llama-3.3-70b-versatile');
    });

    it('should allow custom model override', () => {
      const resolved = llmService.resolveProvider({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'o3-mini',
      });
      expect(resolved?.model).toBe('o3-mini');
    });
  });

  describe('Procedural Physics Synthesis for Arbitrary Topics', () => {
    it('should automatically generate 3-body gravitational orbital dynamics for celestial prompts', async () => {
      const res = await dynamicSimulationService.generateDynamicSimulation(
        'Three-body gravitational orbital problem with chaotic planetary trajectories'
      );

      expect(res.success).toBe(true);
      expect(res.simulation.type).toBe('dynamic');
      expect(res.simulation.dynamicDefinition).toBeDefined();
      expect(res.simulation.dynamicDefinition?.physics.engineType).toBe('nbody_gravity');
      expect(res.simulation.dynamicDefinition?.entities.length).toBeGreaterThanOrEqual(3);
      expect(res.explanation.title).toContain('Three-Body');
      expect(res.explanation.equations.length).toBeGreaterThan(0);
    });

    it('should automatically generate Lorentz EM helical simulation for magnetic field prompts', async () => {
      const res = await dynamicSimulationService.generateDynamicSimulation(
        'Lorentz force on charged ions in a helical magnetic field'
      );

      expect(res.success).toBe(true);
      expect(res.simulation.type).toBe('dynamic');
      expect(res.simulation.dynamicDefinition?.physics.engineType).toBe('lorentz_em');
      expect(res.simulation.dynamicDefinition?.entities.some((e) => e.physicsRole === 'body')).toBe(true);
      expect(res.explanation.title).toContain('Lorentz Force');
    });

    it('should automatically generate fluid vortex simulation for hydrodynamics prompts', async () => {
      const res = await dynamicSimulationService.generateDynamicSimulation(
        '3D fluid vortex streamlines with circulation'
      );

      expect(res.success).toBe(true);
      expect(res.simulation.type).toBe('dynamic');
      expect(res.simulation.dynamicDefinition?.physics.engineType).toBe('fluid_vortex');
      expect(res.explanation.equations.length).toBeGreaterThan(0);
    });

    it('should automatically generate wave equation simulation for quantum/wave prompts', async () => {
      const res = await dynamicSimulationService.generateDynamicSimulation(
        'Quantum wave packet dispersion and wave equation'
      );

      expect(res.success).toBe(true);
      expect(res.simulation.type).toBe('dynamic');
      expect(res.simulation.dynamicDefinition?.physics.engineType).toBe('wave_equation');
      expect(res.simulation.dynamicDefinition?.parameters.length).toBeGreaterThan(0);
    });
  });
});
