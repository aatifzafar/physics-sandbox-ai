import { z } from 'zod';

export const llmProviderEnum = z.enum([
  'gemini',
  'openai',
  'anthropic',
  'groq',
  'deepseek',
  'openrouter',
  'custom',
]);

export const llmProviderOptionsSchema = z.object({
  provider: llmProviderEnum.optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  baseUrl: z.string().optional(),
});

export const generateSimulationRequestSchema = z.object({
  prompt: z
    .string({ required_error: 'Prompt is required' })
    .trim()
    .min(1, 'Prompt cannot be empty')
    .max(2000, 'Prompt is too long (max 2000 characters)'),
  providerOptions: llmProviderOptionsSchema.optional(),
});

export const simulationTypeEnum = z.enum([
  'dynamic',
  'projectile',
  'pendulum',
  'harmonic_oscillator',
  'particle_drift',
  'collision',
  'refraction',
  'double_slit',
]);

export const geminiExtractedParametersSchema = z.object({
  simulationType: simulationTypeEnum,
  parameters: z.record(z.union([z.number(), z.string()])),
});

export const projectileParametersSchema = z.object({
  initialVelocity: z
    .number()
    .positive('Initial velocity must be greater than 0')
    .max(10000, 'Initial velocity is excessively high')
    .default(20),
  angle: z
    .number()
    .min(0, 'Launch angle must be at least 0 degrees')
    .max(90, 'Launch angle cannot exceed 90 degrees')
    .default(45),
  gravity: z
    .number()
    .positive('Gravity must be greater than 0')
    .default(9.81),
  initialHeight: z
    .number()
    .min(0, 'Initial height must be non-negative')
    .default(0),
});

export const pendulumParametersSchema = z.object({
  length: z
    .number()
    .positive('Pendulum length must be greater than 0')
    .max(1000, 'Pendulum length is too large')
    .default(2.0),
  initialAngle: z
    .number()
    .min(-179, 'Initial angle must be greater than -180 degrees')
    .max(179, 'Initial angle must be less than 180 degrees')
    .default(30),
  mass: z
    .number()
    .positive('Mass must be greater than 0')
    .default(1.0),
  gravity: z
    .number()
    .positive('Gravity must be greater than 0')
    .default(9.81),
  damping: z
    .number()
    .min(0, 'Damping must be non-negative')
    .default(0.0),
  initialAngularVelocity: z
    .number()
    .default(0),
});

export const harmonicOscillatorParametersSchema = z.object({
  mass: z
    .number()
    .positive('Mass must be greater than 0')
    .max(10000, 'Mass is too large')
    .default(1.0),
  springConstant: z
    .number()
    .positive('Spring constant must be greater than 0')
    .max(100000, 'Spring constant is too large')
    .default(50),
  initialDisplacement: z
    .number()
    .default(1.0),
  initialVelocity: z
    .number()
    .default(0),
  damping: z
    .number()
    .min(0, 'Damping must be non-negative')
    .default(0),
});

export const particleDriftParametersSchema = z.object({
  electricField: z
    .number()
    .default(100),
  carrierDensity: z
    .number()
    .positive()
    .default(8.5e28),
  relaxationTime: z
    .number()
    .positive()
    .default(2.5e-14),
  temperature: z
    .number()
    .positive()
    .default(300),
  wireRadius: z
    .number()
    .positive()
    .default(1.2),
  wireLength: z
    .number()
    .positive()
    .default(14),
  particleCount: z
    .number()
    .min(5)
    .max(200)
    .default(40),
  driftSpeedScale: z
    .number()
    .default(1.0),
});

export const collisionParametersSchema = z.object({
  mass1: z
    .number()
    .positive('Mass 1 must be positive')
    .default(2.0),
  mass2: z
    .number()
    .positive('Mass 2 must be positive')
    .default(1.0),
  velocity1: z
    .number()
    .default(5.0),
  velocity2: z
    .number()
    .default(-3.0),
  elasticity: z
    .number()
    .min(0, 'Elasticity cannot be less than 0')
    .max(1, 'Elasticity cannot exceed 1')
    .default(1.0),
});

export const refractionParametersSchema = z.object({
  incidentAngle: z
    .number()
    .min(0, 'Angle of incidence cannot be negative')
    .max(89.9, 'Angle of incidence must be less than 90 degrees')
    .default(45),
  n1: z
    .number()
    .positive('Refractive index of medium 1 must be positive')
    .default(1.00),
  n2: z
    .number()
    .positive('Refractive index of medium 2 must be positive')
    .default(1.50),
  medium1Name: z.string().optional().default('Air'),
  medium2Name: z.string().optional().default('Glass'),
  wavelength: z.number().positive().optional().default(532),
});

export const doubleSlitParametersSchema = z.object({
  wavelength: z
    .number()
    .min(200, 'Wavelength must be at least 200 nm')
    .max(1000, 'Wavelength must be at most 1000 nm')
    .default(532),
  slitSeparation: z
    .number()
    .positive('Slit separation must be positive')
    .max(10, 'Slit separation is too large')
    .default(0.25),
  distanceToScreen: z
    .number()
    .positive('Distance to screen must be positive')
    .max(20, 'Distance to screen is too large')
    .default(1.2),
  slitWidth: z
    .number()
    .positive()
    .default(20),
  mode: z
    .enum(['wave', 'particle'])
    .default('wave'),
});

export const explanationSchema = z.object({
  title: z.string(),
  summary: z.string(),
  keyConcepts: z.array(z.string()),
  equations: z.array(z.string()),
  simulationSteps: z.array(z.string()),
  observations: z.array(z.string()),
});
