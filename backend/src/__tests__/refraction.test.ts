import { describe, it, expect } from 'vitest';
import { calculateRefraction } from '../physics/refraction.js';

describe('Refraction Physics Calculations', () => {
  it('calculates standard Snell law refraction from air to glass', () => {
    const res = calculateRefraction({
      incidentAngle: 45,
      n1: 1.0,
      n2: 1.5,
    });

    expect(res.results.isTotalInternalReflection).toBe(false);
    expect(res.results.refractedAngle).toBeCloseTo(28.13, 1);
    expect(res.results.reflectance).toBeGreaterThan(0);
    expect(res.results.transmittance).toBeGreaterThan(0.8);
    expect(res.trajectory.length).toBeGreaterThanOrEqual(3);
  });

  it('detects total internal reflection when exceeding critical angle from glass to air', () => {
    const res = calculateRefraction({
      incidentAngle: 60,
      n1: 1.5,
      n2: 1.0,
    });

    expect(res.results.isTotalInternalReflection).toBe(true);
    expect(res.results.criticalAngle).toBeCloseTo(41.81, 1);
    expect(res.results.reflectance).toBe(1.0);
    expect(res.results.transmittance).toBe(0.0);
  });
});
