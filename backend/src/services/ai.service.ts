import { GoogleGenAI, Type } from '@google/genai';
import {
  SimulationType,
} from '../types/simulation.types.js';
import { DEFAULT_GEMINI_MODEL } from '../utils/constants.js';

export interface ExtractedSimulationIntent {
  simulationType: SimulationType;
  parameters: Record<string, number | string>;
  modelUsed: string;
  retries: number;
  fallbackUsed: boolean;
}

function robustJsonParse(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch {
    const sanitized = jsonString.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
    return JSON.parse(sanitized);
  }
}

export class AIService {
  private aiClient: GoogleGenAI | null = null;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

    if (apiKey) {
      this.aiClient = new GoogleGenAI({ apiKey });
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in your environment.'
        );
      }
      this.aiClient = new GoogleGenAI({ apiKey });
    }
    return this.aiClient;
  }

  /**
   * Classifies domain and extracts structured simulation parameters with self-check validation and retry
   */
  async extractSimulationParameters(
    prompt: string
  ): Promise<ExtractedSimulationIntent> {
    const client = this.getClient();

    const systemInstruction = `
You are an expert physics AI assistant that parses natural language physics requests into structured domain simulation parameters.
You must categorize the request into the single MOST ACCURATE physics domain template:

1. "double_slit" (Young's Double-Slit Interference & Wave-Particle Duality):
   - Use this whenever the prompt mentions double slit, Young's experiment, interference pattern, fringe spacing, two slits, quantum interference, diffraction fringes, or wave-particle duality.
   - Parameters:
     * wavelength: in nm (default 532)
     * slitSeparation: in mm (default 0.25)
     * distanceToScreen: in meters (default 1.2)
     * slitWidth: in micrometers (default 20)
     * mode: "wave" or "particle" (default "wave")

2. "refraction" (Optics / Snell's Law / Light propagation through media):
   - Use this whenever the prompt mentions refraction, Snell's law, laser entering glass/water, optical index, total internal reflection, or ray bending.
   - Parameters:
     * incidentAngle: angle of incidence theta1 in degrees between 0 and 89 (default 45)
     * n1: refractive index of medium 1 (default 1.00 for air)
     * n2: refractive index of medium 2 (default 1.50 for crown glass)
     * wavelength: in nm (default 532)

3. "particle_drift" (Drude model / electron transport in conductor):
   - Use this whenever the prompt describes electron motion in wires, conductors, current flow, electric field drift, charge carriers, or Drude model.
   - Parameters:
     * electricField: in V/m (default 100)
     * carrierDensity: in electrons/m^3 (default 8.5e28)
     * relaxationTime: in seconds (default 2.5e-14)
     * temperature: in Kelvin (default 300)
     * particleCount: number of electrons (default 40)

4. "collision" (2-body impact / momentum transfer):
   - Use this whenever the prompt describes colliding spheres, billiard balls, elastic/inelastic collisions, impact, or momentum conservation.
   - Parameters:
     * mass1: in kg (default 2.0)
     * mass2: in kg (default 1.0)
     * velocity1: in m/s (default 5.0)
     * velocity2: in m/s (default -3.0)
     * elasticity: between 0 and 1 (default 1.0)

5. "projectile" (ballistic trajectory in gravity):
   - Use this for balls thrown, cannons, artillery, stones launched, ballistic arcs.
   - Parameters:
     * initialVelocity: in m/s (default 20)
     * angle: in degrees between 0 and 90 (default 45)
     * gravity: in m/s^2 (default 9.81)
     * initialHeight: in meters (default 0)

6. "pendulum" (suspended swinging mass):
   - Use this for pendulums, swinging bobs, simple or damped gravity pendulums.
   - Parameters:
     * length: in meters (default 2.0)
     * initialAngle: in degrees between -179 and 179 (default 30)
     * mass: in kg (default 1.0)
     * gravity: in m/s^2 (default 9.81)
     * damping: damping coefficient >= 0 (default 0.0)

7. "harmonic_oscillator" (mass on a mechanical spring):
   - Use ONLY for mechanical mass-spring oscillators, vibration of springs, Hooke's law mechanical systems.
   - Parameters:
     * mass: in kg (default 1.0)
     * springConstant: in N/m (default 50)
     * initialDisplacement: in meters (default 1.0)
     * damping: damping coefficient >= 0 (default 0)

CRITICAL INSTRUCTION: Never map double-slit interference to kinematics or oscillators.
Always return numeric values in standard specified units.
`;

    const candidateModels = [
      this.modelName,
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
    ];

    let retries = 0;

    for (const model of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                simulationType: {
                  type: Type.STRING,
                  enum: [
                    'double_slit',
                    'refraction',
                    'particle_drift',
                    'collision',
                    'projectile',
                    'pendulum',
                    'harmonic_oscillator',
                  ],
                  description: 'The classified physics simulation domain template',
                },
                parameters: {
                  type: Type.OBJECT,
                  description: 'Extracted simulation parameters',
                  properties: {
                    wavelength: { type: Type.NUMBER },
                    slitSeparation: { type: Type.NUMBER },
                    distanceToScreen: { type: Type.NUMBER },
                    slitWidth: { type: Type.NUMBER },
                    mode: { type: Type.STRING },
                    incidentAngle: { type: Type.NUMBER },
                    n1: { type: Type.NUMBER },
                    n2: { type: Type.NUMBER },
                    electricField: { type: Type.NUMBER },
                    carrierDensity: { type: Type.NUMBER },
                    relaxationTime: { type: Type.NUMBER },
                    temperature: { type: Type.NUMBER },
                    particleCount: { type: Type.NUMBER },
                    mass1: { type: Type.NUMBER },
                    mass2: { type: Type.NUMBER },
                    velocity1: { type: Type.NUMBER },
                    velocity2: { type: Type.NUMBER },
                    elasticity: { type: Type.NUMBER },
                    initialVelocity: { type: Type.NUMBER },
                    angle: { type: Type.NUMBER },
                    gravity: { type: Type.NUMBER },
                    initialHeight: { type: Type.NUMBER },
                    length: { type: Type.NUMBER },
                    initialAngle: { type: Type.NUMBER },
                    mass: { type: Type.NUMBER },
                    damping: { type: Type.NUMBER },
                    springConstant: { type: Type.NUMBER },
                    initialDisplacement: { type: Type.NUMBER },
                  },
                },
              },
              required: ['simulationType', 'parameters'],
            },
          },
        });

        const responseText = response.text;
        if (responseText) {
          const parsed = robustJsonParse(responseText);
          let simulationType = parsed.simulationType as SimulationType;
          const rawParams = parsed.parameters || {};

          // Self-check validation: confirm geometry/domain aligns with prompt keywords
          simulationType = this.validateAndCorrectDomain(prompt, simulationType);

          const cleanParams: Record<string, any> = {};
          for (const [key, value] of Object.entries(rawParams)) {
            if (value !== undefined && value !== null) {
              if (key === 'mode') {
                cleanParams[key] = value === 'particle' ? 'particle' : 'wave';
              } else {
                const num = Number(value);
                if (!isNaN(num)) {
                  cleanParams[key] = num;
                }
              }
            }
          }

          return {
            simulationType,
            parameters: cleanParams,
            modelUsed: model,
            retries,
            fallbackUsed: model !== this.modelName,
          };
        }
      } catch (err: any) {
        retries++;
        console.warn(`[AI Service] Model attempt ${model} failed (${err.message}).`);
        if (err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('429')) {
          break; // Quota limit reached on project, immediately use deterministic heuristic engine
        }
      }
    }

    // Heuristic fallback if all AI models fail
    console.warn('[AI Service] All AI models failed. Using deterministic heuristic classifier.');
    const heuristic = this.heuristicExtraction(prompt);
    return {
      ...heuristic,
      modelUsed: 'heuristic-rule-engine',
      retries,
      fallbackUsed: true,
    };
  }

  /**
   * Self-check validation to avoid topic-to-visual mismatches
   */
  private validateAndCorrectDomain(
    prompt: string,
    extractedType: SimulationType
  ): SimulationType {
    const p = prompt.toLowerCase();

    // 1. Double Slit / Interference Check
    if (
      p.includes('double slit') ||
      p.includes('double-slit') ||
      p.includes('two slit') ||
      p.includes('two-slit') ||
      p.includes("young's") ||
      p.includes('youngs') ||
      p.includes('interference pattern') ||
      p.includes('fringe') ||
      p.includes('wave particle duality') ||
      p.includes('quantum interference') ||
      p.includes('wavefront ripple')
    ) {
      return 'double_slit';
    }

    // 2. Optics & Refraction Check
    if (
      p.includes('refract') ||
      p.includes('snell') ||
      p.includes('light') ||
      p.includes('optic') ||
      p.includes('laser') ||
      p.includes('prism') ||
      p.includes('ray') ||
      p.includes('index of refraction') ||
      p.includes('total internal reflection')
    ) {
      return 'refraction';
    }

    // 3. Conductor / Electron Drift Check
    if (
      p.includes('electron') ||
      p.includes('drift') ||
      p.includes('wire') ||
      p.includes('conductor') ||
      p.includes('current flow') ||
      p.includes('drude') ||
      p.includes('lattice') ||
      p.includes('charge carrier')
    ) {
      return 'particle_drift';
    }

    // 4. Collision Check
    if (
      p.includes('collis') ||
      p.includes('billiard') ||
      p.includes('elastic') ||
      p.includes('inelastic') ||
      p.includes('impact') ||
      p.includes('momentum')
    ) {
      return 'collision';
    }

    // 5. Pendulum Check
    if (
      p.includes('pendulum') ||
      p.includes('swinging') ||
      p.includes('bob')
    ) {
      return 'pendulum';
    }

    // 6. Spring / Harmonic Oscillator Check
    if (
      p.includes('spring') ||
      p.includes('hooke') ||
      p.includes('vibrat')
    ) {
      return 'harmonic_oscillator';
    }

    // 7. Projectile Check
    if (
      p.includes('projectile') ||
      p.includes('cannon') ||
      p.includes('launch') ||
      p.includes('throw') ||
      p.includes('ballistic')
    ) {
      return 'projectile';
    }

    return extractedType;
  }

  /**
   * Heuristic fallback rule engine
   */
  private heuristicExtraction(prompt: string): {
    simulationType: SimulationType;
    parameters: Record<string, any>;
  } {
    const p = prompt.toLowerCase();

    if (
      p.includes('double slit') ||
      p.includes('double-slit') ||
      p.includes('two slit') ||
      p.includes("young's") ||
      p.includes('youngs') ||
      p.includes('interference') ||
      p.includes('fringe')
    ) {
      const lambdaMatch = p.match(/(\d+(?:\.\d+)?)\s*(?:nm|nanometer|nanometre)/i);
      const dMatch = p.match(/(\d+(?:\.\d+)?)\s*(?:mm|millimeter)/i);
      const LMatch = p.match(/(\d+(?:\.\d+)?)\s*(?:m|meter)/i);
      const isParticle = p.includes('particle') || p.includes('photon') || p.includes('electron');

      return {
        simulationType: 'double_slit',
        parameters: {
          wavelength: lambdaMatch ? parseFloat(lambdaMatch[1]) : 532,
          slitSeparation: dMatch ? parseFloat(dMatch[1]) : 0.25,
          distanceToScreen: LMatch ? parseFloat(LMatch[1]) : 1.2,
          slitWidth: 20,
          mode: isParticle ? 'particle' : 'wave',
        },
      };
    }

    if (
      p.includes('refract') ||
      p.includes('snell') ||
      p.includes('light') ||
      p.includes('optic') ||
      p.includes('laser') ||
      p.includes('prism')
    ) {
      const angleMatch = p.match(/(\d+(?:\.\d+)?)\s*(?:deg|degree|degrees|°)/i);
      const n2Match = p.match(/n\s*=?\s*(\d+(?:\.\d+)?)/i);
      return {
        simulationType: 'refraction',
        parameters: {
          incidentAngle: angleMatch ? parseFloat(angleMatch[1]) : 45,
          n1: 1.00,
          n2: n2Match ? parseFloat(n2Match[1]) : 1.50,
          wavelength: 532,
        },
      };
    }

    if (
      p.includes('electron') ||
      p.includes('drift') ||
      p.includes('wire') ||
      p.includes('conductor') ||
      p.includes('drude')
    ) {
      const eFieldMatch = p.match(/(\d+(?:\.\d+)?)\s*(?:v\/m|volts?\/m|v)/i);
      return {
        simulationType: 'particle_drift',
        parameters: {
          electricField: eFieldMatch ? parseFloat(eFieldMatch[1]) : 100,
          carrierDensity: 8.5e28,
          relaxationTime: 2.5e-14,
          temperature: 300,
          particleCount: 40,
        },
      };
    }

    if (p.includes('collis') || p.includes('impact') || p.includes('billiard')) {
      return {
        simulationType: 'collision',
        parameters: {
          mass1: 2.0,
          mass2: 1.0,
          velocity1: 5.0,
          velocity2: -3.0,
          elasticity: 1.0,
        },
      };
    }

    if (p.includes('pendulum') || p.includes('swing')) {
      const lengthMatch = p.match(/(\d+(?:\.\d+)?)\s*(?:m|meter|meters)/i);
      const angleMatch = p.match(/(\d+(?:\.\d+)?)\s*(?:deg|degree|degrees|°)/i);
      return {
        simulationType: 'pendulum',
        parameters: {
          length: lengthMatch ? parseFloat(lengthMatch[1]) : 2.0,
          initialAngle: angleMatch ? parseFloat(angleMatch[1]) : 30,
          mass: 1.0,
          gravity: 9.81,
          damping: 0.0,
        },
      };
    }

    if (p.includes('spring') || p.includes('harmonic') || p.includes('oscillator')) {
      const kMatch = p.match(/(\d+(?:\.\d+)?)\s*(?:n\/m|k)/i);
      const massMatch = p.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilogram)/i);
      return {
        simulationType: 'harmonic_oscillator',
        parameters: {
          springConstant: kMatch ? parseFloat(kMatch[1]) : 50,
          mass: massMatch ? parseFloat(massMatch[1]) : 1.0,
          initialDisplacement: 1.0,
          damping: 0.0,
        },
      };
    }

    // Default: Projectile motion
    const velocityMatch = p.match(/(\d+(?:\.\d+)?)\s*(?:m\/s|mps|velocity|speed)/i);
    const angleMatch = p.match(/(\d+(?:\.\d+)?)\s*(?:deg|degree|degrees|°)/i);
    return {
      simulationType: 'projectile',
      parameters: {
        initialVelocity: velocityMatch ? parseFloat(velocityMatch[1]) : 20,
        angle: angleMatch ? parseFloat(angleMatch[1]) : 45,
        gravity: 9.81,
        initialHeight: 0,
      },
    };
  }
}

export const aiService = new AIService();
