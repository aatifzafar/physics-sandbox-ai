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

export type SimulationType =
  | 'projectile'
  | 'pendulum'
  | 'harmonic_oscillator'
  | 'particle_drift'
  | 'collision'
  | 'refraction'
  | 'double_slit';

export interface PhysicsSimulationData {
  id: string;
  type: SimulationType;
  parameters: Record<string, any>;
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

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

export async function checkHealth(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}

export async function generateSimulation(
  prompt: string
): Promise<GenerateSimulationResponse> {
  const res = await fetch(`${API_BASE_URL}/api/simulations/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    const errorMsg =
      data?.error?.message ||
      `Simulation generation failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as GenerateSimulationResponse;
}
