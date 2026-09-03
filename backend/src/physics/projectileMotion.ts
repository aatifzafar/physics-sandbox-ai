import {
  ProjectileParameters,
  ProjectileResults,
  TrajectoryPoint,
} from '../types/simulation.types.js';

export function calculateProjectileMotion(params: ProjectileParameters): {
  trajectory: TrajectoryPoint[];
  results: ProjectileResults;
} {
  const { initialVelocity, angle, gravity = 9.81, initialHeight = 0 } = params;

  const rad = (angle * Math.PI) / 180;
  const v0x = initialVelocity * Math.cos(rad);
  const v0y = initialVelocity * Math.sin(rad);

  // Time of flight solving y(t) = y0 + v0y*t - 0.5*g*t^2 = 0
  const discriminant = v0y * v0y + 2 * gravity * initialHeight;
  const timeOfFlight =
    discriminant >= 0 ? (v0y + Math.sqrt(discriminant)) / gravity : 0;

  // Maximum height above ground
  const peakTime = v0y > 0 ? v0y / gravity : 0;
  const maximumHeight =
    v0y > 0 ? initialHeight + (v0y * v0y) / (2 * gravity) : initialHeight;

  // Total horizontal range
  const range = v0x * timeOfFlight;

  // Generate trajectory points (30-50 samples)
  const numSamples = Math.max(30, Math.min(60, Math.round(timeOfFlight * 15)));
  const trajectory: TrajectoryPoint[] = [];

  const dt = timeOfFlight > 0 ? timeOfFlight / (numSamples - 1) : 0.01;

  for (let i = 0; i < numSamples; i++) {
    const t = Math.min(timeOfFlight, i * dt);
    const x = v0x * t;
    const y = Math.max(0, initialHeight + v0y * t - 0.5 * gravity * t * t);
    const vx = v0x;
    const vy = v0y - gravity * t;

    trajectory.push({
      t: Number(t.toFixed(3)),
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      z: 0,
      vx: Number(vx.toFixed(3)),
      vy: Number(vy.toFixed(3)),
      vz: 0,
    });
  }

  return {
    trajectory,
    results: {
      maximumHeight: Number(maximumHeight.toFixed(2)),
      timeOfFlight: Number(timeOfFlight.toFixed(2)),
      range: Number(range.toFixed(2)),
      initialVelocityX: Number(v0x.toFixed(2)),
      initialVelocityY: Number(v0y.toFixed(2)),
    },
  };
}
