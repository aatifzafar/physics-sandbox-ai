import { describe, it, expect } from 'vitest';
import { calculateDoubleSlit, wavelengthToHex } from '../physics/doubleSlit.js';

describe('Double-Slit Physics Calculations', () => {
  it('calculates correct fringe spacing for green light', () => {
    const res = calculateDoubleSlit({
      wavelength: 532, // nm
      slitSeparation: 0.25, // mm
      distanceToScreen: 1.2, // m
    });

    // deltaY = (532e-9 * 1.2) / (0.25e-3) = 2.5536 mm
    expect(res.results.fringeSpacing).toBeCloseTo(2.554, 2);
    expect(res.results.fringeSpacingFormatted).toBe('2.554 mm');
    expect(res.results.wavelengthColorHex).toBe('#10b981'); // Green
    expect(res.results.maximaPositions.length).toBe(5);
    expect(res.results.firstOrderAngle).toBeGreaterThan(0);
  });

  it('maps wavelengths across visible spectrum to correct hex colors', () => {
    expect(wavelengthToHex(400)).toBe('#7c3aed'); // Violet
    expect(wavelengthToHex(470)).toBe('#3b82f6'); // Blue
    expect(wavelengthToHex(500)).toBe('#06b6d4'); // Cyan
    expect(wavelengthToHex(532)).toBe('#10b981'); // Green
    expect(wavelengthToHex(580)).toBe('#eab308'); // Yellow
    expect(wavelengthToHex(600)).toBe('#f97316'); // Orange
    expect(wavelengthToHex(650)).toBe('#ef4444'); // Red
  });
});
