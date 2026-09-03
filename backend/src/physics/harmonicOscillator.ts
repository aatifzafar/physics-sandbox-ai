import {
  HarmonicOscillatorParameters,
  HarmonicOscillatorResults,
  TrajectoryPoint,
} from '../types/simulation.types.js';

export function calculateHarmonicOscillator(params: HarmonicOscillatorParameters): {
  trajectory: TrajectoryPoint[];
  results: HarmonicOscillatorResults;
} {
  const {
    mass,
    springConstant,
    initialDisplacement,
    initialVelocity = 0,
    damping = 0,
  } = params;

  // Natural angular frequency omega_0 = sqrt(k / m)
  const omega0 = Math.sqrt(springConstant / mass);
  const naturalFrequency = omega0 / (2 * Math.PI);
  const naturalPeriod = naturalFrequency > 0 ? 1 / naturalFrequency : 0;

  // Damping ratio zeta = c / (2 * sqrt(m * k))
  const criticalDamping = 2 * Math.sqrt(mass * springConstant);
  const dampingRatio = criticalDamping > 0 ? damping / criticalDamping : 0;

  let dampingRegime: HarmonicOscillatorResults['dampingRegime'] = 'undamped';
  if (dampingRatio === 0) {
    dampingRegime = 'undamped';
  } else if (dampingRatio < 1) {
    dampingRegime = 'underdamped';
  } else if (Math.abs(dampingRatio - 1) < 1e-4) {
    dampingRegime = 'critically_damped';
  } else {
    dampingRegime = 'overdamped';
  }

  // Simulation time: 4 periods or at least 5 seconds
  const totalTime = Math.max(5, Math.min(20, naturalPeriod * 4));
  const dt = 0.01;
  const steps = Math.floor(totalTime / dt);

  let x = initialDisplacement;
  let v = initialVelocity;

  const fX = (_t: number, _x: number, vel: number) => vel;
  const fV = (_t: number, pos: number, vel: number) =>
    -(springConstant / mass) * pos - (damping / mass) * vel;

  const trajectory: TrajectoryPoint[] = [];
  let maxDisp = Math.abs(initialDisplacement);
  let maxEnergy = 0;

  const sampleInterval = Math.max(1, Math.floor(steps / 80));

  let t = 0;
  for (let step = 0; step <= steps; step++) {
    const ke = 0.5 * mass * v * v;
    const pe = 0.5 * springConstant * x * x;
    const totalE = ke + pe;

    if (totalE > maxEnergy) maxEnergy = totalE;
    if (Math.abs(x) > maxDisp) maxDisp = Math.abs(x);

    if (step % sampleInterval === 0) {
      trajectory.push({
        t: Number(t.toFixed(3)),
        x: Number(x.toFixed(3)),
        y: 0,
        z: 0,
        vx: Number(v.toFixed(3)),
        vy: 0,
        vz: 0,
        kineticEnergy: Number(ke.toFixed(3)),
        potentialEnergy: Number(pe.toFixed(3)),
        totalEnergy: Number(totalE.toFixed(3)),
      });
    }

    // RK4 integration step
    const k1_x = fX(t, x, v);
    const k1_v = fV(t, x, v);

    const k2_x = fX(t + dt / 2, x + (dt / 2) * k1_x, v + (dt / 2) * k1_v);
    const k2_v = fV(t + dt / 2, x + (dt / 2) * k1_x, v + (dt / 2) * k1_v);

    const k3_x = fX(t + dt / 2, x + (dt / 2) * k2_x, v + (dt / 2) * k2_v);
    const k3_v = fV(t + dt / 2, x + (dt / 2) * k2_x, v + (dt / 2) * k2_v);

    const k4_x = fX(t + dt, x + dt * k3_x, v + dt * k3_v);
    const k4_v = fV(t + dt, x + dt * k3_x, v + dt * k3_v);

    x += (dt / 6) * (k1_x + 2 * k2_x + 2 * k3_x + k4_x);
    v += (dt / 6) * (k1_v + 2 * k2_v + 2 * k3_v + k4_v);
    t += dt;
  }

  return {
    trajectory,
    results: {
      period: Number(naturalPeriod.toFixed(2)),
      naturalFrequency: Number(naturalFrequency.toFixed(2)),
      angularFrequency: Number(omega0.toFixed(2)),
      dampingRatio: Number(dampingRatio.toFixed(3)),
      dampingRegime,
      maxDisplacement: Number(maxDisp.toFixed(2)),
      totalEnergy: Number(maxEnergy.toFixed(2)),
    },
  };
}
