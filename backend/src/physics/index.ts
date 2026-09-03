import {
  SimulationType,
  SimulationParameters,
  TrajectoryPoint,
  SimulationResults,
  ProjectileParameters,
  PendulumParameters,
  HarmonicOscillatorParameters,
  ParticleDriftParameters,
  CollisionParameters,
  RefractionParameters,
  DoubleSlitParameters,
} from '../types/simulation.types.js';
import { calculateProjectileMotion } from './projectileMotion.js';
import { calculatePendulumMotion } from './pendulum.js';
import { calculateHarmonicOscillator } from './harmonicOscillator.js';
import { calculateParticleDrift } from './particleDrift.js';
import { calculateCollision } from './collision.js';
import { calculateRefraction } from './refraction.js';
import { calculateDoubleSlit } from './doubleSlit.js';

export * from './projectileMotion.js';
export * from './pendulum.js';
export * from './harmonicOscillator.js';
export * from './particleDrift.js';
export * from './collision.js';
export * from './refraction.js';
export * from './doubleSlit.js';

export function runSimulation(
  type: SimulationType,
  parameters: SimulationParameters
): {
  trajectory: TrajectoryPoint[];
  results: SimulationResults;
} {
  switch (type) {
    case 'projectile':
      return calculateProjectileMotion(parameters as ProjectileParameters);
    case 'pendulum':
      return calculatePendulumMotion(parameters as PendulumParameters);
    case 'harmonic_oscillator':
      return calculateHarmonicOscillator(
        parameters as HarmonicOscillatorParameters
      );
    case 'particle_drift':
      return calculateParticleDrift(parameters as ParticleDriftParameters);
    case 'collision':
      return calculateCollision(parameters as CollisionParameters);
    case 'refraction':
      return calculateRefraction(parameters as RefractionParameters);
    case 'double_slit':
      return calculateDoubleSlit(parameters as DoubleSlitParameters);
    default:
      throw new Error(`Unsupported simulation type: ${type}`);
  }
}
