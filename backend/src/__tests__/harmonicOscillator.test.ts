import { describe, it, expect } from 'vitest';
import { calculateHarmonicOscillator } from '../physics/harmonicOscillator.js';

describe('Harmonic Oscillator Physics Engine', () => {
  it('should accurately calculate undamped mass-spring oscillation', () => {
    // mass = 1 kg, springConstant = 100 N/m, initialDisplacement = 0.5 m
    // omega0 = sqrt(100/1) = 10 rad/s
    // naturalFrequency = 10 / (2 * pi) = 1.5915 Hz
    // period = 1 / 1.5915 = 0.628 s
    // max potential energy = 0.5 * 100 * (0.5)^2 = 12.5 J
    const { trajectory, results } = calculateHarmonicOscillator({
      mass: 1.0,
      springConstant: 100,
      initialDisplacement: 0.5,
      damping: 0,
    });

    expect(results.angularFrequency).toBeCloseTo(10, 1);
    expect(results.period).toBeCloseTo(0.63, 1);
    expect(results.dampingRegime).toBe('undamped');
    expect(results.maxDisplacement).toBeCloseTo(0.5, 1);
    expect(results.totalEnergy).toBeCloseTo(12.5, 1);

    expect(trajectory.length).toBeGreaterThan(20);
    expect(trajectory[0].x).toBeCloseTo(0.5, 1);
  });

  it('should correctly classify underdamped system', () => {
    // mass = 2 kg, k = 50 N/m, critical damping = 2 * sqrt(2 * 50) = 20 N*s/m
    // with damping = 4 N*s/m -> dampingRatio = 4 / 20 = 0.2 (underdamped)
    const { results } = calculateHarmonicOscillator({
      mass: 2.0,
      springConstant: 50,
      initialDisplacement: 1.0,
      damping: 4.0,
    });

    expect(results.dampingRatio).toBeCloseTo(0.2, 2);
    expect(results.dampingRegime).toBe('underdamped');
  });

  it('should correctly classify overdamped system', () => {
    // mass = 1 kg, k = 16 N/m, critical damping = 2 * sqrt(16) = 8
    // with damping = 12 -> dampingRatio = 12 / 8 = 1.5 (overdamped)
    const { results } = calculateHarmonicOscillator({
      mass: 1.0,
      springConstant: 16,
      initialDisplacement: 1.0,
      damping: 12.0,
    });

    expect(results.dampingRatio).toBeCloseTo(1.5, 2);
    expect(results.dampingRegime).toBe('overdamped');
  });
});
