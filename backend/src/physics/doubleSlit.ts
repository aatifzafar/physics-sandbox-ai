import {
  DoubleSlitParameters,
  DoubleSlitResults,
  TrajectoryPoint,
} from '../types/simulation.types.js';

export function wavelengthToHex(wavelengthNm: number): string {
  if (wavelengthNm < 420) return '#7c3aed'; // Deep Violet
  if (wavelengthNm < 450) return '#8b5cf6'; // Violet
  if (wavelengthNm < 485) return '#3b82f6'; // Blue
  if (wavelengthNm < 515) return '#06b6d4'; // Cyan
  if (wavelengthNm < 560) return '#10b981'; // Green (532 nm)
  if (wavelengthNm < 585) return '#eab308'; // Yellow
  if (wavelengthNm < 620) return '#f97316'; // Orange
  return '#ef4444'; // Red (650 nm)
}

export function calculateDoubleSlit(
  params: DoubleSlitParameters
): {
  trajectory: TrajectoryPoint[];
  results: DoubleSlitResults;
} {
  const lambdaNm = params.wavelength ?? 532;
  const dMm = params.slitSeparation ?? 0.25;
  const L = params.distanceToScreen ?? 1.2;

  const lambdaM = lambdaNm * 1e-9;
  const dM = dMm * 1e-3;

  // Fringe spacing: Delta y = (lambda * L) / d
  const deltaYM = (lambdaM * L) / dM;
  const deltaYMm = Number((deltaYM * 1000).toFixed(3));

  // Angular separation: theta_1 = arcsin(lambda / d)
  const sinTheta1 = lambdaM / dM;
  const firstOrderAngleDeg = Number(
    ((Math.asin(Math.min(1.0, sinTheta1)) * 180) / Math.PI).toFixed(4)
  );

  const maximaPositions: number[] = [];
  for (let m = 0; m <= 4; m++) {
    maximaPositions.push(Number((m * deltaYMm).toFixed(3)));
  }

  const hexColor = wavelengthToHex(lambdaNm);

  // Generate reference beam paths from laser to slits and to screen
  const trajectory: TrajectoryPoint[] = [];

  // Source at x = -6, y = 0
  trajectory.push({ t: 0, x: -6, y: 0, z: 0 });
  // Upper slit at x = -2, y = +d/2 (scaled for visualization)
  trajectory.push({ t: 1, x: -2, y: 0.5, z: 0 });
  // Lower slit at x = -2, y = -d/2 (scaled for visualization)
  trajectory.push({ t: 1, x: -2, y: -0.5, z: 0 });
  // Screen center at x = +6, y = 0
  trajectory.push({ t: 2, x: 6, y: 0, z: 0 });

  return {
    trajectory,
    results: {
      fringeSpacing: deltaYMm,
      fringeSpacingFormatted: `${deltaYMm} mm`,
      firstOrderAngle: firstOrderAngleDeg,
      wavelengthColorHex: hexColor,
      maximaPositions,
      angularSeparation: Number(sinTheta1.toFixed(6)),
      centralMaxIntensity: 1.0,
    },
  };
}
