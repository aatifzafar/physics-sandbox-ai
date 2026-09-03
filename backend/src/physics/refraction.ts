import {
  RefractionParameters,
  RefractionResults,
  TrajectoryPoint,
} from '../types/simulation.types.js';

const SPEED_OF_LIGHT = 299792458; // m/s (c)
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function calculateRefraction(
  params: RefractionParameters
): {
  trajectory: TrajectoryPoint[];
  results: RefractionResults;
} {
  const theta1Deg = params.incidentAngle ?? 45;
  const n1 = params.n1 ?? 1.00;
  const n2 = params.n2 ?? 1.50;

  const theta1Rad = theta1Deg * DEG2RAD;
  const sinTheta1 = Math.sin(theta1Rad);

  // Snell's Law: n1 * sin(theta1) = n2 * sin(theta2)
  const sinTheta2 = (n1 * sinTheta1) / n2;

  let isTotalInternalReflection = false;
  let theta2Deg: number | null = null;
  let criticalAngleDeg: number | null = null;
  let reflectance = 1.0;
  let transmittance = 0.0;

  if (n1 > n2) {
    criticalAngleDeg = Number((Math.asin(n2 / n1) * RAD2DEG).toFixed(2));
  }

  if (sinTheta2 > 1.0) {
    // Total Internal Reflection (TIR)
    isTotalInternalReflection = true;
    reflectance = 1.0;
    transmittance = 0.0;
  } else {
    const theta2Rad = Math.asin(sinTheta2);
    theta2Deg = Number((theta2Rad * RAD2DEG).toFixed(2));

    // Fresnel reflectance for unpolarized light:
    const cosTheta1 = Math.cos(theta1Rad);
    const cosTheta2 = Math.cos(theta2Rad);

    const rs =
      (n1 * cosTheta1 - n2 * cosTheta2) / (n1 * cosTheta1 + n2 * cosTheta2);
    const rp =
      (n2 * cosTheta1 - n1 * cosTheta2) / (n2 * cosTheta1 + n1 * cosTheta2);

    reflectance = Number((0.5 * (rs * rs + rp * rp)).toFixed(4));
    transmittance = Number((1.0 - reflectance).toFixed(4));
  }

  const speed1 = Number((SPEED_OF_LIGHT / n1).toExponential(3));
  const speed2 = Number((SPEED_OF_LIGHT / n2).toExponential(3));
  const deviationAngle =
    theta2Deg !== null ? Number(Math.abs(theta1Deg - theta2Deg).toFixed(2)) : null;

  // Build reference ray sample path
  const trajectory: TrajectoryPoint[] = [];
  const rayLen = 6.0;

  // Incident ray (from medium 1 down to origin (0, 0, 0))
  const startX = -rayLen * Math.sin(theta1Rad);
  const startY = rayLen * Math.cos(theta1Rad);

  trajectory.push({ t: 0, x: startX, y: startY, z: 0 });
  trajectory.push({ t: 1, x: 0, y: 0, z: 0 });

  if (isTotalInternalReflection) {
    // Reflected ray (back into medium 1)
    const refX = rayLen * Math.sin(theta1Rad);
    const refY = rayLen * Math.cos(theta1Rad);
    trajectory.push({ t: 2, x: refX, y: refY, z: 0 });
  } else {
    // Refracted ray (into medium 2, negative y)
    const theta2Rad = (theta2Deg || 0) * DEG2RAD;
    const refrX = rayLen * Math.sin(theta2Rad);
    const refrY = -rayLen * Math.cos(theta2Rad);
    trajectory.push({ t: 2, x: refrX, y: refrY, z: 0 });
  }

  return {
    trajectory,
    results: {
      incidentAngle: theta1Deg,
      refractedAngle: theta2Deg,
      isTotalInternalReflection,
      criticalAngle: criticalAngleDeg,
      reflectance,
      transmittance,
      speed1,
      speed2,
      deviationAngle,
    },
  };
}
