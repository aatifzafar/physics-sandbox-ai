import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type {
  PhysicsSimulationData,
  DynamicEntity,
  DynamicSimulationDefinition,
} from "../../lib/api";
import type { GraphicsSettings, LiveTelemetry } from "./SimulationCanvas";

interface LiveDynamicSimulationProps {
  simulation?: PhysicsSimulationData | null;
  graphics: GraphicsSettings;
  isPlaying: boolean;
  speedMultiplier: number;
  resetSignal: number;
  onTelemetry: (t: LiveTelemetry) => void;
  onObjectPos: (p: THREE.Vector3) => void;
}

interface SimulatedBody {
  id: string;
  name: string;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  acc: THREE.Vector3;
  mass: number;
  charge: number;
  radius: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  geometry: string;
  dimensions?: number[];
  showTrail: boolean;
  trailColor: string;
  fixed: boolean;
  label?: string;
  physicsRole?: string;
  trail: THREE.Vector3[];
}

interface VortexParticle {
  pos: THREE.Vector3;
  theta: number;
  radius: number;
  z: number;
  speed: number;
}

export function LiveDynamicSimulation({
  simulation,
  graphics,
  isPlaying,
  speedMultiplier,
  resetSignal,
  onTelemetry,
  onObjectPos,
}: LiveDynamicSimulationProps) {
  const dynamicDef = simulation?.dynamicDefinition;
  const params = simulation?.parameters || {};

  const bodiesRef = useRef<SimulatedBody[]>([]);
  const vortexParticlesRef = useRef<VortexParticle[]>([]);
  const simTimeRef = useRef(0);
  const waveMeshRef = useRef<THREE.Mesh>(null);
  const frameCountRef = useRef(0);

  // Initialize and Reset Physics State
  const initSimulation = () => {
    simTimeRef.current = 0;
    if (!dynamicDef) return;

    const engineType = dynamicDef.physics?.engineType || 'kinematic';

    // 1. Initialize Bodies from Entities
    const bodies: SimulatedBody[] = [];
    const entities = dynamicDef.entities || [];

    for (const ent of entities) {
      const p = ent.position || [0, 0, 0];
      const v = ent.velocity || [0, 0, 0];

      // Dynamic parameter overrides if available
      let vx = v[0];
      let vy = v[1];
      let vz = v[2];
      let mass = ent.mass ?? 1.0;

      if (ent.id === 'planet_gamma' && typeof params.planetSpeed === 'number') {
        vx = -params.planetSpeed;
      }
      if (ent.id === 'star_alpha' && typeof params.mass1 === 'number') {
        mass = params.mass1;
      }
      if (ent.id === 'star_beta' && typeof params.mass2 === 'number') {
        mass = params.mass2;
      }
      if (ent.id === 'ion_positive' && typeof params.initialVelocityX === 'number') {
        vx = params.initialVelocityX;
      }
      if (ent.id === 'ion_positive' && typeof params.charge === 'number') {
        ent.charge = params.charge;
      }

      bodies.push({
        id: ent.id,
        name: ent.name,
        pos: new THREE.Vector3(p[0], p[1], p[2]),
        vel: new THREE.Vector3(vx, vy, vz),
        acc: new THREE.Vector3(0, 0, 0),
        mass,
        charge: ent.charge ?? 1.0,
        radius: ent.radius ?? 0.8,
        color: ent.color || '#3B82F6',
        emissive: ent.emissive || ent.color || '#1D4ED8',
        emissiveIntensity: ent.emissiveIntensity ?? 0.6,
        geometry: ent.geometry || 'sphere',
        dimensions: ent.dimensions,
        showTrail: ent.showTrail ?? true,
        trailColor: ent.trailColor || ent.color || '#3B82F6',
        fixed: ent.fixed ?? false,
        label: ent.label,
        physicsRole: ent.physicsRole,
        trail: [new THREE.Vector3(p[0], p[1], p[2])],
      });
    }

    bodiesRef.current = bodies;

    // 2. Initialize Fluid Vortex Particles if applicable
    if (engineType === 'fluid_vortex' || engineType === 'particle_flow') {
      const count = dynamicDef.physics?.particleCount || 60;
      const vParticles: VortexParticle[] = [];
      for (let i = 0; i < count; i++) {
        const radius = 0.8 + Math.random() * 6.5;
        const theta = Math.random() * Math.PI * 2;
        const z = (Math.random() - 0.5) * 8;
        vParticles.push({
          pos: new THREE.Vector3(
            Math.cos(theta) * radius,
            z,
            Math.sin(theta) * radius
          ),
          theta,
          radius,
          z,
          speed: 1.0 + Math.random() * 0.5,
        });
      }
      vortexParticlesRef.current = vParticles;
    }
  };

  useEffect(() => {
    initSimulation();
  }, [resetSignal, dynamicDef]);

  // Main 60FPS Physics Engine Loop
  useFrame((_, delta) => {
    if (!dynamicDef) return;

    const dt = isPlaying ? Math.min(delta, 0.05) * speedMultiplier : 0;
    if (dt > 0) {
      simTimeRef.current += dt;
    }

    const engineType = dynamicDef.physics?.engineType || 'kinematic';
    const G = params.gravitationalConstant ?? dynamicDef.physics?.gravitationalConstant ?? 10.0;
    const Ez = params.electricFieldY ?? dynamicDef.physics?.electricField?.[1] ?? 0;
    const Bz = params.magneticFieldZ ?? dynamicDef.physics?.magneticField?.[2] ?? 3.5;

    const bodies = bodiesRef.current;

    if (dt > 0 && bodies.length > 0) {
      // 1. N-BODY GRAVITATIONAL PHYSICS INTEGRATOR
      if (engineType === 'nbody_gravity') {
        const softening = 0.5; // Softening parameter to prevent numerical singularities

        // Reset accelerations
        for (let i = 0; i < bodies.length; i++) {
          bodies[i].acc.set(0, 0, 0);
        }

        // Pairwise mutual gravity forces: F = G * m1 * m2 / (r^2 + eps^2)
        for (let i = 0; i < bodies.length; i++) {
          for (let j = i + 1; j < bodies.length; j++) {
            const b1 = bodies[i];
            const b2 = bodies[j];
            const diff = new THREE.Vector3().subVectors(b2.pos, b1.pos);
            const distSq = diff.lengthSq() + softening * softening;
            const dist = Math.sqrt(distSq);
            const forceMag = (G * b1.mass * b2.mass) / distSq;
            const forceDir = diff.clone().normalize();

            if (!b1.fixed) {
              const a1 = forceDir.clone().multiplyScalar(forceMag / b1.mass);
              b1.acc.add(a1);
            }
            if (!b2.fixed) {
              const a2 = forceDir.clone().multiplyScalar(-forceMag / b2.mass);
              b2.acc.add(a2);
            }
          }
        }

        // Integrate positions and velocities (Velocity Verlet / Euler)
        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i];
          if (!b.fixed) {
            b.vel.addScaledVector(b.acc, dt);
            b.pos.addScaledVector(b.vel, dt);
          }

          // Update motion trail
          frameCountRef.current++;
          if (frameCountRef.current % 3 === 0 && b.showTrail) {
            b.trail.push(b.pos.clone());
            if (b.trail.length > graphics.trailLength) {
              b.trail.shift();
            }
          }
        }
      }

      // 2. LORENTZ ELECTROMAGNETIC FORCE INTEGRATOR: F = q (E + v x B)
      else if (engineType === 'lorentz_em') {
        const Bvec = new THREE.Vector3(0, 0, Bz);
        const Evec = new THREE.Vector3(0, Ez, 0);

        for (const b of bodies) {
          if (b.physicsRole === 'body' && !b.fixed) {
            // Magnetic force: F_mag = q * (v x B)
            const vCrossB = new THREE.Vector3().crossVectors(b.vel, Bvec);
            const F_mag = vCrossB.multiplyScalar(b.charge);

            // Electric force: F_elec = q * E
            const F_elec = Evec.clone().multiplyScalar(b.charge);

            // Net force & acceleration: a = (F_elec + F_mag) / m
            const F_net = new THREE.Vector3().addVectors(F_elec, F_mag);
            b.acc.copy(F_net.divideScalar(b.mass));

            b.vel.addScaledVector(b.acc, dt);
            b.pos.addScaledVector(b.vel, dt);

            // Wrap boundaries so particle stays in viewable region
            if (b.pos.z > 14) {
              b.pos.z = -14;
              b.trail = [b.pos.clone()];
            }

            if (b.showTrail && frameCountRef.current % 2 === 0) {
              b.trail.push(b.pos.clone());
              if (b.trail.length > graphics.trailLength) {
                b.trail.shift();
              }
            }
          }
        }
      }

      // 3. FLUID VORTEX ADVECTION INTEGRATOR
      else if (engineType === 'fluid_vortex') {
        const circulation = params.vortexCirculation ?? 8.0;
        const coreRadius = params.coreRadius ?? 1.5;
        const axialSpeed = params.axialSpeed ?? 1.2;

        for (const vp of vortexParticlesRef.current) {
          // Rankine vortex tangential velocity profile
          let vTheta = 0;
          if (vp.radius <= coreRadius) {
            vTheta = (circulation * vp.radius) / (2 * Math.PI * coreRadius * coreRadius);
          } else {
            vTheta = circulation / (2 * Math.PI * vp.radius);
          }

          // Advance angle and axial position
          vp.theta += (vTheta / vp.radius) * dt;
          vp.z += axialSpeed * dt;

          if (vp.z > 5) {
            vp.z = -5;
          }

          vp.pos.set(
            Math.cos(vp.theta) * vp.radius,
            vp.z,
            Math.sin(vp.theta) * vp.radius
          );
        }
      }

      // 4. GENERAL KINEMATIC & OSCILLATOR INTEGRATOR
      else {
        const gravity = dynamicDef.physics?.gravity || [0, 0, 0];
        const gVec = new THREE.Vector3(gravity[0], gravity[1], gravity[2]);

        for (const b of bodies) {
          if (!b.fixed) {
            b.acc.copy(gVec);
            b.vel.addScaledVector(b.acc, dt);
            b.pos.addScaledVector(b.vel, dt);

            // Floor bounce
            if (b.pos.y - b.radius < 0) {
              b.pos.y = b.radius;
              b.vel.y = -b.vel.y * 0.85;
            }

            if (b.showTrail && frameCountRef.current % 2 === 0) {
              b.trail.push(b.pos.clone());
              if (b.trail.length > graphics.trailLength) {
                b.trail.shift();
              }
            }
          }
        }
      }
    }

    // Dynamic Wave Surface Animation
    if (engineType === 'wave_equation' && waveMeshRef.current) {
      const geom = waveMeshRef.current.geometry as THREE.PlaneGeometry;
      const posAttr = geom.attributes.position;
      const wavelength = params.waveWavelength ?? 3.5;
      const waveSpeed = params.waveSpeed ?? 3.0;
      const waveAmp = params.waveAmplitude ?? 1.2;
      const k = (2 * Math.PI) / wavelength;
      const omega = k * waveSpeed;
      const t = simTimeRef.current;

      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const r = Math.sqrt(x * x + y * y);
        const z = waveAmp * Math.sin(k * r - omega * t) * Math.exp(-r * 0.08);
        posAttr.setZ(i, z);
      }
      posAttr.needsUpdate = true;
      geom.computeVertexNormals();
    }

    // Primary object position for camera tracking
    const focusBody = bodies.find((b) => !b.fixed) || bodies[0];
    if (focusBody) {
      onObjectPos(focusBody.pos);
    }

    // Telemetry Calculation
    let totalKineticEnergy = 0;
    let totalPotentialEnergy = 0;
    let mainSpeed = 0;

    for (const b of bodies) {
      const spd = b.vel.length();
      totalKineticEnergy += 0.5 * b.mass * spd * spd;
      if (b.id === 'planet_gamma' || b.id === 'ion_positive' || (!b.fixed && mainSpeed === 0)) {
        mainSpeed = spd;
      }
    }

    if (engineType === 'nbody_gravity') {
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const dist = bodies[i].pos.distanceTo(bodies[j].pos) + 0.5;
          totalPotentialEnergy -= (G * bodies[i].mass * bodies[j].mass) / dist;
        }
      }
    }

    const totalEnergy = totalKineticEnergy + totalPotentialEnergy;

    onTelemetry({
      time: simTimeRef.current,
      speed: mainSpeed,
      kineticEnergy: totalKineticEnergy,
      potentialEnergy: totalPotentialEnergy,
      totalEnergy,
      posX: focusBody?.pos.x ?? 0,
      posY: focusBody?.pos.y ?? 0,
      posZ: focusBody?.pos.z ?? 0,
      customLabel:
        engineType === 'lorentz_em'
          ? 'Cyclotron Gyro-Radius'
          : engineType === 'fluid_vortex'
          ? 'Circulation'
          : 'Total Hamiltonian Energy',
      customValue:
        engineType === 'lorentz_em'
          ? `${((focusBody?.mass ?? 1) * mainSpeed / (Math.abs(focusBody?.charge ?? 1) * Bz + 0.01)).toFixed(2)} m`
          : engineType === 'fluid_vortex'
          ? `${(params.vortexCirculation ?? 8).toFixed(1)} m²/s`
          : `${totalEnergy.toFixed(2)} J`,
    });
  });

  const bodies = bodiesRef.current;
  const engineType = dynamicDef?.physics?.engineType || 'kinematic';

  return (
    <group>
      {/* 1. Dynamic Entities (Spheres, Boxes, Cylinders, Rings, Toruses) */}
      {bodies
        .filter(
          (b) =>
            b.geometry !== "wave_surface" &&
            b.geometry !== "field_grid" &&
            b.geometry !== "particle_cloud"
        )
        .map((b) => {
          const clampedRadius = Math.min(Math.max(b.radius || 0.6, 0.2), 3.0);
          return (
            <group key={b.id} position={b.pos}>
              {b.geometry === "sphere" ? (
                <mesh castShadow receiveShadow>
                  <sphereGeometry args={[clampedRadius, 32, 32]} />
                  <meshStandardMaterial
                    color={b.color}
                    emissive={b.emissive}
                    emissiveIntensity={b.emissiveIntensity}
                    roughness={0.2}
                    metalness={0.4}
                  />
                </mesh>
              ) : b.geometry === "box" ? (
                <mesh castShadow receiveShadow>
                  <boxGeometry
                    args={[
                      b.dimensions?.[0] ?? clampedRadius * 2,
                      b.dimensions?.[1] ?? clampedRadius * 2,
                      b.dimensions?.[2] ?? clampedRadius * 2,
                    ]}
                  />
                  <meshStandardMaterial
                    color={b.color}
                    emissive={b.emissive}
                    emissiveIntensity={b.emissiveIntensity}
                    roughness={0.3}
                  />
                </mesh>
              ) : b.geometry === "cylinder" ? (
                <mesh castShadow receiveShadow>
                  <cylinderGeometry
                    args={[
                      b.dimensions?.[0] ?? clampedRadius,
                      b.dimensions?.[0] ?? clampedRadius,
                      b.dimensions?.[1] ?? 6,
                      32,
                    ]}
                  />
                  <meshStandardMaterial
                    color={b.color}
                    emissive={b.emissive}
                    emissiveIntensity={b.emissiveIntensity}
                    roughness={0.3}
                    transparent
                    opacity={0.7}
                  />
                </mesh>
              ) : b.geometry === "torus" ? (
                <mesh castShadow receiveShadow>
                  <torusGeometry
                    args={[clampedRadius * 2, clampedRadius * 0.3, 16, 64]}
                  />
                  <meshStandardMaterial
                    color={b.color}
                    emissive={b.emissive}
                    emissiveIntensity={b.emissiveIntensity}
                  />
                </mesh>
              ) : (
                <mesh castShadow receiveShadow>
                  <sphereGeometry args={[clampedRadius, 24, 24]} />
                  <meshStandardMaterial
                    color={b.color}
                    emissive={b.emissive}
                    emissiveIntensity={b.emissiveIntensity}
                  />
                </mesh>
              )}

              {/* Velocity Vector Arrow */}
              {graphics.showAxes && !b.fixed && b.vel.length() > 0.1 && (
                <Line
                  points={[
                    [0, 0, 0],
                    [b.vel.x * 0.8, b.vel.y * 0.8, b.vel.z * 0.8],
                  ]}
                  color="#FBBF24"
                  lineWidth={2}
                />
              )}

              {/* Interactive Floating 3D Label */}
              {graphics.showLabels && (b.label || b.name) && (
                <Html
                  position={[0, clampedRadius + 0.6, 0]}
                  center
                  distanceFactor={18}
                  style={{ pointerEvents: "none" }}
                >
                  <div className="rounded border border-border/80 bg-background/90 px-2 py-0.5 font-mono text-[10px] font-medium text-foreground shadow-md backdrop-blur-sm whitespace-nowrap">
                    {b.label || b.name}
                  </div>
                </Html>
              )}
            </group>
          );
        })}

      {/* 2. Motion Trails */}
      {graphics.showTrail &&
        bodies.map(
          (b) =>
            b.showTrail &&
            b.trail.length > 1 && (
              <Line
                key={`trail_${b.id}`}
                points={b.trail.map((p) => [p.x, p.y, p.z])}
                color={b.trailColor}
                lineWidth={2}
                transparent
                opacity={0.8}
              />
            )
        )}

      {/* 3. Fluid Vortex Swirling Tracer Particles */}
      {engineType === 'fluid_vortex' && (
        <group>
          {vortexParticlesRef.current.map((vp, idx) => (
            <mesh key={`vp_${idx}`} position={vp.pos}>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshStandardMaterial
                color="#38BDF8"
                emissive="#0284C7"
                emissiveIntensity={0.8}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* 4. Dynamic Wave Equation Surface */}
      {engineType === 'wave_equation' && (
        <mesh
          ref={waveMeshRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.5, 0]}
          receiveShadow
        >
          <planeGeometry args={[18, 18, 64, 64]} />
          <meshStandardMaterial
            color="#8B5CF6"
            emissive="#4C1D95"
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.3}
            wireframe={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 5. Magnetic Field B-Vector Grid */}
      {engineType === 'lorentz_em' && (
        <group position={[0, 0, 0]}>
          {[-6, -2, 2, 6].map((x) =>
            [-6, -2, 2, 6].map((y) => (
              <group key={`bline_${x}_${y}`} position={[x, y, 0]}>
                <Line
                  points={[
                    [0, 0, -12],
                    [0, 0, 12],
                  ]}
                  color="#6366F1"
                  lineWidth={1}
                  transparent
                  opacity={0.3}
                />
              </group>
            ))
          )}
        </group>
      )}
    </group>
  );
}
