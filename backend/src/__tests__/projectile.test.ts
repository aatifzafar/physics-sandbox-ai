import { describe, it, expect } from 'vitest';
import { calculateProjectileMotion } from '../physics/projectileMotion.js';

describe('Projectile Motion Physics Engine', () => {
  it('should accurately calculate 45-degree launch metrics', () => {
    // v0 = 20 m/s, theta = 45 deg, g = 9.81 m/s^2, y0 = 0
    const { trajectory, results } = calculateProjectileMotion({
      initialVelocity: 20,
      angle: 45,
      gravity: 9.81,
      initialHeight: 0,
    });

    // Analytical checks:
    // v0y = 20 * sin(45 deg) = 14.142 m/s
    // v0x = 20 * cos(45 deg) = 14.142 m/s
    // t_flight = 2 * 14.142 / 9.81 = 2.883 s
    // H_max = (14.142)^2 / (2 * 9.81) = 10.19 m
    // Range = 14.142 * 2.883 = 40.77 m

    expect(results.maximumHeight).toBeCloseTo(10.19, 1);
    expect(results.timeOfFlight).toBeCloseTo(2.88, 1);
    expect(results.range).toBeCloseTo(40.77, 1);
    expect(results.initialVelocityX).toBeCloseTo(14.14, 1);
    expect(results.initialVelocityY).toBeCloseTo(14.14, 1);

    expect(trajectory.length).toBeGreaterThan(10);
    // Initial position
    expect(trajectory[0].x).toBe(0);
    expect(trajectory[0].y).toBe(0);
    // Final position should land at y ~= 0
    expect(trajectory[trajectory.length - 1].y).toBeCloseTo(0, 1);
  });

  it('should calculate projectile launched from elevated height', () => {
    // v0 = 10 m/s, theta = 0 deg (horizontal launch), y0 = 19.62 m, g = 9.81 m/s^2
    // t_flight = sqrt(2 * 19.62 / 9.81) = 2.0 s
    // Range = 10 * 2.0 = 20.0 m
    // Max height = 19.62 m
    const { results } = calculateProjectileMotion({
      initialVelocity: 10,
      angle: 0,
      gravity: 9.81,
      initialHeight: 19.62,
    });

    expect(results.timeOfFlight).toBeCloseTo(2.0, 1);
    expect(results.range).toBeCloseTo(20.0, 1);
    expect(results.maximumHeight).toBeCloseTo(19.62, 1);
  });

  it('should handle vertical launch (90 degrees)', () => {
    // v0 = 30 m/s, theta = 90 deg, g = 9.81
    // t_flight = 2 * 30 / 9.81 = 6.12 s
    // Range = 0 m
    // Max height = 30^2 / (2 * 9.81) = 45.87 m
    const { results } = calculateProjectileMotion({
      initialVelocity: 30,
      angle: 90,
      gravity: 9.81,
      initialHeight: 0,
    });

    expect(results.range).toBeCloseTo(0, 1);
    expect(results.timeOfFlight).toBeCloseTo(6.12, 1);
    expect(results.maximumHeight).toBeCloseTo(45.87, 1);
  });
});
