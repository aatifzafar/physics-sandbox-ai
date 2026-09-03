import {
  PendulumParameters,
  PendulumResults,
  TrajectoryPoint,
} from '../types/simulation.types.js';

export function calculatePendulumMotion(params: PendulumParameters): {
  trajectory: TrajectoryPoint[];
  results: PendulumResults;
} {
  const {
    length,
    initialAngle,
    mass = 1.0,
    gravity = 9.81,
    damping = 0.0,
    initialAngularVelocity = 0,
  } = params;

  // Convert initial angle from degrees to radians
  const theta0 = (initialAngle * Math.PI) / 180;
  let theta = theta0;
  let omega = initialAngularVelocity;

  // Small-angle period approximation
  const naturalPeriod = 2 * Math.PI * Math.sqrt(length / gravity);
  const naturalFrequency = 1 / naturalPeriod;

  // Simulation time: 3 full cycles or at least 5 seconds
  const totalTime = Math.max(5, Math.min(20, naturalPeriod * 3));
  const dt = 0.02; // 20ms step size for RK4
  const steps = Math.floor(totalTime / dt);

  // RK4 derivative helper
  // d[theta]/dt = omega
  // d[omega]/dt = -(g/L)*sin(theta) - (damping/mass)*omega
  const gamma = damping / mass;
  const fTheta = (_t: number, _th: number, om: number) => om;
  const fOmega = (_t: number, th: number, om: number) =>
    -(gravity / length) * Math.sin(th) - gamma * om;

  const trajectory: TrajectoryPoint[] = [];
  let maxAngleRad = Math.abs(theta0);
  let maxKE = 0;
  let maxPE = 0;

  // Sample every few steps to produce clean visualization points (e.g. ~60-120 points)
  const sampleInterval = Math.max(1, Math.floor(steps / 80));

  let t = 0;
  for (let step = 0; step <= steps; step++) {
    // Energies
    const v = length * omega;
    const ke = 0.5 * mass * v * v;
    const pe = mass * gravity * length * (1 - Math.cos(theta));
    const totalE = ke + pe;

    if (ke > maxKE) maxKE = ke;
    if (pe > maxPE) maxPE = pe;
    if (Math.abs(theta) > maxAngleRad) maxAngleRad = Math.abs(theta);

    if (step % sampleInterval === 0) {
      // Bob coordinates: pivot is at (0, length, 0), bob is at (x, y, 0)
      // When theta = 0, bob is at (0, 0, 0)
      const x = length * Math.sin(theta);
      const y = length * (1 - Math.cos(theta));

      trajectory.push({
        t: Number(t.toFixed(3)),
        x: Number(x.toFixed(3)),
        y: Number(y.toFixed(3)),
        z: 0,
        angle: Number(((theta * 180) / Math.PI).toFixed(2)),
        angularVelocity: Number(omega.toFixed(3)),
        kineticEnergy: Number(ke.toFixed(3)),
        potentialEnergy: Number(pe.toFixed(3)),
        totalEnergy: Number(totalE.toFixed(3)),
      });
    }

    // RK4 Step
    const k1_th = fTheta(t, theta, omega);
    const k1_om = fOmega(t, theta, omega);

    const k2_th = fTheta(t + dt / 2, theta + (dt / 2) * k1_th, omega + (dt / 2) * k1_om);
    const k2_om = fOmega(t + dt / 2, theta + (dt / 2) * k1_th, omega + (dt / 2) * k1_om);

    const k3_th = fTheta(t + dt / 2, theta + (dt / 2) * k2_th, omega + (dt / 2) * k2_om);
    const k3_om = fOmega(t + dt / 2, theta + (dt / 2) * k2_th, omega + (dt / 2) * k2_om);

    const k4_th = fTheta(t + dt, theta + dt * k3_th, omega + dt * k3_om);
    const k4_om = fOmega(t + dt, theta + dt * k3_th, omega + dt * k3_om);

    theta += (dt / 6) * (k1_th + 2 * k2_th + 2 * k3_th + k4_th);
    omega += (dt / 6) * (k1_om + 2 * k2_om + 2 * k3_om + k4_om);
    t += dt;
  }

  return {
    trajectory,
    results: {
      period: Number(naturalPeriod.toFixed(2)),
      naturalFrequency: Number(naturalFrequency.toFixed(2)),
      maxDisplacementAngle: Number(((maxAngleRad * 180) / Math.PI).toFixed(2)),
      maxKineticEnergy: Number(maxKE.toFixed(2)),
      maxPotentialEnergy: Number(maxPE.toFixed(2)),
    },
  };
}
