import { describe, it, expect } from 'vitest';
import { calculateCollision } from '../physics/collision.js';

describe('2-Body Collision Physics Engine', () => {
  it('conserves momentum in an elastic collision', () => {
    const res = calculateCollision({
      mass1: 2.0,
      mass2: 1.0,
      velocity1: 4.0,
      velocity2: -2.0,
      elasticity: 1.0,
    });

    expect(res.results.initialMomentum).toBeCloseTo(res.results.finalMomentum, 2);
    expect(res.results.initialKineticEnergy).toBeCloseTo(res.results.finalKineticEnergy, 2);
    expect(res.results.collisionType).toBe('elastic');
  });
});
