export const DEFAULT_PORT = 5000;
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

export const SIMULATION_TYPES = {
  PROJECTILE: 'projectile',
  PENDULUM: 'pendulum',
  HARMONIC_OSCILLATOR: 'harmonic_oscillator',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;
