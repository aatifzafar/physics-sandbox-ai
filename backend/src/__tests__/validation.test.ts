import { describe, it, expect } from 'vitest';
import {
  projectileParametersSchema,
  pendulumParametersSchema,
  harmonicOscillatorParametersSchema,
  generateSimulationRequestSchema,
  geminiExtractedParametersSchema,
} from '../schemas/simulation.schema.js';

describe('Validation Schemas', () => {
  describe('API Request Schema', () => {
    it('should accept valid prompt', () => {
      const result = generateSimulationRequestSchema.safeParse({
        prompt: 'Simulate projectile motion at 45 degrees',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty prompt', () => {
      const result = generateSimulationRequestSchema.safeParse({
        prompt: '   ',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing prompt', () => {
      const result = generateSimulationRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('Projectile Parameters Schema', () => {
    it('should accept valid projectile parameters', () => {
      const result = projectileParametersSchema.safeParse({
        initialVelocity: 25,
        angle: 60,
        gravity: 9.81,
        initialHeight: 2,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative velocity', () => {
      const result = projectileParametersSchema.safeParse({
        initialVelocity: -10,
        angle: 45,
      });
      expect(result.success).toBe(false);
    });

    it('should reject angle > 90', () => {
      const result = projectileParametersSchema.safeParse({
        initialVelocity: 15,
        angle: 120,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Pendulum Parameters Schema', () => {
    it('should accept valid pendulum parameters', () => {
      const result = pendulumParametersSchema.safeParse({
        length: 2.5,
        initialAngle: 45,
        damping: 0.1,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative length', () => {
      const result = pendulumParametersSchema.safeParse({
        length: -2,
        initialAngle: 45,
      });
      expect(result.success).toBe(false);
    });

    it('should reject out-of-range angle', () => {
      const result = pendulumParametersSchema.safeParse({
        length: 2,
        initialAngle: 250,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Harmonic Oscillator Parameters Schema', () => {
    it('should accept valid harmonic oscillator parameters', () => {
      const result = harmonicOscillatorParametersSchema.safeParse({
        mass: 1.5,
        springConstant: 80,
        initialDisplacement: 0.2,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative mass', () => {
      const result = harmonicOscillatorParametersSchema.safeParse({
        mass: -1,
        springConstant: 50,
        initialDisplacement: 1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative spring constant', () => {
      const result = harmonicOscillatorParametersSchema.safeParse({
        mass: 1,
        springConstant: -50,
        initialDisplacement: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Gemini Output Schema', () => {
    it('should accept valid structured output', () => {
      const result = geminiExtractedParametersSchema.safeParse({
        simulationType: 'projectile',
        parameters: {
          initialVelocity: 20,
          angle: 45,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject unsupported simulation type', () => {
      const result = geminiExtractedParametersSchema.safeParse({
        simulationType: 'quantum_teleportation',
        parameters: {},
      });
      expect(result.success).toBe(false);
    });
  });
});
