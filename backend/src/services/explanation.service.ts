import {
  SimulationType,
  SimulationParameters,
  SimulationResults,
  SimulationExplanation,
  LLMProviderOptions,
} from '../types/simulation.types.js';
import { llmService, parseRobustJson } from './llm.service.js';

export class ExplanationService {
  async generateExplanation(
    prompt: string,
    simulationType: SimulationType,
    parameters: SimulationParameters,
    results: SimulationResults,
    providerOptions?: LLMProviderOptions
  ): Promise<SimulationExplanation> {
    const systemInstruction = `
You are an expert physics educator. You will receive a user prompt, a physics simulation type, the simulation parameters, and the calculated results.
Generate a structured, engaging, educational explanation formatted in JSON.
For equations, provide standard clean LaTeX mathematical expressions without markdown ticks (e.g. "d \\sin\\theta = m \\lambda", "\\Delta y = \\frac{\\lambda L}{d}").
Ensure the explanation strictly corresponds to the simulation domain (${simulationType}).
For double_slit, emphasize wave-particle duality, path length difference, Huygens wavelets, and quantum superposition.

Output format JSON:
{
  "title": "Title",
  "summary": "Summary paragraph",
  "keyConcepts": ["Concept 1", "Concept 2", ...],
  "equations": ["LaTeX 1", "LaTeX 2", ...],
  "simulationSteps": ["Step 1", "Step 2", ...],
  "observations": ["Observation 1", "Observation 2", ...]
}
`;

    const contents = JSON.stringify({
      userPrompt: prompt,
      simulationType,
      parameters,
      results,
    });

    try {
      const response = await llmService.generateCompletion(
        contents,
        {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
        providerOptions
      );

      const parsed = parseRobustJson(response.text);
      if (parsed && parsed.title) {
        return {
          title: parsed.title,
          summary: parsed.summary || '',
          keyConcepts: parsed.keyConcepts || [],
          equations: parsed.equations || [],
          simulationSteps: parsed.simulationSteps || [],
          observations: parsed.observations || [],
        };
      }
    } catch (err: any) {
      console.warn(`[Explanation Service] LLM generation failed: ${err.message}. Using built-in physics explanation.`);
    }

    return this.getFallbackExplanation(simulationType, parameters, results);
  }

  private getFallbackExplanation(
    simulationType: SimulationType,
    parameters: any,
    results: any
  ): SimulationExplanation {
    if (simulationType === 'double_slit') {
      const lambdaNm = parameters.wavelength || 532;
      const dMm = parameters.slitSeparation || 0.25;
      const LM = parameters.distanceToScreen || 1.2;
      const dy = results.fringeSpacingFormatted || `${((lambdaNm * 1e-6 * LM) / dMm).toFixed(2)} mm`;

      return {
        title: "Young's Double-Slit Experiment & Wave-Particle Duality",
        summary: `Coherent light with wavelength λ = ${lambdaNm} nm illuminates a barrier with two slits separated by d = ${dMm} mm. Secondary cylindrical wavelets emerge from each slit and propagate across distance L = ${LM} m to the observation screen. Where path differences equal integer multiples of λ, constructive interference forms bright fringes with spacing Δy = ${dy}. In particle mode, individual quantum detections accumulate point-by-point to build this exact fringe pattern, demonstrating fundamental wave-particle duality and quantum superposition.`,
        keyConcepts: [
          "Constructive & Destructive Interference: Path length difference Δr = d sinθ = mλ creates bright intensity peaks, while Δr = (m + 1/2)λ causes total wave cancellation.",
          "Fringe Spacing Formula: The linear separation between adjacent bright fringes on the screen is Δy = (λ·L) / d.",
          "Huygens-Fresnel Principle: Each microscopic slit acts as a source of coherent circular/cylindrical secondary wavelets.",
          "Wave-Particle Duality: Even when light or electrons are emitted one quantum at a time, each entity interferes with itself as a probability amplitude wave to build the collective pattern.",
        ],
        equations: [
          "d \\sin\\theta = m \\lambda",
          "\\Delta y = \\frac{\\lambda L}{d}",
          "I(y) = I_0 \\cos^2\\left(\\frac{\\pi d y}{\\lambda L}\\right) \\operatorname{sinc}^2\\left(\\frac{\\pi a y}{\\lambda L}\\right)",
          "\\Delta r = d \\sin\\theta \\approx \\frac{d y}{L}",
        ],
        simulationSteps: [
          `Emit coherent radiation (λ = ${lambdaNm} nm) towards double-slit barrier (d = ${dMm} mm).`,
          "Generate coherent circular expanding wavefront ripples from both slit apertures.",
          "Compute spatial superposition and interference phase differences at screen coordinate y.",
          `Map real-time intensity distribution across screen (L = ${LM} m) with calculated fringe spacing Δy = ${dy}.`,
        ],
        observations: [
          `Wavelength: ${lambdaNm} nm (Spectral Color: ${results.wavelengthColorHex || '#10B981'})`,
          `Slit Separation (d): ${dMm} mm`,
          `Distance to Screen (L): ${LM} m`,
          `Fringe Spacing (Δy): ${dy}`,
          `First-Order Maximum Angle (θ₁): ${results.firstOrderAngle ?? 0.122}°`,
        ],
      };
    }

    if (simulationType === 'refraction') {
      const isTIR = results?.isTotalInternalReflection;
      return {
        title: "Snell's Law and Optical Refraction",
        summary: `Light travels across the boundary between two optical media (n₁ = ${parameters.n1 || 1.0}, n₂ = ${parameters.n2 || 1.5}) with an angle of incidence θ₁ = ${parameters.incidentAngle || 45}°. As the wave phase velocity changes, the light ray bends according to Snell's Law.`,
        keyConcepts: [
          "Snell's Law: The ratio of sines of the angles of incidence and refraction equals the inverse ratio of the refractive indices.",
          "Optical Density & Wave Speed: Light travels slower in optically denser media (v = c / n).",
          isTIR
            ? "Total Internal Reflection: When incident beyond the critical angle in a denser medium, 100% of light is reflected."
            : "Fresnel Transmission & Reflection: Light divides at the interface into a transmitted refracted beam and a reflected beam.",
          "Fermat's Principle of Least Time: Light follows the path that takes the least time between two points.",
        ],
        equations: [
          "n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2",
          "\\theta_2 = \\arcsin\\left(\\frac{n_1 \\sin\\theta_1}{n_2}\\right)",
          "v = \\frac{c}{n}",
          "\\theta_c = \\arcsin\\left(\\frac{n_2}{n_1}\\right)",
          "R = \\left(\\frac{n_1 \\cos\\theta_1 - n_2 \\cos\\theta_2}{n_1 \\cos\\theta_1 + n_2 \\cos\\theta_2}\\right)^2",
        ],
        simulationSteps: [
          `Trace incident ray from medium 1 (n₁ = ${parameters.n1 || 1.00}) at angle θ₁ = ${parameters.incidentAngle || 45}°.`,
          "Calculate interface intersection point and evaluate boundary condition.",
          isTIR
            ? "Since n₁ > n₂ and θ₁ > θc, construct 100% total internal reflection ray."
            : `Compute refracted angle θ₂ = ${results?.refractedAngle ?? 28.1}° in medium 2 (n₂ = ${parameters.n2 || 1.50}).`,
          "Render incident, reflected, and refracted rays with Fresnel intensity ratios.",
        ],
        observations: [
          `Incident Angle: ${parameters.incidentAngle || 45}°`,
          isTIR
            ? `Total Internal Reflection occurred (Critical Angle: ${results?.criticalAngle}°).`
            : `Refracted Angle: ${results?.refractedAngle ?? '28.1'}°`,
          `Reflectance (R): ${((results?.reflectance ?? 0.04) * 100).toFixed(1)}%`,
          `Transmittance (T): ${((results?.transmittance ?? 0.96) * 100).toFixed(1)}%`,
        ],
      };
    }

    if (simulationType === 'particle_drift') {
      return {
        title: 'Microscopic Electron Drift in a Conducting Wire',
        summary:
          'This simulation visualizes the microscopic motion of conduction electrons inside a metallic wire under the influence of an external electric field. It highlights the stark contrast between rapid, random thermal motion and the slow, collective drift caused by the field amidst frequent ionic lattice collisions.',
        keyConcepts: [
          'Drude Model: A classical framework describing charge carriers undergoing continuous acceleration interrupted by instantaneous scattering events.',
          'Thermal vs. Drift Motion: Random thermal motion occurs at extremely high velocities in all directions, whereas drift velocity is the tiny net directional average caused by the electric field.',
          'Mean Free Path and Relaxation Time: The average distance and average time elapsed between successive electron collisions with the lattice ions.',
          'Conductivity and Current Density: Macroscopic properties directly resulting from microscopic carrier density, charge, and electron mobility.',
        ],
        equations: [
          'v_d = \\mu E',
          '\\mu = \\frac{e \\tau}{m_e}',
          'J = \\sigma E = n e v_d',
          'v_{th} = \\sqrt{\\frac{3 k_B T}{m_e}}',
          '\\lambda = v_{th} \\tau',
        ],
        simulationSteps: [
          'Initialize electron positions randomly inside the 3D conductor lattice.',
          'Apply electric force F = -eE accelerating each electron between collisions.',
          'Simulate isotropic scattering collisions with fixed lattice ions.',
          'Compute ensemble drift velocity and current density in real time.',
        ],
        observations: [
          `Electric field strength: ${parameters.electricField || 100} V/m`,
          `Drift velocity: ${results.driftVelocityFormatted || '0.44 mm/s'}`,
          `Mean free path: ${results.meanFreePathFormatted || '2.92 nm'}`,
          `Electrical conductivity: ~${(results.conductivity || 5.98e7).toExponential(2)} S/m`,
        ],
      };
    }

    if (simulationType === 'collision') {
      return {
        title: 'Two-Body Impact & Momentum Conservation',
        summary:
          'Two spherical masses undergo a linear collision on a frictionless track. The simulation demonstrates the conservation of linear momentum and the partitioning of kinetic energy based on the coefficient of restitution.',
        keyConcepts: [
          'Conservation of Linear Momentum: In the absence of external forces, total system momentum before and after impact remains constant (p₁ + p₂ = constant).',
          'Coefficient of Restitution (e): The ratio of relative speed of separation to relative speed of approach.',
          'Kinetic Energy Conservation: Kinetic energy is fully conserved in elastic collisions (e = 1) and partially dissipated as internal energy in inelastic collisions (e < 1).',
        ],
        equations: [
          'm_1 v_1 + m_2 v_2 = m_1 v_1\' + m_2 v_2\'',
          'e = \\frac{v_2\' - v_1\'}{v_1 - v_2}',
          'v_1\' = \\frac{(m_1 - e m_2) v_1 + (1 + e) m_2 v_2}{m_1 + m_2}',
          'v_2\' = \\frac{(m_2 - e m_1) v_2 + (1 + e) m_1 v_1}{m_1 + m_2}',
          '\\Delta E_k = \\frac{1}{2} \\frac{m_1 m_2}{m_1 + m_2} (1 - e^2) (v_1 - v_2)^2',
        ],
        simulationSteps: [
          'Initialize masses m₁ and m₂ with initial velocities v₁ and v₂.',
          'Advance bodies under constant velocity until contact distance is reached.',
          'Apply restitution collision impulse to instantly compute post-collision velocities.',
          'Continue trajectories and compute total energy change.',
        ],
        observations: [
          `Pre-collision momentum: ${(results.initialMomentum || 0).toFixed(2)} kg·m/s`,
          `Post-collision momentum: ${(results.finalMomentum || 0).toFixed(2)} kg·m/s`,
          `Final velocity mass 1: ${(results.finalVelocity1 || 0).toFixed(2)} m/s`,
          `Final velocity mass 2: ${(results.finalVelocity2 || 0).toFixed(2)} m/s`,
          `Kinetic energy dissipated: ${(results.energyLoss || 0).toFixed(2)} J`,
        ],
      };
    }

    if (simulationType === 'pendulum') {
      return {
        title: 'Simple Gravity Pendulum Motion',
        summary:
          'A simple gravity pendulum swinging under the influence of gravity and optional damping, demonstrating rotational dynamics and energy conservation.',
        keyConcepts: [
          'Restoring force is proportional to sin(theta)',
          'Small-angle approximation yields simple harmonic motion',
          'Period depends on length and gravity, independent of mass',
          'Continuous energy exchange between kinetic and gravitational potential energy',
        ],
        equations: [
          '\\frac{d^2\\theta}{dt^2} + \\frac{g}{L} \\sin\\theta = 0',
          'T \\approx 2\\pi \\sqrt{\\frac{L}{g}}',
          'E_k = \\frac{1}{2} m L^2 \\omega^2',
          'E_p = m g L (1 - \\cos\\theta)',
        ],
        simulationSteps: [
          'Initialize pendulum at initial displacement angle',
          'Solve nonlinear pendulum differential equations using numerical integration',
          'Compute bob position in 3D Cartesian coordinates',
          'Update kinetic and potential energies frame by frame',
        ],
        observations: [
          `Oscillation period is approximately ${(results.period || 2.84).toFixed(2)} s`,
          `Natural frequency is ${(results.naturalFrequency || 0.35).toFixed(2)} Hz`,
        ],
      };
    }

    if (simulationType === 'harmonic_oscillator') {
      return {
        title: 'Mass-Spring Harmonic Oscillator',
        summary:
          'A mass attached to a spring oscillating according to Hooke\'s law, demonstrating mechanical oscillations, damping regimes, and resonance behavior.',
        keyConcepts: [
          'Hooke\'s Law restoring force: F = -kx',
          'Natural angular frequency omega_0 = sqrt(k/m)',
          'Damping regime determines whether motion oscillates or exponentially decays',
          'Continuous exchange between spring elastic potential and kinetic energy',
        ],
        equations: [
          'm \\frac{d^2x}{dt^2} + c \\frac{dx}{dt} + k x = 0',
          '\\omega_0 = \\sqrt{\\frac{k}{m}}',
          'T = \\frac{2\\pi}{\\omega_0}',
          'E_{total} = \\frac{1}{2} k x^2 + \\frac{1}{2} m v^2',
        ],
        simulationSteps: [
          'Set initial spring displacement and mass properties',
          'Determine damping regime (undamped, underdamped, overdamped)',
          'Integrate equations of motion across time steps',
          'Compute displacement, velocity, and energy state',
        ],
        observations: [
          `Oscillator period is ${(results.period || 0.89).toFixed(2)} s`,
          `Natural angular frequency is ${(results.angularFrequency || 7.07).toFixed(2)} rad/s`,
          `Damping regime: ${results.dampingRegime || 'undamped'}`,
        ],
      };
    }

    return {
      title: 'Projectile Motion under Gravity',
      summary:
        'A classical 3D ballistic trajectory of an object launched with initial velocity under the influence of uniform gravitational acceleration.',
      keyConcepts: [
        'Gravity provides constant downward acceleration g',
        'Horizontal motion maintains constant velocity (no drag)',
        'Vertical motion is uniformly accelerated',
        'Overall trajectory forms a parabolic path',
      ],
      equations: [
        'x(t) = v_0 \\cos\\theta \\cdot t',
        'y(t) = v_0 \\sin\\theta \\cdot t - \\frac{1}{2} g t^2',
        'T = \\frac{2 v_0 \\sin\\theta}{g}',
        'R = \\frac{v_0^2 \\sin(2\\theta)}{g}',
      ],
      simulationSteps: [
        'Set launch velocity and elevation angle',
        'Compute initial velocity vectors in 3D',
        'Evaluate position coordinates over time',
        'Render parabolic path in 3D scene',
      ],
      observations: [
        `Maximum height reached: ${(results.maximumHeight || 10.2).toFixed(1)} m`,
        `Total flight time: ${(results.timeOfFlight || 2.89).toFixed(2)} s`,
        `Horizontal range: ${(results.range || 40.8).toFixed(1)} m`,
      ],
    };
  }
}

export const explanationService = new ExplanationService();
