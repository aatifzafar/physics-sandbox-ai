import { describe, it, expect } from 'vitest';
import { calculateParticleDrift } from '../physics/particleDrift.js';

describe('Particle Drift (Drude Model) Physics Engine', () => {
  it('calculates drift velocity and current density under electric field', () => {
    const res = calculateParticleDrift({
      electricField: 100,
      carrierDensity: 8.5e28,
      relaxationTime: 2.5e-14,
      temperature: 300,
    });

    expect(res.results.driftVelocity).toBeGreaterThan(0);
    expect(res.results.driftVelocityFormatted).toContain('mm/s');
    expect(res.results.conductivity).toBeGreaterThan(0);
    expect(res.results.currentDensity).toBeGreaterThan(0);
    expect(res.trajectory.length).toBeGreaterThan(10);
  });
});
