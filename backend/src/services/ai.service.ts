import { SimulationType } from '../types/simulation.types.js';
import { llmService, parseRobustJson } from './llm.service.js';
import { LLMProviderOptions } from '../types/simulation.types.js';

export interface ExtractedSimulationIntent {
  simulationType: SimulationType;
  parameters: Record<string, number | string>;
  modelUsed: string;
  retries: number;
  fallbackUsed: boolean;
}

export class AIService {
  /**
   * Classifies domain and extracts structured simulation parameters with self-check validation and retry
   */
  async extractSimulationParameters(
    prompt: string,
    providerOptions?: LLMProviderOptions
  ): Promise<ExtractedSimulationIntent> {
    const systemInstruction = `
You are an expert physics AI assistant that parses natural language physics requests into structured domain simulation parameters.
Classify the request into the single MOST ACCURATE physics domain template:

1. "double_slit" (Young's Double-Slit Interference & Wave-Particle Duality):
   - Use whenever prompt mentions double slit, Young's experiment, interference pattern, fringe spacing, two slits, or diffraction fringes.
   - Parameters: wavelength (nm, default 532), slitSeparation (mm, default 0.25), distanceToScreen (m, default 1.2), slitWidth (micrometers, default 20), mode ("wave"|"particle", default "wave")

2. "refraction" (Optics / Snell's Law / Light refraction):
   - Use for refraction, Snell's law, laser entering glass/water, optical index, total internal reflection, prism.
   - Parameters: incidentAngle (deg, default 45), n1 (default 1.0), n2 (default 1.5), wavelength (nm, default 532)

3. "particle_drift" (Drude model / electron transport in conductor):
   - Use for electron motion in wires, conductors, electric field drift, charge carriers.
   - Parameters: electricField (V/m, default 100), carrierDensity (default 8.5e28), relaxationTime (s, default 2.5e-14), temperature (K, default 300), particleCount (default 40)

4. "collision" (2-body impact / momentum transfer):
   - Use for colliding spheres, billiard balls, elastic/inelastic collisions, impact momentum.
   - Parameters: mass1 (kg, default 2.0), mass2 (kg, default 1.0), velocity1 (m/s, default 5.0), velocity2 (m/s, default -3.0), elasticity (0 to 1, default 1.0)

5. "projectile" (ballistic trajectory in gravity):
   - Use for balls thrown, cannons, artillery, stones launched, ballistic arcs.
   - Parameters: initialVelocity (m/s, default 20), angle (deg, default 45), gravity (m/s^2, default 9.81), initialHeight (m, default 0)

6. "pendulum" (suspended swinging mass):
   - Use for pendulums, swinging bobs, simple or damped gravity pendulums.
   - Parameters: length (m, default 2.0), initialAngle (deg, default 30), mass (kg, default 1.0), gravity (m/s^2, default 9.81), damping (default 0.0)

7. "harmonic_oscillator" (mass on a mechanical spring):
   - Use for mass-spring oscillators, vibration of springs, Hooke's law mechanical systems.
   - Parameters: mass (kg, default 1.0), springConstant (N/m, default 50), initialDisplacement (m, default 1.0), damping (default 0)

8. "dynamic" (Any other custom / arbitrary physics topic):
   - Use for N-body gravity, orbits, Lorentz forces, fluid vortices, black holes, thermodynamics, quantum wave packets, or any topic not listed above.

Output JSON format:
{
  "simulationType": "double_slit" | "refraction" | "particle_drift" | "collision" | "projectile" | "pendulum" | "harmonic_oscillator" | "dynamic",
  "parameters": { ... }
}
`;

    let retries = 0;

    try {
      const response = await llmService.generateCompletion(
        prompt,
        {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
        providerOptions
      );

      const parsed = parseRobustJson(response.text);
      if (parsed && parsed.simulationType) {
        let simulationType = parsed.simulationType as SimulationType;
        const rawParams = parsed.parameters || {};

        // Self-check validation: confirm domain aligns with prompt keywords
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
          modelUsed: response.model,
          retries,
          fallbackUsed: false,
        };
      }
    } catch (err: any) {
      retries++;
      console.warn(`[AI Service] Extraction failed: ${err.message}. Using heuristic fallback.`);
    }

    // Heuristic fallback
    const heuristic = this.heuristicExtraction(prompt);
    return {
      ...heuristic,
      modelUsed: 'heuristic-classifier',
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
      p.includes('fringe')
    ) {
      return 'double_slit';
    }

    // 2. Optics & Refraction Check
    if (
      p.includes('refract') ||
      p.includes('snell') ||
      p.includes('optic') ||
      p.includes('laser') ||
      p.includes('prism') ||
      p.includes('index of refraction') ||
      p.includes('total internal reflection')
    ) {
      return 'refraction';
    }

    // 3. Conductor / Electron Drift Check
    if (
      p.includes('drift') ||
      p.includes('drude') ||
      p.includes('wire') ||
      p.includes('conduction electron') ||
      p.includes('conductor current')
    ) {
      return 'particle_drift';
    }

    // 4. Collision Check
    if (
      p.includes('collis') ||
      p.includes('billiard') ||
      p.includes('elastic impact') ||
      p.includes('inelastic impact')
    ) {
      return 'collision';
    }

    // 5. Pendulum Check
    if (
      p.includes('pendulum') ||
      p.includes('swinging bob')
    ) {
      return 'pendulum';
    }

    // 6. Spring / Harmonic Oscillator Check
    if (
      p.includes('spring') ||
      p.includes('hooke') ||
      p.includes('oscillator')
    ) {
      return 'harmonic_oscillator';
    }

    // 7. Projectile Check
    if (
      p.includes('projectile') ||
      p.includes('cannon') ||
      p.includes('launch') ||
      p.includes('ballistic')
    ) {
      return 'projectile';
    }

    return extractedType || 'dynamic';
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
      p.includes('two-slit') ||
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
      p.includes('optic') ||
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
      p.includes('drift') ||
      p.includes('drude') ||
      p.includes('conductor')
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

    if (p.includes('collis') || p.includes('billiard')) {
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

    if (p.includes('pendulum')) {
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

    if (p.includes('projectile') || p.includes('cannon') || p.includes('launch')) {
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

    return {
      simulationType: 'dynamic',
      parameters: {},
    };
  }
}

export const aiService = new AIService();
