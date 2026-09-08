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
  | 'dynamic'
  | 'projectile'
  | 'pendulum'
  | 'harmonic_oscillator'
  | 'particle_drift'
  | 'collision'
  | 'refraction'
  | 'double_slit'
  | (string & {});

export type DynamicGeometryType =
  | 'sphere'
  | 'box'
  | 'cylinder'
  | 'cone'
  | 'ring'
  | 'torus'
  | 'arrow'
  | 'plane'
  | 'particle_cloud'
  | 'field_grid'
  | 'spring_coil'
  | 'wave_surface';

export interface DynamicEntity {
  id: string;
  name: string;
  geometry: DynamicGeometryType;
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  wireframe?: boolean;
  dimensions?: [number, number, number] | number[];
  radius?: number;
  position: [number, number, number];
  velocity?: [number, number, number];
  mass?: number;
  charge?: number;
  showTrail?: boolean;
  trailColor?: string;
  fixed?: boolean;
  label?: string;
  physicsRole?: 'body' | 'emitter' | 'field_source' | 'barrier' | 'target' | 'detector';
}

export interface DynamicParameter {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  description?: string;
  category?: string;
}

export interface DynamicTelemetryDef {
  key: string;
  label: string;
  unit?: string;
  format?: string;
  formulaDescription?: string;
}

export type DynamicPhysicsEngineType =
  | 'nbody_gravity'
  | 'lorentz_em'
  | 'harmonic_spring'
  | 'particle_flow'
  | 'wave_equation'
  | 'kinematic'
  | 'rigid_body'
  | 'quantum_packet'
  | 'fluid_vortex'
  | 'thermodynamics';

export interface DynamicPhysicsConfig {
  engineType: DynamicPhysicsEngineType;
  gravity?: [number, number, number];
  gravitationalConstant?: number;
  electricField?: [number, number, number];
  magneticField?: [number, number, number];
  damping?: number;
  restitution?: number;
  springStiffness?: number;
  fluidViscosity?: number;
  waveSpeed?: number;
  waveWavelength?: number;
  waveAmplitude?: number;
  temperature?: number;
  timeStep?: number;
  particleCount?: number;
}

export interface DynamicSimulationDefinition {
  topic: string;
  category: string;
  sceneEnvironment?: {
    cameraPosition?: [number, number, number];
    cameraTarget?: [number, number, number];
    gridVisible?: boolean;
    ambientColor?: string;
    ambientIntensity?: number;
  };
  physics: DynamicPhysicsConfig;
  entities: DynamicEntity[];
  parameters: DynamicParameter[];
  telemetry: DynamicTelemetryDef[];
}

export interface PhysicsSimulationData {
  id: string;
  type: SimulationType;
  parameters: Record<string, any>;
  trajectory: TrajectoryPoint[];
  results: Record<string, any>;
  dynamicDefinition?: DynamicSimulationDefinition;
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
  provider?: string;
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

export type LLMProvider =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'deepseek'
  | 'openrouter'
  | 'custom';

export interface LLMProviderOptions {
  provider?: LLMProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

const PROVIDER_STORAGE_KEY = 'physicsai_provider_options';

export function getStoredProviderOptions(): LLMProviderOptions {
  if (typeof window === 'undefined') {
    return {
      provider: 'custom',
      apiKey: 'sk-blSekDI7Ylra64k9eu38bBghPUZueGe5S3ju62iKz6cxTYrN',
      baseUrl: 'https://agentrouter.org/v1',
      model: 'gpt-4o-mini',
    };
  }
  try {
    const raw = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {
    provider: 'custom',
    apiKey: 'sk-blSekDI7Ylra64k9eu38bBghPUZueGe5S3ju62iKz6cxTYrN',
    baseUrl: 'https://agentrouter.org/v1',
    model: 'deepseek-v4-flash',
  };
}

export function setStoredProviderOptions(options: LLMProviderOptions): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(options));
  } catch {}
}

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('vercel.app')) {
      return '';
    }
    if (host.includes('onrender.com')) {
      return 'https://physics-sandbox-ai-1.onrender.com';
    }
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.')
    ) {
      return 'http://localhost:5000';
    }
  }

  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
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
  prompt: string,
  customProviderOptions?: LLMProviderOptions
): Promise<GenerateSimulationResponse> {
  const baseUrl = getApiBaseUrl();
  const providerOptions = customProviderOptions || getStoredProviderOptions();

  const res = await fetch(`${baseUrl}/api/simulations/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(providerOptions.apiKey ? { 'x-llm-api-key': providerOptions.apiKey } : {}),
      ...(providerOptions.provider ? { 'x-llm-provider': providerOptions.provider } : {}),
      ...(providerOptions.model ? { 'x-llm-model': providerOptions.model } : {}),
      ...(providerOptions.baseUrl ? { 'x-llm-base-url': providerOptions.baseUrl } : {}),
    },
    body: JSON.stringify({ prompt, providerOptions }),
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
