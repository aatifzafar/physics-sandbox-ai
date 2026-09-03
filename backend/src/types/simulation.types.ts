export type SimulationType =
  | 'projectile'
  | 'pendulum'
  | 'harmonic_oscillator'
  | 'particle_drift'
  | 'collision'
  | 'refraction'
  | 'double_slit';

export interface TrajectoryPoint {
  t: number;
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
  angle?: number;
  angularVelocity?: number;
  kineticEnergy?: number;
  potentialEnergy?: number;
  totalEnergy?: number;
}

export interface ProjectileParameters {
  initialVelocity: number; // m/s
  angle: number; // degrees
  gravity?: number; // m/s² (default 9.81)
  initialHeight?: number; // m (default 0)
}

export interface PendulumParameters {
  length: number; // m
  initialAngle: number; // degrees
  mass?: number; // kg (default 1.0)
  gravity?: number; // m/s² (default 9.81)
  damping?: number; // damping coefficient (default 0.0)
  initialAngularVelocity?: number; // rad/s (default 0)
}

export interface HarmonicOscillatorParameters {
  mass: number; // kg
  springConstant: number; // N/m
  initialDisplacement: number; // m
  initialVelocity?: number; // m/s (default 0)
  damping?: number; // N·s/m (default 0)
}

export interface ParticleDriftParameters {
  electricField: number; // V/m
  carrierDensity?: number; // electrons/m^3
  relaxationTime?: number; // s
  temperature?: number; // K
  wireRadius?: number;
  wireLength?: number;
  particleCount?: number;
  driftSpeedScale?: number;
}

export interface CollisionParameters {
  mass1: number; // kg
  mass2: number; // kg
  velocity1: number; // m/s
  velocity2: number; // m/s
  elasticity?: number; // 0 to 1
}

export interface RefractionParameters {
  incidentAngle: number; // degrees (0 to 89)
  n1: number; // refractive index 1 (default 1.00 for air)
  n2: number; // refractive index 2 (default 1.50 for glass)
  medium1Name?: string; // e.g. "Air"
  medium2Name?: string; // e.g. "Glass"
  wavelength?: number; // nm (default 532)
}

export interface DoubleSlitParameters {
  wavelength: number; // nm (380 to 750, default 532)
  slitSeparation: number; // mm (0.05 to 1.5, default 0.25)
  distanceToScreen: number; // m (0.5 to 3.0, default 1.2)
  slitWidth?: number; // micrometers (default 20)
  mode?: 'wave' | 'particle'; // default 'wave'
}

export type SimulationParameters =
  | ProjectileParameters
  | PendulumParameters
  | HarmonicOscillatorParameters
  | ParticleDriftParameters
  | CollisionParameters
  | RefractionParameters
  | DoubleSlitParameters;

export interface ProjectileResults {
  maximumHeight: number;
  timeOfFlight: number;
  range: number;
  initialVelocityX: number;
  initialVelocityY: number;
}

export interface PendulumResults {
  period: number;
  naturalFrequency: number;
  maxDisplacementAngle: number;
  maxKineticEnergy?: number;
  maxPotentialEnergy?: number;
}

export interface HarmonicOscillatorResults {
  period: number;
  naturalFrequency: number;
  angularFrequency: number;
  dampingRatio: number;
  dampingRegime: 'undamped' | 'underdamped' | 'critically_damped' | 'overdamped';
  maxDisplacement: number;
  totalEnergy: number;
}

export interface ParticleDriftResults {
  driftVelocity: number;
  driftVelocityFormatted: string;
  meanFreePath: number;
  meanFreePathFormatted: string;
  conductivity: number;
  currentDensity: number;
  mobility: number;
  thermalVelocity: number;
}

export interface CollisionResults {
  finalVelocity1: number;
  finalVelocity2: number;
  initialMomentum: number;
  finalMomentum: number;
  initialKineticEnergy: number;
  finalKineticEnergy: number;
  energyLoss: number;
  collisionType: 'elastic' | 'inelastic' | 'completely_inelastic';
}

export interface RefractionResults {
  incidentAngle: number; // deg
  refractedAngle: number | null; // deg (null if Total Internal Reflection)
  isTotalInternalReflection: boolean;
  criticalAngle: number | null; // deg
  reflectance: number; // Fresnel R (0 to 1)
  transmittance: number; // Fresnel T (0 to 1)
  speed1: number; // m/s in medium 1
  speed2: number; // m/s in medium 2
  deviationAngle: number | null; // deg |theta1 - theta2|
}

export interface DoubleSlitResults {
  fringeSpacing: number; // mm (delta y)
  fringeSpacingFormatted: string; // e.g. "2.55 mm"
  firstOrderAngle: number; // deg (theta_1)
  wavelengthColorHex: string; // e.g. "#10B981"
  maximaPositions: number[]; // mm from center for m = 0, 1, 2, 3, 4
  angularSeparation: number; // rad
  centralMaxIntensity: number; // relative 1.0
}

export type SimulationResults =
  | ProjectileResults
  | PendulumResults
  | HarmonicOscillatorResults
  | ParticleDriftResults
  | CollisionResults
  | RefractionResults
  | DoubleSlitResults;

export interface PhysicsSimulationData {
  id: string;
  type: SimulationType;
  parameters: SimulationParameters | Record<string, any>;
  trajectory: TrajectoryPoint[];
  results: Record<string, any>;
}

export interface SimulationExplanation {
  title: string;
  summary: string;
  keyConcepts: string[];
  equations: string[];
  simulationSteps: string[];
  observations: string[];
}

export interface SimulationMetadata {
  modelUsed: string;
  retries: number;
  fallbackUsed: boolean;
  template: SimulationType;
}

export interface GenerateSimulationResponse {
  success: true;
  simulation: PhysicsSimulationData;
  explanation: SimulationExplanation;
  metadata?: SimulationMetadata;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
