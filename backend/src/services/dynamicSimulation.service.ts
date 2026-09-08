import crypto from 'node:crypto';
import {
  DynamicSimulationDefinition,
  DynamicEntity,
  DynamicParameter,
  DynamicTelemetryDef,
  DynamicPhysicsConfig,
  GenerateSimulationResponse,
  LLMProviderOptions,
  SimulationExplanation,
} from '../types/simulation.types.js';
import { llmService, parseRobustJson } from './llm.service.js';

export class DynamicSimulationService {
  /**
   * Generates a fully dynamic, arbitrary 3D physics simulation from any text prompt
   */
  async generateDynamicSimulation(
    prompt: string,
    providerOptions?: LLMProviderOptions
  ): Promise<GenerateSimulationResponse> {
    let retries = 0;
    let modelUsed = 'procedural-physics-engine';
    let providerUsed = 'procedural';
    let fallbackUsed = false;

    // 1. Attempt LLM generation if any provider is resolved
    const resolvedProvider = llmService.resolveProvider(providerOptions);

    if (resolvedProvider) {
      try {
        const systemInstruction = `
You are an expert 3D Computational Physics Engine and Educator.
Your task is to take ANY natural language physics / science topic and generate a complete, interactive 3D physics simulation specification with mathematical rigor, visual aesthetics, real-time parameters, live telemetry, and educational explanations.

You MUST output ONLY valid JSON matching this schema:
{
  "topic": "Concise descriptive topic title",
  "category": "Domain category (e.g., Astrophysics, Electromagnetism, Quantum Mechanics, Fluid Dynamics, Thermodynamics, Classical Mechanics)",
  "sceneEnvironment": {
    "cameraPosition": [x, y, z], // Recommended camera start (e.g. [0, 10, 20])
    "cameraTarget": [x, y, z], // Orbit lookAt target (e.g. [0, 0, 0])
    "gridVisible": true,
    "ambientIntensity": 0.8
  },
  "physics": {
    "engineType": "nbody_gravity" | "lorentz_em" | "harmonic_spring" | "particle_flow" | "wave_equation" | "kinematic" | "rigid_body" | "quantum_packet" | "fluid_vortex" | "thermodynamics",
    "gravity": [0, -9.81, 0], // or [0, 0, 0] for space/EM
    "gravitationalConstant": 6.674e-11, // or 1.0 scaled
    "electricField": [Ex, Ey, Ez], // V/m
    "magneticField": [Bx, By, Bz], // Tesla
    "damping": 0.0,
    "restitution": 1.0,
    "springStiffness": 50,
    "fluidViscosity": 0.01,
    "waveSpeed": 2.0,
    "waveWavelength": 4.0,
    "waveAmplitude": 1.0,
    "temperature": 300,
    "timeStep": 0.016,
    "particleCount": 40
  },
  "entities": [
    {
      "id": "body_1",
      "name": "Object Name",
      "geometry": "sphere" | "box" | "cylinder" | "cone" | "ring" | "torus" | "arrow" | "plane" | "particle_cloud" | "field_grid" | "spring_coil" | "wave_surface",
      "color": "#HEX_COLOR",
      "emissive": "#HEX_GLOW",
      "emissiveIntensity": 0.4,
      "radius": 1.0, // or dimensions: [w, h, d]
      "position": [x, y, z],
      "velocity": [vx, vy, vz],
      "mass": 1.0,
      "charge": 1.0, // for EM lorentz
      "showTrail": true,
      "trailColor": "#HEX_COLOR",
      "fixed": false,
      "label": "Display Label",
      "physicsRole": "body" | "emitter" | "field_source" | "barrier" | "target"
    }
  ],
  "parameters": [
    {
      "key": "paramKey",
      "label": "User Friendly Label",
      "value": 10.0,
      "min": 1.0,
      "max": 100.0,
      "step": 0.5,
      "unit": "unit (e.g. m/s, T, kg, K, N/m)",
      "description": "What this slider tunes in the simulation"
    }
  ],
  "telemetry": [
    {
      "key": "kineticEnergy",
      "label": "Kinetic Energy",
      "unit": "J",
      "format": "0.00",
      "formulaDescription": "E_k = 1/2 m v^2"
    }
  ],
  "explanation": {
    "title": "Educational Title",
    "summary": "2-3 sentences explaining the core physics happening in this 3D simulation.",
    "keyConcepts": [
      "Concept 1: Definition and insight",
      "Concept 2: Conservation laws and governing forces"
    ],
    "equations": [
      "F = q(E + v \\times B)",
      "\\omega_c = \\frac{q B}{m}"
    ],
    "simulationSteps": [
      "Step 1 of real-time computational integration",
      "Step 2: Force accumulation and boundary handling"
    ],
    "observations": [
      "Observation 1 regarding equilibrium or trajectory behavior",
      "Observation 2 on parameter tuning consequences"
    ]
  }
}

CRITICAL RULES:
1. Always return valid, well-structured JSON without markdown ticks outside.
2. Equations must be clean standard LaTeX strings (without $ delimiters).
3. Ensure entities have visually distinct, vibrant, modern colors with pleasing glow.
4. Scale coordinates sensibly within range [-20, 20] for 3D Three.js rendering.
`;

        const llmRes = await llmService.generateCompletion(
          prompt,
          {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
          providerOptions
        );

        modelUsed = llmRes.model;
        providerUsed = llmRes.provider;

        const parsed = parseRobustJson(llmRes.text);
        if (parsed && parsed.physics && parsed.entities && Array.isArray(parsed.entities)) {
          return this.packageDynamicResponse(
            prompt,
            parsed,
            modelUsed,
            providerUsed,
            retries,
            false
          );
        }
      } catch (err: any) {
        retries++;
        console.warn(`[Dynamic Simulation] LLM generation failed (${err.message}). Using procedural fallback generator.`);
        fallbackUsed = true;
      }
    } else {
      fallbackUsed = true;
    }

    // 2. Procedural Algorithmic Physics Generator Fallback
    const proceduralDef = this.generateProceduralPhysics(prompt);
    return this.packageDynamicResponse(
      prompt,
      proceduralDef,
      'procedural-physics-synthesizer',
      'procedural',
      retries,
      true
    );
  }

  private packageDynamicResponse(
    prompt: string,
    def: any,
    modelUsed: string,
    provider: string,
    retries: number,
    fallbackUsed: boolean
  ): GenerateSimulationResponse {
    const simulationId = `sim_dyn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Extract parameters dictionary for easy slider binding
    const paramsMap: Record<string, number> = {};
    if (Array.isArray(def.parameters)) {
      for (const p of def.parameters) {
        if (p.key && typeof p.value === 'number') {
          paramsMap[p.key] = p.value;
        }
      }
    }

    // Extract or build explanation
    const explanation: SimulationExplanation = {
      title: def.explanation?.title || def.topic || 'Interactive 3D Physics Simulation',
      summary:
        def.explanation?.summary ||
        `Real-time interactive 3D physics simulation visualizing ${prompt}.`,
      keyConcepts:
        def.explanation?.keyConcepts && def.explanation.keyConcepts.length > 0
          ? def.explanation.keyConcepts
          : [
              'Dynamic Numerical Integration: Solving differential equations of motion in 3D space.',
              'Real-Time State Evolution: Particle velocity and position updates computed every frame.',
              'Conservation Laws: System tracks kinetic, potential, and total energy in real-time.',
            ],
      equations:
        def.explanation?.equations && def.explanation.equations.length > 0
          ? def.explanation.equations
          : ['\\vec{F} = m \\frac{d^2\\vec{r}}{dt^2}', 'E_{\\text{total}} = E_k + E_p'],
      simulationSteps:
        def.explanation?.simulationSteps && def.explanation.simulationSteps.length > 0
          ? def.explanation.simulationSteps
          : [
              'Initialize 3D entities with defined masses, charges, and spatial velocity vectors.',
              'Evaluate instantaneous net forces from gravitational, electromagnetic, or spring interactions.',
              'Numerically integrate state trajectories over time step Δt.',
              'Render dynamic vector fields, particle trails, and real-time telemetry HUD.',
            ],
      observations:
        def.explanation?.observations && def.explanation.observations.length > 0
          ? def.explanation.observations
          : [
              `Simulating ${def.entities?.length || 3} dynamic interactive entities in 3D space.`,
              'Parameters can be manipulated in real time via the Physics control panel.',
            ],
    };

    const dynamicDefinition: DynamicSimulationDefinition = {
      topic: def.topic || prompt,
      category: def.category || 'General Physics',
      sceneEnvironment: def.sceneEnvironment || {
        cameraPosition: [0, 8, 18],
        cameraTarget: [0, 0, 0],
        gridVisible: true,
        ambientIntensity: 0.8,
      },
      physics: def.physics || {
        engineType: 'kinematic',
        timeStep: 0.016,
      },
      entities: def.entities || [],
      parameters: def.parameters || [],
      telemetry: def.telemetry || [
        { key: 'kineticEnergy', label: 'Kinetic Energy', unit: 'J', format: '0.00' },
        { key: 'speed', label: 'Current Velocity', unit: 'm/s', format: '0.00' },
      ],
    };

    return {
      success: true,
      simulation: {
        id: simulationId,
        type: 'dynamic',
        parameters: paramsMap,
        trajectory: [],
        results: {
          topic: def.topic,
          category: def.category,
          entityCount: def.entities?.length || 0,
          engineType: def.physics?.engineType,
        },
        dynamicDefinition,
      },
      explanation,
      metadata: {
        modelUsed,
        retries,
        fallbackUsed,
        template: 'dynamic',
        provider,
      },
    };
  }

  // =========================================================================
  // PROCEDURAL PHYSICS GENERATOR (FALLBACK & OFFLINE SYNTHESIZER)
  // =========================================================================
  private generateProceduralPhysics(prompt: string): any {
    const p = prompt.toLowerCase();

    // 1. THREE-BODY / N-BODY GRAVITATIONAL ORBITS & CELESTIAL MECHANICS
    if (
      p.includes('body') ||
      p.includes('gravit') ||
      p.includes('orbit') ||
      p.includes('planet') ||
      p.includes('solar') ||
      p.includes('black hole') ||
      p.includes('star') ||
      p.includes('kepler') ||
      p.includes('galaxy')
    ) {
      return {
        topic: 'Three-Body Gravitational Orbital Dynamics & Chaos',
        category: 'Astrophysics & Celestial Mechanics',
        sceneEnvironment: {
          cameraPosition: [0, 14, 22],
          cameraTarget: [0, 0, 0],
          gridVisible: true,
          ambientIntensity: 0.6,
        },
        physics: {
          engineType: 'nbody_gravity',
          gravitationalConstant: 12.0,
          damping: 0.0,
          timeStep: 0.016,
        },
        entities: [
          {
            id: 'star_alpha',
            name: 'Primary Star (Alpha)',
            geometry: 'sphere',
            color: '#F59E0B',
            emissive: '#D97706',
            emissiveIntensity: 0.8,
            radius: 1.2,
            position: [-4.0, 0, 0],
            velocity: [0, 0, 1.2],
            mass: 25.0,
            showTrail: true,
            trailColor: '#F59E0B',
            label: 'Star Alpha',
            physicsRole: 'body',
          },
          {
            id: 'star_beta',
            name: 'Secondary Star (Beta)',
            geometry: 'sphere',
            color: '#3B82F6',
            emissive: '#1D4ED8',
            emissiveIntensity: 0.8,
            radius: 1.0,
            position: [4.0, 0, 0],
            velocity: [0, 0, -1.2],
            mass: 20.0,
            showTrail: true,
            trailColor: '#3B82F6',
            label: 'Star Beta',
            physicsRole: 'body',
          },
          {
            id: 'planet_gamma',
            name: 'Circumbinary Planet (Gamma)',
            geometry: 'sphere',
            color: '#10B981',
            emissive: '#059669',
            emissiveIntensity: 0.5,
            radius: 0.5,
            position: [0, 0, 7.5],
            velocity: [-2.1, 0.4, 0],
            mass: 1.0,
            showTrail: true,
            trailColor: '#10B981',
            label: 'Planet Gamma',
            physicsRole: 'body',
          },
        ],
        parameters: [
          {
            key: 'gravitationalConstant',
            label: 'Gravitational Constant (G)',
            value: 12.0,
            min: 1.0,
            max: 30.0,
            step: 0.5,
            unit: 'G units',
            description: 'Mutual gravitational attraction strength',
          },
          {
            key: 'mass1',
            label: 'Primary Star Mass (M₁)',
            value: 25.0,
            min: 5.0,
            max: 60.0,
            step: 1.0,
            unit: 'M☉',
            description: 'Mass of primary yellow star',
          },
          {
            key: 'mass2',
            label: 'Secondary Star Mass (M₂)',
            value: 20.0,
            min: 5.0,
            max: 60.0,
            step: 1.0,
            unit: 'M☉',
            description: 'Mass of secondary blue star',
          },
          {
            key: 'planetSpeed',
            label: 'Planet Orbital Velocity',
            value: 2.1,
            min: 0.5,
            max: 5.0,
            step: 0.1,
            unit: 'km/s',
            description: 'Initial tangential velocity of the orbiting planet',
          },
        ],
        telemetry: [
          { key: 'totalEnergy', label: 'Orbital Hamiltonian Energy', unit: 'J', format: '0.00' },
          { key: 'kineticEnergy', label: 'Total Kinetic Energy', unit: 'J', format: '0.00' },
          { key: 'potentialEnergy', label: 'Gravitational Potential Energy', unit: 'J', format: '0.00' },
          { key: 'speed', label: 'Planet Orbital Velocity', unit: 'm/s', format: '0.00' },
        ],
        explanation: {
          title: 'Three-Body Gravitational Problem & Deterministic Chaos',
          summary:
            'This simulation computes the simultaneous gravitational mutual interactions among three celestial bodies. The nonlinear gravitational coupling between two massive stellar cores and an orbiting planet demonstrates sensitive dependence on initial conditions (deterministic chaos) and complex orbital resonance.',
          keyConcepts: [
            'Newtonian Universal Gravitation: Every body exerts an attractive force F = G (m₁ m₂) / r² directed along the displacement vector between their centers of mass.',
            'Nonlinear Three-Body Problem: Unlike two-body Keplerian orbits, general three-body systems have no closed-form analytical solution and exhibit chaotic orbital trajectories.',
            'Conservation of Energy & Angular Momentum: The total mechanical energy and total angular momentum vector remain conserved throughout the interaction.',
          ],
          equations: [
            '\\vec{F}_i = \\sum_{j \\neq i} G \\frac{m_i m_j}{|\\vec{r}_j - \\vec{r}_i|^3} (\\vec{r}_j - \\vec{r}_i)',
            '\\frac{d^2\\vec{r}_i}{dt^2} = \\sum_{j \\neq i} G \\frac{m_j}{|\\vec{r}_j - \\vec{r}_i|^3} (\\vec{r}_j - \\vec{r}_i)',
            'E_{\\text{total}} = \\sum_i \\frac{1}{2} m_i v_i^2 - \\sum_{i < j} \\frac{G m_i m_j}{|\\vec{r}_j - \\vec{r}_i|} = \\text{const}',
          ],
          simulationSteps: [
            'Initialize position and velocity vectors for all three celestial bodies in 3D coordinate space.',
            'Calculate pairwise mutual gravitational forces between all body pairs at each time step Δt.',
            'Integrate differential equations of motion using Verlet/Euler numerical symplectic integration.',
            'Track orbital trails and verify energy conservation across the simulation duration.',
          ],
          observations: [
            'Binary stellar system rotates about their common center of mass (barycenter).',
            'Perturbations from the secondary star cause the planet orbital plane to precess chaotically.',
            'Total orbital energy remains constant within numerical integration bounds.',
          ],
        },
      };
    }

    // 2. LORENTZ FORCE, MAGNETIC FIELDS, CYCLOTRON & CHARGED PARTICLES
    if (
      p.includes('lorentz') ||
      p.includes('magnetic') ||
      p.includes('cyclotron') ||
      p.includes('electric field') ||
      p.includes('charge') ||
      p.includes('helical') ||
      p.includes('plasma') ||
      p.includes('dipole')
    ) {
      return {
        topic: 'Lorentz Force on Charged Particles in Helical Electromagnetic Fields',
        category: 'Electromagnetism & Plasma Physics',
        sceneEnvironment: {
          cameraPosition: [0, 10, 20],
          cameraTarget: [0, 0, 0],
          gridVisible: true,
          ambientIntensity: 0.7,
        },
        physics: {
          engineType: 'lorentz_em',
          electricField: [0, 1.5, 0],
          magneticField: [0, 0, 4.0],
          damping: 0.0,
          timeStep: 0.016,
        },
        entities: [
          {
            id: 'ion_positive',
            name: 'Positron / Ion (+q)',
            geometry: 'sphere',
            color: '#EC4899',
            emissive: '#BE185D',
            emissiveIntensity: 0.9,
            radius: 0.6,
            position: [0, -3.0, -8.0],
            velocity: [3.5, 1.0, 2.0],
            mass: 1.0,
            charge: 1.0,
            showTrail: true,
            trailColor: '#EC4899',
            label: '+q Ion (Helical Trajectory)',
            physicsRole: 'body',
          },
          {
            id: 'electron_negative',
            name: 'Electron (-q)',
            geometry: 'sphere',
            color: '#06B6D4',
            emissive: '#0891B2',
            emissiveIntensity: 0.9,
            radius: 0.4,
            position: [0, -1.0, -8.0],
            velocity: [-3.0, 1.0, 2.0],
            mass: 0.5,
            charge: -1.0,
            showTrail: true,
            trailColor: '#06B6D4',
            label: '-q Electron',
            physicsRole: 'body',
          },
          {
            id: 'b_field_grid',
            name: 'Magnetic Field B-Lines',
            geometry: 'field_grid',
            color: '#6366F1',
            emissive: '#4F46E5',
            emissiveIntensity: 0.4,
            position: [0, 0, 0],
            label: 'Uniform B Field (z-axis)',
            physicsRole: 'field_source',
          },
        ],
        parameters: [
          {
            key: 'magneticFieldZ',
            label: 'Magnetic Field (B_z)',
            value: 4.0,
            min: 0.5,
            max: 12.0,
            step: 0.5,
            unit: 'Tesla (T)',
            description: 'Strength of axial magnetic flux density causing gyro-motion',
          },
          {
            key: 'electricFieldY',
            label: 'Electric Field (E_y)',
            value: 1.5,
            min: -5.0,
            max: 5.0,
            step: 0.2,
            unit: 'V/m',
            description: 'Electric field accelerating charge along y-axis',
          },
          {
            key: 'initialVelocityX',
            label: 'Perpendicular Velocity (v_x)',
            value: 3.5,
            min: 0.5,
            max: 8.0,
            step: 0.5,
            unit: 'm/s',
            description: 'Determines cyclotron gyro-radius',
          },
          {
            key: 'charge',
            label: 'Particle Charge (q)',
            value: 1.0,
            min: -2.0,
            max: 2.0,
            step: 0.5,
            unit: 'e',
            description: 'Sign and magnitude of electric charge',
          },
        ],
        telemetry: [
          { key: 'cyclotronRadius', label: 'Larmor Gyro-Radius (r_L)', unit: 'm', format: '0.00' },
          { key: 'cyclotronFrequency', label: 'Cyclotron Frequency (ω_c)', unit: 'rad/s', format: '0.00' },
          { key: 'driftVelocity', label: 'E x B Drift Velocity', unit: 'm/s', format: '0.00' },
          { key: 'speed', label: 'Particle Speed', unit: 'm/s', format: '0.00' },
        ],
        explanation: {
          title: 'Lorentz Force, Cyclotron Motion & E×B Drift Dynamics',
          summary:
            'A charged particle moving through combined electric and magnetic fields experiences the Lorentz force F = q(E + v × B). The perpendicular magnetic component forces circular gyration with cyclotron frequency ω_c = qB/m, while electric fields induce axial drift and helical motion.',
          keyConcepts: [
            'Lorentz Force Equation: Net electromagnetic force combines electrostatic Coulomb acceleration qE and magnetic cross-product force q(v × B).',
            'Larmor Gyroradius: The radius of circular gyration r_L = (m v_perp) / (|q| B) is directly proportional to particle momentum and inversely proportional to magnetic field strength.',
            'Crossed-Field Drift: In perpendicular E and B fields, charged particles undergo net cross-field drift v_d = (E × B) / B² regardless of charge sign.',
          ],
          equations: [
            '\\vec{F} = q \\left( \\vec{E} + \\vec{v} \\times \\vec{B} \\right)',
            'r_L = \\frac{m v_\\perp}{|q| B}',
            '\\omega_c = \\frac{|q| B}{m}',
            '\\vec{v}_{\\text{drift}} = \\frac{\\vec{E} \\times \\vec{B}}{B^2}',
          ],
          simulationSteps: [
            'Initialize charged ions with 3D initial velocity vector v.',
            'Evaluate magnetic cross-product vector v × B and electric field acceleration.',
            'Apply Lorentz equation to determine instantaneous 3D acceleration vector a = F / m.',
            'Compute 3D helical trajectory path and gyration radius in real-time.',
          ],
          observations: [
            'Positive and negative charges gyrate in opposite directions around magnetic field lines.',
            'Increasing magnetic field B tightens the helical radius and raises cyclotron frequency.',
            'Electric field component introduces continuous linear acceleration along the field vector.',
          ],
        },
      };
    }

    // 3. FLUID DYNAMICS, VORTEX & THERMODYNAMICS
    if (
      p.includes('fluid') ||
      p.includes('vortex') ||
      p.includes('gas') ||
      p.includes('thermo') ||
      p.includes('piston') ||
      p.includes('pressure') ||
      p.includes('bernoulli') ||
      p.includes('viscos')
    ) {
      return {
        topic: '3D Fluid Vortex Dynamics & Navier-Stokes Streamlines',
        category: 'Fluid Mechanics & Hydrodynamics',
        sceneEnvironment: {
          cameraPosition: [0, 12, 18],
          cameraTarget: [0, 0, 0],
          gridVisible: true,
          ambientIntensity: 0.8,
        },
        physics: {
          engineType: 'fluid_vortex',
          fluidViscosity: 0.02,
          damping: 0.01,
          timeStep: 0.016,
          particleCount: 60,
        },
        entities: [
          {
            id: 'vortex_core',
            name: 'Central Vortex Core',
            geometry: 'cylinder',
            color: '#60A5FA',
            emissive: '#2563EB',
            emissiveIntensity: 0.6,
            dimensions: [0.6, 10, 16],
            position: [0, 0, 0],
            label: 'Vortex Core Axis',
            physicsRole: 'field_source',
          },
          {
            id: 'tracer_particles',
            name: 'Fluid Tracer Cloud',
            geometry: 'particle_cloud',
            color: '#38BDF8',
            emissive: '#0284C7',
            emissiveIntensity: 0.8,
            radius: 5.0,
            position: [0, 0, 0],
            label: 'Tracer Streamlines',
            physicsRole: 'emitter',
          },
        ],
        parameters: [
          {
            key: 'vortexCirculation',
            label: 'Circulation Strength (Γ)',
            value: 8.0,
            min: 1.0,
            max: 20.0,
            step: 0.5,
            unit: 'm²/s',
            description: 'Vortex core angular circulation velocity',
          },
          {
            key: 'coreRadius',
            label: 'Vortex Core Radius (a)',
            value: 1.5,
            min: 0.5,
            max: 4.0,
            step: 0.1,
            unit: 'm',
            description: 'Rankine vortex core transition boundary',
          },
          {
            key: 'axialSpeed',
            label: 'Axial Inflow Velocity (v_z)',
            value: 1.2,
            min: 0.0,
            max: 5.0,
            step: 0.2,
            unit: 'm/s',
            description: 'Vertical convective flow rate along the vortex funnel',
          },
          {
            key: 'fluidViscosity',
            label: 'Kinematic Viscosity (ν)',
            value: 0.02,
            min: 0.001,
            max: 0.1,
            step: 0.005,
            unit: 'm²/s',
            description: 'Fluid internal shear friction and vorticity diffusion',
          },
        ],
        telemetry: [
          { key: 'vorticity', label: 'Peak Core Vorticity (ω)', unit: 's⁻¹', format: '0.00' },
          { key: 'angularMomentum', label: 'Fluid Angular Momentum', unit: 'kg·m²/s', format: '0.00' },
          { key: 'kineticEnergy', label: 'Total Flow Kinetic Energy', unit: 'J', format: '0.00' },
          { key: 'speed', label: 'Max Tangential Speed', unit: 'm/s', format: '0.00' },
        ],
        explanation: {
          title: 'Vorticity Dynamics, Rankine Vortex & Swirling Streamlines',
          summary:
            'This simulation demonstrates rotational fluid mechanics governed by the Navier-Stokes equations. Fluid tracers circulate around a central core where tangential velocity transitions from solid-body rotation inside the core to irrotational potential flow outside.',
          keyConcepts: [
            'Rankine Vortex Model: Combines rigid-body rotation inside radius a with potential vortex velocity v_theta proportional to 1/r outside.',
            'Vorticity & Circulation: Circulation Gamma = closed contour integral of velocity represents total swirling strength.',
            'Bernoulli Pressure Depression: Fast rotational speeds near the vortex core cause severe localized pressure drops, forming swirling vortex funnels.',
          ],
          equations: [
            'v_\\theta(r) = \\begin{cases} \\frac{\\Gamma r}{2\\pi a^2} & r \\le a \\\\ \\frac{\\Gamma}{2\\pi r} & r > a \\end{cases}',
            '\\vec{\\omega} = \\nabla \\times \\vec{v}',
            'p(r) = p_\\infty - \\frac{1}{2} \\rho v_\\theta(r)^2',
          ],
          simulationSteps: [
            'Spawn fluid tracer particles across the cylindrical domain.',
            'Compute instantaneous velocity field from tangential circulation and axial convective inflow.',
            'Advect particles through vector streamlines with viscous damping dissipation.',
            'Track core pressure gradient and velocity distribution in real-time.',
          ],
          observations: [
            'Fluid particles orbit faster closer to the core boundary before tapering off at large radii.',
            'Increasing circulation Gamma tightens particle spirals and elevates kinetic energy.',
          ],
        },
      };
    }

    // 4. NUCLEAR PHYSICS, RADIOACTIVE DECAY & ATOMIC STRUCTURE
    if (
      p.includes('radioactive') ||
      p.includes('decay') ||
      p.includes('nuclear') ||
      p.includes('radiation') ||
      p.includes('isotope') ||
      p.includes('alpha') ||
      p.includes('beta') ||
      p.includes('gamma') ||
      p.includes('fission') ||
      p.includes('fusion') ||
      p.includes('half life') ||
      p.includes('atom')
    ) {
      return {
        topic: 'Nuclear Radioactive Decay & Alpha/Beta Particle Emission',
        category: 'Nuclear & Quantum Physics',
        sceneEnvironment: {
          cameraPosition: [0, 8, 16],
          cameraTarget: [0, 0, 0],
          gridVisible: true,
          ambientIntensity: 0.8,
        },
        physics: {
          engineType: 'particle_flow',
          damping: 0.0,
          timeStep: 0.016,
        },
        entities: [
          {
            id: 'parent_nucleus',
            name: 'Heavy Parent Nucleus (U-238)',
            geometry: 'sphere',
            color: '#EF4444',
            emissive: '#DC2626',
            emissiveIntensity: 0.85,
            radius: 1.6,
            position: [0, 0, 0],
            velocity: [0, 0, 0],
            mass: 238.0,
            label: 'Parent Nucleus (Z=92)',
            physicsRole: 'emitter',
          },
          {
            id: 'alpha_particle',
            name: 'Alpha Particle (⁴He²⁺)',
            geometry: 'sphere',
            color: '#F59E0B',
            emissive: '#D97706',
            emissiveIntensity: 0.9,
            radius: 0.6,
            position: [2.5, 1.2, 0],
            velocity: [4.0, 1.8, 0],
            mass: 4.0,
            charge: 2.0,
            showTrail: true,
            trailColor: '#F59E0B',
            label: 'α Particle (⁴He²⁺, 5.3 MeV)',
            physicsRole: 'body',
          },
          {
            id: 'daughter_nucleus',
            name: 'Daughter Nucleus (Th-234)',
            geometry: 'sphere',
            color: '#3B82F6',
            emissive: '#2563EB',
            emissiveIntensity: 0.7,
            radius: 1.4,
            position: [-0.8, -0.4, 0],
            velocity: [-0.1, -0.05, 0],
            mass: 234.0,
            label: 'Daughter Core (Th-234)',
            physicsRole: 'body',
          },
          {
            id: 'gamma_photon',
            name: 'Gamma Ray Photon Beam (γ)',
            geometry: 'arrow',
            color: '#A855F7',
            emissive: '#9333EA',
            emissiveIntensity: 1.0,
            dimensions: [0.3, 3.5, 0.3],
            position: [-1.5, 2.8, 0],
            velocity: [-2.0, 3.5, 0],
            label: 'γ Ray Photon (hν)',
            physicsRole: 'body',
          },
        ],
        parameters: [
          {
            key: 'halfLife',
            label: 'Nuclear Half-Life (T_1/2)',
            value: 4.5,
            min: 0.5,
            max: 20.0,
            step: 0.5,
            unit: 's',
            description: 'Time required for 50% of parent radioactive nuclei to decay',
          },
          {
            key: 'decayConstant',
            label: 'Decay Constant (λ = ln 2 / T_1/2)',
            value: 0.154,
            min: 0.01,
            max: 1.0,
            step: 0.01,
            unit: 's⁻¹',
            description: 'Instantaneous probability of decay per unit time',
          },
          {
            key: 'ejectionEnergy',
            label: 'Alpha Particle Kinetic Energy',
            value: 5.3,
            min: 1.0,
            max: 10.0,
            step: 0.2,
            unit: 'MeV',
            description: 'Q-value disintegration energy imparted to the emitted alpha particle',
          },
          {
            key: 'initialNucleiCount',
            label: 'Initial Parent Nuclei (N₀)',
            value: 1000,
            min: 100,
            max: 5000,
            step: 100,
            unit: 'atoms',
            description: 'Initial population of undecayed radioactive isotopes',
          },
        ],
        telemetry: [
          { key: 'activity', label: 'Decay Activity (A = λN)', unit: 'Bq', format: '0.00' },
          { key: 'remainingFraction', label: 'Remaining Parent Nuclei', unit: '%', format: '0.0' },
          { key: 'alphaVelocity', label: 'Alpha Ejection Velocity', unit: 'x10⁶ m/s', format: '0.00' },
          { key: 'totalEnergy', label: 'Total Disintegration Q-Value', unit: 'MeV', format: '0.00' },
        ],
        explanation: {
          title: 'Radioactive Decay Kinetics & Alpha/Beta Disintegration',
          summary:
            'Radioactive decay is a stochastic quantum tunneling process wherein an unstable atomic nucleus spontaneously transforms into a more stable nuclear configuration by emitting ionizing radiation (alpha particles, beta particles, or gamma photons).',
          keyConcepts: [
            'Exponential Decay Law: The population of parent nuclei decreases exponentially over time according to N(t) = N₀ exp(-λt).',
            'Quantum Tunneling in Alpha Decay: Alpha particles (helium-4 nuclei) escape the attractive nuclear strong force potential well via quantum tunneling across the Coulomb barrier (Gamow theory).',
            'Conservation of Mass-Energy & Momentum: The total Q-value energy released is partitioned inversely proportional to the masses between the alpha particle and the recoiling daughter nucleus.',
          ],
          equations: [
            'N(t) = N_0 e^{-\\lambda t}',
            'T_{1/2} = \\frac{\\ln(2)}{\\lambda}',
            'A(t) = -\\frac{dN}{dt} = \\lambda N(t)',
            'Q = (m_{\\text{parent}} - m_{\\text{daughter}} - m_\\alpha) c^2',
          ],
          simulationSteps: [
            'Initialize parent heavy nucleus in quantum equilibrium within Coulomb barrier.',
            'Compute decay probability λ = ln(2) / T_1/2 and instantaneous activity A(t).',
            'Simulate spontaneous barrier penetration and ejection of high-energy alpha particle.',
            'Calculate daughter nucleus recoil momentum conserving total linear momentum.',
          ],
          observations: [
            'Decreasing half-life accelerates decay activity and parent nucleus depletion rate.',
            'Alpha particle carries away the vast majority (>98%) of total kinetic energy due to its smaller mass compared to the daughter core.',
          ],
        },
      };
    }

    // 5. WAVE EQUATIONS, WATER RIPPLES & DISPERSION (ONLY IF SPECIFICALLY REQUESTED)
    if (
      p.includes('wave') ||
      p.includes('ripple') ||
      p.includes('dispersion') ||
      p.includes('water')
    ) {
      return {
        topic: '3D Wave Packet Dispersion & Wave Mechanics',
        category: 'Wave Mechanics & Optics',
        sceneEnvironment: {
          cameraPosition: [0, 10, 18],
          cameraTarget: [0, 0, 0],
          gridVisible: true,
          ambientIntensity: 0.8,
        },
        physics: {
          engineType: 'wave_equation',
          waveSpeed: 3.0,
          waveWavelength: 3.5,
          waveAmplitude: 1.2,
          damping: 0.0,
          timeStep: 0.016,
        },
        entities: [
          {
            id: 'wave_mesh',
            name: 'Wave Heightfield Surface',
            geometry: 'wave_surface',
            color: '#8B5CF6',
            emissive: '#6D28D9',
            emissiveIntensity: 0.7,
            radius: 8.0,
            position: [0, 0, 0],
            label: 'Wave Amplitude ψ(x,y,t)',
            physicsRole: 'body',
          },
          {
            id: 'wave_packet_center',
            name: 'Wave Crest Indicator',
            geometry: 'sphere',
            color: '#F43F5E',
            emissive: '#E11D48',
            emissiveIntensity: 0.9,
            radius: 0.6,
            position: [0, 1.2, 0],
            label: 'Center Peak',
            physicsRole: 'target',
          },
        ],
        parameters: [
          {
            key: 'waveSpeed',
            label: 'Phase Velocity (v_p)',
            value: 3.0,
            min: 0.5,
            max: 8.0,
            step: 0.5,
            unit: 'm/s',
            description: 'Propagation speed of wave peaks',
          },
          {
            key: 'waveWavelength',
            label: 'Wavelength (λ)',
            value: 3.5,
            min: 1.0,
            max: 10.0,
            step: 0.5,
            unit: 'm',
            description: 'Spatial period between adjacent wave crests',
          },
          {
            key: 'waveAmplitude',
            label: 'Wave Amplitude (A)',
            value: 1.2,
            min: 0.2,
            max: 3.0,
            step: 0.1,
            unit: 'm',
            description: 'Peak oscillation displacement',
          },
        ],
        telemetry: [
          { key: 'waveFrequency', label: 'Frequency (f)', unit: 'Hz', format: '0.00' },
          { key: 'wavenumber', label: 'Wavenumber (k)', unit: 'rad/m', format: '0.00' },
          { key: 'energyDensity', label: 'Energy Density', unit: 'J/m²', format: '0.00' },
        ],
        explanation: {
          title: 'Wave Equation, Interference & Propagation Dynamics',
          summary: 'This interactive 3D simulation visualizes the propagation, harmonic oscillations, and spatial crest distribution across a continuous 2D surface.',
          keyConcepts: [
            'Wave Equation: Relates the second spatial derivative of displacement to its second time derivative.',
            'Harmonic Superposition: Multiple coherent waveforms combine constructively or destructively depending on phase difference.',
          ],
          equations: [
            '\\frac{\\partial^2 \\psi}{\\partial t^2} = v^2 \\nabla^2 \\psi',
            'v = \\lambda f = \\frac{\\omega}{k}',
          ],
          simulationSteps: [
            'Generate 3D spatial heightfield grid.',
            'Compute instantaneous phase for each vertex.',
            'Render displacement and real-time amplitude.',
          ],
          observations: [
            'Adjusting wavelength changes ripple density.',
            'Adjusting wave velocity modulates propagation speed across the mesh.',
          ],
        },
      };
    }

    // 6. DEFAULT GENERAL PARTICLE KINEMATICS & HARMONIC RESONANCE (FOR ANY ARBITRARY TOPIC)
    return {
      topic: `${prompt.charAt(0).toUpperCase() + prompt.slice(1)} — Dynamic Physical System`,
      category: 'General Computational Physics',
      sceneEnvironment: {
        cameraPosition: [0, 8, 16],
        cameraTarget: [0, 0, 0],
        gridVisible: true,
        ambientIntensity: 0.8,
      },
      physics: {
        engineType: 'harmonic_spring',
        springStiffness: 25.0,
        damping: 0.02,
        timeStep: 0.016,
      },
      entities: [
        {
          id: 'core_emitter',
          name: 'Primary Physics Core',
          geometry: 'sphere',
          color: '#3B82F6',
          emissive: '#1D4ED8',
          emissiveIntensity: 0.8,
          radius: 1.2,
          position: [0, 0, 0],
          velocity: [0, 0, 0],
          mass: 10.0,
          label: 'Core State Center',
          physicsRole: 'emitter',
        },
        {
          id: 'probe_alpha',
          name: 'Kinetic Dynamic Probe Alpha',
          geometry: 'sphere',
          color: '#10B981',
          emissive: '#059669',
          emissiveIntensity: 0.8,
          radius: 0.7,
          position: [4.0, 0, 0],
          velocity: [0, 2.5, 1.0],
          mass: 2.0,
          showTrail: true,
          trailColor: '#10B981',
          label: 'Probe α (v = 2.7 m/s)',
          physicsRole: 'body',
        },
        {
          id: 'probe_beta',
          name: 'Kinetic Dynamic Probe Beta',
          geometry: 'sphere',
          color: '#F59E0B',
          emissive: '#D97706',
          emissiveIntensity: 0.8,
          radius: 0.6,
          position: [-3.5, 1.5, 0],
          velocity: [0, -2.0, -1.2],
          mass: 1.5,
          showTrail: true,
          trailColor: '#F59E0B',
          label: 'Probe β',
          physicsRole: 'body',
        },
      ],
      parameters: [
        {
          key: 'systemEnergy',
          label: 'System Coupling Strength',
          value: 25.0,
          min: 5.0,
          max: 60.0,
          step: 1.0,
          unit: 'N/m',
          description: 'Restoring interaction force constant between kinetic bodies',
        },
        {
          key: 'dampingRate',
          label: 'Damping Coefficient (γ)',
          value: 0.02,
          min: 0.0,
          max: 0.2,
          step: 0.01,
          unit: 's⁻¹',
          description: 'Viscous frictional dissipation rate',
        },
        {
          key: 'initialSpeed',
          label: 'Initial Probe Velocity',
          value: 2.5,
          min: 0.5,
          max: 8.0,
          step: 0.5,
          unit: 'm/s',
          description: 'Kinetic orbital speed of probe particles',
        },
      ],
      telemetry: [
        { key: 'totalEnergy', label: 'Total Hamiltonian Energy', unit: 'J', format: '0.00' },
        { key: 'kineticEnergy', label: 'Kinetic Energy', unit: 'J', format: '0.00' },
        { key: 'potentialEnergy', label: 'Potential Energy', unit: 'J', format: '0.00' },
        { key: 'speed', label: 'Probe Alpha Speed', unit: 'm/s', format: '0.00' },
      ],
      explanation: {
        title: `${prompt.charAt(0).toUpperCase() + prompt.slice(1)}: Interactive 3D Physics Simulation`,
        summary: `This dynamic 3D physics sandbox models the physical state evolution and interaction forces for "${prompt}". The system solves instantaneous equations of motion in 3D coordinate space with real-time numerical integration.`,
        keyConcepts: [
          'State Vector Evolution: Continuous computation of 3D position r(t) and velocity v(t) vectors.',
          'Energy Partition: Dynamic exchange between potential and kinetic energy reservoirs.',
          'Real-Time Telemetry: Live calculation of Hamiltonian energy, velocity magnitudes, and particle trajectories.',
        ],
        equations: [
          '\\vec{F}_{\\text{net}} = m \\frac{d^2\\vec{r}}{dt^2}',
          'E_{\\text{total}} = \\frac{1}{2} m v^2 + V(\\vec{r}) = \\text{const}',
        ],
        simulationSteps: [
          'Initialize 3D physical entities with masses and velocity vectors.',
          'Evaluate instantaneous coupling forces across particle network.',
          'Numerically integrate state trajectories over time step Δt.',
          'Render real-time 3D particle trails, coordinate vectors, and telemetry.',
        ],
        observations: [
          'Dynamic sliders permit interactive exploration of system state stability and velocities.',
          'Conservation laws maintain total energy within numerical tolerances.',
        ],
      },
    };
  }
}

export const dynamicSimulationService = new DynamicSimulationService();

