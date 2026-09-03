import {
  CollisionParameters,
  CollisionResults,
  TrajectoryPoint,
} from '../types/simulation.types.js';

export function calculateCollision(
  params: CollisionParameters
): {
  trajectory: TrajectoryPoint[];
  results: CollisionResults;
} {
  const m1 = params.mass1 ?? 2.0;
  const m2 = params.mass2 ?? 1.0;
  const v1 = params.velocity1 ?? 5.0;
  const v2 = params.velocity2 ?? -3.0;
  const e = params.elasticity !== undefined ? Math.max(0, Math.min(1, params.elasticity)) : 1.0;

  // 1D Collision formulas with coefficient of restitution e:
  // v1' = (m1*v1 + m2*v2 + m2*e*(v2 - v1)) / (m1 + m2)
  // v2' = (m1*v1 + m2*v2 + m1*e*(v1 - v2)) / (m1 + m2)
  const totalMass = m1 + m2;
  const v1Final = (m1 * v1 + m2 * v2 + m2 * e * (v2 - v1)) / totalMass;
  const v2Final = (m1 * v1 + m2 * v2 + m1 * e * (v1 - v2)) / totalMass;

  const initialMomentum = m1 * v1 + m2 * v2;
  const finalMomentum = m1 * v1Final + m2 * v2Final;

  const initialKineticEnergy = 0.5 * m1 * (v1 ** 2) + 0.5 * m2 * (v2 ** 2);
  const finalKineticEnergy = 0.5 * m1 * (v1Final ** 2) + 0.5 * m2 * (v2Final ** 2);
  const energyLoss = Math.max(0, initialKineticEnergy - finalKineticEnergy);

  const collisionType =
    e === 1 ? 'elastic' : e === 0 ? 'completely_inelastic' : 'inelastic';

  // Sample trajectory
  const trajectory: TrajectoryPoint[] = [];
  const duration = 2.0;
  const collisionTime = 0.8;
  const steps = 60;
  const dt = duration / steps;

  for (let i = 0; i <= steps; i++) {
    const t = Number((i * dt).toFixed(3));
    let x1: number, x2: number;
    if (t <= collisionTime) {
      x1 = -4.0 + v1 * (t / collisionTime);
      x2 = 4.0 + v2 * (t / collisionTime);
    } else {
      const postT = t - collisionTime;
      x1 = 0 + v1Final * postT;
      x2 = 0 + v2Final * postT;
    }

    trajectory.push({
      t,
      x: Number(x1.toFixed(3)),
      y: 0.5,
      z: 0,
      vx: t <= collisionTime ? v1 : v1Final,
      kineticEnergy:
        0.5 * m1 * ((t <= collisionTime ? v1 : v1Final) ** 2) +
        0.5 * m2 * ((t <= collisionTime ? v2 : v2Final) ** 2),
      totalEnergy: initialKineticEnergy,
    });
  }

  return {
    trajectory,
    results: {
      finalVelocity1: Number(v1Final.toFixed(3)),
      finalVelocity2: Number(v2Final.toFixed(3)),
      initialMomentum: Number(initialMomentum.toFixed(3)),
      finalMomentum: Number(finalMomentum.toFixed(3)),
      initialKineticEnergy: Number(initialKineticEnergy.toFixed(3)),
      finalKineticEnergy: Number(finalKineticEnergy.toFixed(3)),
      energyLoss: Number(energyLoss.toFixed(3)),
      collisionType,
    },
  };
}
