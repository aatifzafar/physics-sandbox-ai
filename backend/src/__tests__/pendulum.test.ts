import { describe, it, expect } from 'vitest';
import { calculatePendulumMotion } from '../physics/pendulum.js';

describe('Pendulum Physics Engine', () => {
  it('should accurately calculate small-angle pendulum period and trajectory', () => {
    // Length = 1m, initialAngle = 10 deg, g = 9.81
    // Theoretical period T = 2 * pi * sqrt(1 / 9.81) = 2.006 s
    const { trajectory, results } = calculatePendulumMotion({
      length: 1.0,
      initialAngle: 10,
      mass: 1.0,
      gravity: 9.81,
      damping: 0,
    });

    expect(results.period).toBeCloseTo(2.01, 1);
    expect(results.naturalFrequency).toBeCloseTo(0.5, 1);
    expect(results.maxDisplacementAngle).toBeCloseTo(10, 1);
    expect(trajectory.length).toBeGreaterThan(20);

    // Initial bob angle should be ~10 degrees
    expect(trajectory[0].angle).toBeCloseTo(10, 1);

    // Initial kinetic energy should be 0 (released from rest)
    expect(trajectory[0].kineticEnergy).toBeCloseTo(0, 2);
  });

  it('should demonstrate energy decay when damping is present', () => {
    const { trajectory } = calculatePendulumMotion({
      length: 1.5,
      initialAngle: 30,
      mass: 1.0,
      gravity: 9.81,
      damping: 0.5,
    });

    const initialTotalEnergy = trajectory[0].totalEnergy ?? 0;
    const finalTotalEnergy = trajectory[trajectory.length - 1].totalEnergy ?? 0;

    expect(finalTotalEnergy).toBeLessThan(initialTotalEnergy);
  });
});
