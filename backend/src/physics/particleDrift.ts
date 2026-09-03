import {
  ParticleDriftParameters,
  ParticleDriftResults,
  TrajectoryPoint,
} from '../types/simulation.types.js';

// Physical constants
const ELECTRON_CHARGE = 1.602176634e-19; // Coulombs (e)
const ELECTRON_MASS = 9.1093837e-31; // kg (m_e)
const BOLTZMANN_CONSTANT = 1.380649e-23; // J/K (k_B)

export function calculateParticleDrift(
  params: ParticleDriftParameters
): {
  trajectory: TrajectoryPoint[];
  results: ParticleDriftResults;
} {
  const E = params.electricField ?? 100; // V/m
  const n = params.carrierDensity ?? 8.5e28; // electrons / m^3
  const tau = params.relaxationTime ?? 2.5e-14; // seconds (relaxation / mean collision time)
  const T = params.temperature ?? 300; // Kelvin

  // 1. Electron mobility: mu = e * tau / m_e
  const mobility = (ELECTRON_CHARGE * tau) / ELECTRON_MASS;

  // 2. Drift velocity magnitude: v_d = mu * E = (e * E * tau) / m_e
  const driftVelocity = mobility * Math.abs(E);

  // 3. Electrical conductivity: sigma = n * e * mu = (n * e^2 * tau) / m_e
  const conductivity = n * ELECTRON_CHARGE * mobility;

  // 4. Current density: J = sigma * E = n * e * v_d
  const currentDensity = conductivity * Math.abs(E);

  // 5. Thermal velocity: v_th = sqrt(3 * k_B * T / m_e)
  const thermalVelocity = Math.sqrt((3 * BOLTZMANN_CONSTANT * T) / ELECTRON_MASS);

  // 6. Mean free path: lambda = v_th * tau
  const meanFreePath = thermalVelocity * tau;

  // Generate reference trajectory data points
  const duration = 2.0;
  const timeStep = 0.02;
  const steps = Math.ceil(duration / timeStep);
  const trajectory: TrajectoryPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = Number((i * timeStep).toFixed(3));
    // Representative electron drift coordinate in visualization units
    const x = Number(((t * 2.5) % 12 - 6).toFixed(3));
    const y = Number((Math.sin(t * 15) * 0.4).toFixed(3));
    const z = Number((Math.cos(t * 12) * 0.4).toFixed(3));

    trajectory.push({
      t,
      x,
      y,
      z,
      vx: driftVelocity,
      vy: 0,
      vz: 0,
      kineticEnergy: 0.5 * ELECTRON_MASS * (thermalVelocity ** 2),
      potentialEnergy: ELECTRON_CHARGE * E * x,
      totalEnergy: 0.5 * ELECTRON_MASS * (thermalVelocity ** 2),
    });
  }

  const formatSci = (val: number, unit: string) => {
    if (Math.abs(val) < 0.001) {
      return `${(val * 1000).toFixed(2)} mm/${unit}`;
    }
    return `${val.toExponential(2)} ${unit}`;
  };

  return {
    trajectory,
    results: {
      driftVelocity: Number(driftVelocity.toFixed(6)),
      driftVelocityFormatted: `${(driftVelocity * 1000).toFixed(2)} mm/s (${driftVelocity.toExponential(2)} m/s)`,
      meanFreePath: Number(meanFreePath.toFixed(12)),
      meanFreePathFormatted: `${(meanFreePath * 1e9).toFixed(2)} nm`,
      conductivity: Number(conductivity.toExponential(3)),
      currentDensity: Number(currentDensity.toExponential(3)),
      mobility: Number(mobility.toFixed(6)),
      thermalVelocity: Number(thermalVelocity.toFixed(0)),
    },
  };
}
