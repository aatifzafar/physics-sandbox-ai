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

function getApiBaseUrl(): string {
  // 1. Explicit environment variable
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && envUrl !== 'http://localhost:5000') {
    return envUrl.replace(/\/+$/, '');
  }

  // 2. Auto-detect when running on Vercel or same-origin
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('vercel.app')) {
      return ''; // On Vercel, frontend and backend share the same domain!
    }
    if (host.includes('onrender.com')) {
      return 'https://physics-sandbox-ai-1.onrender.com';
    }
  }

  // 3. Fallback for SSR process env
  if (typeof process !== 'undefined' && process.env?.VITE_API_URL) {
    return process.env.VITE_API_URL.replace(/\/+$/, '');
  }

  return 'http://localhost:5000';
}

export async function checkHealth(): Promise<{ success: boolean; message: string }> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}

export async function generateSimulation(
  prompt: string
): Promise<GenerateSimulationResponse> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/simulations/generate`, {
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
