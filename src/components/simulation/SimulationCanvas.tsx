import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Grid,
  Html,
  Line,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  Activity,
  Camera,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";

import type { PhysicsSimulationData } from "../../lib/api";

export type ViewMode = "orbit" | "pan" | "zoom";

export interface GraphicsSettings {
  cameraMode: "free" | "follow";
  showTrail: boolean;
  trailLength: number;
  showGrid: boolean;
  showAxes: boolean;
  showLabels: boolean;
  showShadows: boolean;
}

export interface LiveTelemetry {
  time: number;
  speed: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  posX: number;
  posY: number;
  posZ: number;
  customLabel?: string;
  customValue?: string;
}

const DEG = Math.PI / 180;

// ==========================================
// 3D AXES COMPONENT
// ==========================================
function CoordinateAxes({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const axisLen = 14;
  return (
    <group position={[0, 0, 0]}>
      {/* X Axis */}
      <Line
        points={[
          [0, 0, 0],
          [axisLen, 0, 0],
        ]}
        color="#812834"
        lineWidth={1.5}
      />
      {/* Y Axis */}
      <Line
        points={[
          [0, 0, 0],
          [0, axisLen, 0],
        ]}
        color="#2E7D32"
        lineWidth={1.5}
      />
      {/* Z Axis */}
      <Line
        points={[
          [0, 0, 0],
          [0, 0, axisLen],
        ]}
        color="#1565C0"
        lineWidth={1.5}
      />
    </group>
  );
}

// ==========================================
// CAMERA CONTROLLER
// ==========================================
function CameraController({
  cameraMode,
  objectPos,
  controlsRef,
}: {
  cameraMode: "free" | "follow";
  objectPos: THREE.Vector3;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  useFrame(({ camera }) => {
    if (cameraMode === "follow" && controlsRef.current) {
      controlsRef.current.target.lerp(objectPos, 0.08);
      controlsRef.current.update();
    }
  });
  return null;
}

// =========================================================================
// 1. PARTICLE DRIFT (DRUDE MODEL / ELECTRON MOTION IN WIRE)
// =========================================================================
interface ElectronParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  baseThermalSpeed: number;
}

function LiveParticleDrift({
  simulation,
  graphics,
  isPlaying,
  speedMultiplier,
  resetSignal,
  onTelemetry,
  onObjectPos,
}: {
  simulation: PhysicsSimulationData | null;
  graphics: GraphicsSettings;
  isPlaying: boolean;
  speedMultiplier: number;
  resetSignal: number;
  onTelemetry: (t: LiveTelemetry) => void;
  onObjectPos: (pos: THREE.Vector3) => void;
}) {
  const params = simulation?.parameters || {};
  const electricField = (params.electricField as number) || 100; // V/m
  const particleCount = Math.min(100, (params.particleCount as number) || 50);
  const wireRadius = (params.wireRadius as number) || 1.4;
  const wireLength = (params.wireLength as number) || 16;
  const halfLen = wireLength / 2;

  // Drift velocity visual scaling
  const driftSpeed = Math.min(4.0, (electricField / 100) * 1.5);

  const timeRef = useRef(0);
  const electronsRef = useRef<ElectronParticle[]>([]);
  const meshGroupRef = useRef<THREE.Group>(null);
  const centroidRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // 3D Fixed Ion Lattice Nodes inside the wire
  const latticeNodes = useMemo(() => {
    const nodes: THREE.Vector3[] = [];
    const xSpacing = 2.0;
    const countX = Math.floor(wireLength / xSpacing);
    const startX = -halfLen + 1.0;

    for (let ix = 0; ix < countX; ix++) {
      const x = startX + ix * xSpacing;
      // 3-ring arrangement around center axis
      nodes.push(new THREE.Vector3(x, 0, 0));
      nodes.push(new THREE.Vector3(x, 0.65, 0.4));
      nodes.push(new THREE.Vector3(x, -0.65, -0.4));
      nodes.push(new THREE.Vector3(x, -0.4, 0.65));
      nodes.push(new THREE.Vector3(x, 0.4, -0.65));
    }
    return nodes;
  }, [wireLength, halfLen]);

  // Initialize electrons with random thermal velocities
  useEffect(() => {
    timeRef.current = 0;
    const arr: ElectronParticle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const r = Math.sqrt(Math.random()) * (wireRadius - 0.2);
      const theta = Math.random() * Math.PI * 2;
      const x = -halfLen + Math.random() * wireLength;
      const y = r * Math.sin(theta);
      const z = r * Math.cos(theta);

      // Random thermal velocity vector (fast isotropic jitter)
      const thermalDir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
      const thermalSpeed = 5.0 + Math.random() * 3.0;

      arr.push({
        pos: new THREE.Vector3(x, y, z),
        vel: thermalDir.multiplyScalar(thermalSpeed),
        baseThermalSpeed: thermalSpeed,
      });
    }
    electronsRef.current = arr;
  }, [resetSignal, simulation, particleCount, wireLength, wireRadius, halfLen]);

  // Frame update: thermal jitter + drift along electric field + lattice collisions
  useFrame((_, delta) => {
    if (isPlaying) {
      timeRef.current += delta * speedMultiplier;
    }
    const dt = delta * speedMultiplier;
    const electrons = electronsRef.current;
    if (electrons.length === 0) return;

    let avgX = 0;
    let avgY = 0;
    let avgZ = 0;

    const collisionRadiusSq = 0.35 * 0.35;

    for (let i = 0; i < electrons.length; i++) {
      const el = electrons[i];

      if (isPlaying) {
        // 1. Move electron by thermal velocity + net drift velocity (along +X in wire)
        el.pos.x += (el.vel.x + driftSpeed) * dt;
        el.pos.y += el.vel.y * dt;
        el.pos.z += el.vel.z * dt;

        // 2. Wire tube cylindrical boundary reflection
        const radialDist = Math.sqrt(el.pos.y * el.pos.y + el.pos.z * el.pos.z);
        if (radialDist > wireRadius - 0.15) {
          // Reflect velocity inward
          const ny = el.pos.y / radialDist;
          const nz = el.pos.z / radialDist;
          const dot = el.vel.y * ny + el.vel.z * nz;
          el.vel.y -= 2 * dot * ny;
          el.vel.z -= 2 * dot * nz;
          el.pos.y = ny * (wireRadius - 0.16);
          el.pos.z = nz * (wireRadius - 0.16);
        }

        // 3. Periodic boundary along wire length (wrap around left/right)
        if (el.pos.x > halfLen) {
          el.pos.x = -halfLen + (el.pos.x - halfLen);
        } else if (el.pos.x < -halfLen) {
          el.pos.x = halfLen - (-halfLen - el.pos.x);
        }

        // 4. Lattice scattering collisions (randomize thermal direction upon collision with ion)
        for (let k = 0; k < latticeNodes.length; k++) {
          const node = latticeNodes[k];
          const dx = el.pos.x - node.x;
          const dy = el.pos.y - node.y;
          const dz = el.pos.z - node.z;
          if (dx * dx + dy * dy + dz * dz < collisionRadiusSq) {
            // Elastic scattering with random reorientation
            const newDir = new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2
            ).normalize();
            el.vel.copy(newDir.multiplyScalar(el.baseThermalSpeed));
            break;
          }
        }
      }

      avgX += el.pos.x;
      avgY += el.pos.y;
      avgZ += el.pos.z;
    }

    const n = electrons.length;
    centroidRef.current.set(avgX / n, avgY / n, avgZ / n);
    onObjectPos(centroidRef.current);

    onTelemetry({
      time: timeRef.current,
      speed: driftSpeed,
      kineticEnergy: 0.5 * 9.1e-31 * (driftSpeed ** 2),
      potentialEnergy: electricField,
      totalEnergy: 0.5 * 9.1e-31 * (driftSpeed ** 2),
      posX: centroidRef.current.x,
      posY: centroidRef.current.y,
      posZ: centroidRef.current.z,
      customLabel: "v_drift",
      customValue: `${(driftSpeed * 0.35).toFixed(2)} mm/s`,
    });
  });

  return (
    <group position={[0, 2.5, 0]}>
      {/* 3D Wire / Conductor Body: Transparent horizontal cylinder */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
        <cylinderGeometry args={[wireRadius, wireRadius, wireLength, 32, 1, true]} />
        <meshPhysicalMaterial
          color="#94A3B8"
          transparent
          opacity={0.22}
          roughness={0.15}
          transmission={0.6}
          thickness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wire End Terminal Caps (Anode & Cathode Collars) */}
      <mesh position={[-halfLen, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[wireRadius, 0.08, 16, 32]} />
        <meshStandardMaterial color="#812834" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[halfLen, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[wireRadius, 0.08, 16, 32]} />
        <meshStandardMaterial color="#2E7D32" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* 3D Electric Field Vector Arrow Indicator */}
      <group position={[0, wireRadius + 1.2, 0]}>
        <Line
          points={[
            [-4, 0, 0],
            [4, 0, 0],
          ]}
          color="#812834"
          lineWidth={2.5}
        />
        <mesh position={[4.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.3, 0.6, 16]} />
          <meshStandardMaterial color="#812834" />
        </mesh>
        {graphics.showLabels && (
          <Html position={[0, 0.5, 0]} center>
            <div className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-[#812834]/30 bg-background/90 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#812834] shadow-md backdrop-blur-xs">
              <span>Applied Electric Field (E = {electricField} V/m)</span>
            </div>
          </Html>
        )}
      </group>

      {/* Fixed Metal Ions Lattice (Copper / Lattice Nodes) */}
      <group>
        {latticeNodes.map((node, i) => (
          <mesh key={i} position={[node.x, node.y, node.z]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial
              color="#C87D55"
              metalness={0.85}
              roughness={0.25}
            />
          </mesh>
        ))}
      </group>

      {/* Free Conduction Electrons (Rendered live via ref) */}
      <ElectronsMesh electronsRef={electronsRef} />

      {/* Floating 3D Stat Badges */}
      {graphics.showLabels && (
        <>
          <Html position={[-halfLen + 1.5, wireRadius + 0.5, 0]} center>
            <div className="whitespace-nowrap rounded border border-border/80 bg-background/90 px-2 py-0.5 font-mono text-[10px] text-muted-foreground shadow-xs">
              Cathode (-)
            </div>
          </Html>
          <Html position={[halfLen - 1.5, wireRadius + 0.5, 0]} center>
            <div className="whitespace-nowrap rounded border border-border/80 bg-background/90 px-2 py-0.5 font-mono text-[10px] text-muted-foreground shadow-xs">
              Anode (+)
            </div>
          </Html>
          <Html position={[0, -wireRadius - 0.8, 0]} center>
            <div className="whitespace-nowrap rounded-md border border-primary/20 bg-background/95 px-3 py-1 font-mono text-[11px] font-medium text-foreground shadow-md">
              Drude Transport: J = σE = ne·v_d
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

function ElectronsMesh({
  electronsRef,
}: {
  electronsRef: React.RefObject<ElectronParticle[]>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [dummy] = useState(() => new THREE.Object3D());

  useFrame(() => {
    if (!groupRef.current) return;
    const electrons = electronsRef.current;
    const instancedMesh = groupRef.current.children[0] as THREE.InstancedMesh;
    if (instancedMesh && electrons) {
      for (let i = 0; i < electrons.length; i++) {
        dummy.position.copy(electrons[i].pos);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      <instancedMesh
        args={[undefined as any, undefined as any, 100]}
        count={electronsRef.current.length || 50}
      >
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial
          color="#0284C7"
          emissive="#38BDF8"
          emissiveIntensity={0.9}
          roughness={0.2}
        />
      </instancedMesh>
    </group>
  );
}

// =========================================================================
// 2. 2-BODY COLLISION SIMULATION (MOMENTUM & RESTITUTION)
// =========================================================================
function LiveCollision({
  simulation,
  graphics,
  isPlaying,
  speedMultiplier,
  resetSignal,
  onTelemetry,
  onObjectPos,
}: {
  simulation: PhysicsSimulationData | null;
  graphics: GraphicsSettings;
  isPlaying: boolean;
  speedMultiplier: number;
  resetSignal: number;
  onTelemetry: (t: LiveTelemetry) => void;
  onObjectPos: (pos: THREE.Vector3) => void;
}) {
  const params = simulation?.parameters || {};
  const m1 = (params.mass1 as number) || 2.0;
  const m2 = (params.mass2 as number) || 1.0;
  const v1Init = (params.velocity1 as number) || 4.0;
  const v2Init = (params.velocity2 as number) || -3.0;
  const elasticity =
    params.elasticity !== undefined
      ? Math.max(0, Math.min(1, params.elasticity as number))
      : 1.0;

  // Post collision velocities
  const totalM = m1 + m2;
  const v1Final = (m1 * v1Init + m2 * v2Init + m2 * elasticity * (v2Init - v1Init)) / totalM;
  const v2Final = (m1 * v1Init + m2 * v2Init + m1 * elasticity * (v1Init - v2Init)) / totalM;

  const r1 = Math.max(0.4, Math.min(1.0, 0.4 + m1 * 0.15));
  const r2 = Math.max(0.4, Math.min(1.0, 0.4 + m2 * 0.15));

  const timeRef = useRef(0);
  const mesh1Ref = useRef<THREE.Mesh>(null);
  const mesh2Ref = useRef<THREE.Mesh>(null);

  const initialDistance = 10;
  const relativeVelocity = v1Init - v2Init;
  const collisionTime = relativeVelocity > 0 ? (initialDistance - (r1 + r2)) / relativeVelocity : 1.5;
  const cycleDuration = collisionTime * 2.5;

  useEffect(() => {
    timeRef.current = 0;
  }, [resetSignal, simulation]);

  useFrame((_, delta) => {
    if (isPlaying) {
      timeRef.current += delta * speedMultiplier;
    }
    const t = timeRef.current % cycleDuration;

    let x1: number, x2: number, curV1: number, curV2: number;

    if (t <= collisionTime) {
      x1 = -initialDistance / 2 + v1Init * t;
      x2 = initialDistance / 2 + v2Init * t;
      curV1 = v1Init;
      curV2 = v2Init;
    } else {
      const dtPost = t - collisionTime;
      const collisionContactPoint = -initialDistance / 2 + v1Init * collisionTime;
      x1 = collisionContactPoint + v1Final * dtPost;
      x2 = collisionContactPoint + (r1 + r2) + v2Final * dtPost;
      curV1 = v1Final;
      curV2 = v2Final;
    }

    if (mesh1Ref.current) mesh1Ref.current.position.x = x1;
    if (mesh2Ref.current) mesh2Ref.current.position.x = x2;

    const midPos = new THREE.Vector3((x1 + x2) / 2, 1.0, 0);
    onObjectPos(midPos);

    const ek = 0.5 * m1 * (curV1 ** 2) + 0.5 * m2 * (curV2 ** 2);
    const momentum = m1 * curV1 + m2 * curV2;

    onTelemetry({
      time: t,
      speed: Math.abs(curV1),
      kineticEnergy: ek,
      potentialEnergy: 0,
      totalEnergy: ek,
      posX: x1,
      posY: 1.0,
      posZ: 0,
      customLabel: "p_total",
      customValue: `${momentum.toFixed(2)} kg·m/s`,
    });
  });

  return (
    <group position={[0, 0.5, 0]}>
      {/* 3D Track Rail */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[20, 0.2, 1.6]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Sphere 1 (Mass 1) */}
      <mesh ref={mesh1Ref} position={[-4, r1, 0]} castShadow>
        <sphereGeometry args={[r1, 32, 32]} />
        <meshStandardMaterial color="#812834" metalness={0.6} roughness={0.3} />
        {graphics.showLabels && (
          <Html position={[0, r1 + 0.6, 0]} center>
            <div className="rounded border border-[#812834]/30 bg-background/90 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#812834] shadow-xs">
              m₁ = {m1}kg
            </div>
          </Html>
        )}
      </mesh>

      {/* Sphere 2 (Mass 2) */}
      <mesh ref={mesh2Ref} position={[4, r2, 0]} castShadow>
        <sphereGeometry args={[r2, 32, 32]} />
        <meshStandardMaterial color="#2E7D32" metalness={0.6} roughness={0.3} />
        {graphics.showLabels && (
          <Html position={[0, r2 + 0.6, 0]} center>
            <div className="rounded border border-[#2E7D32]/30 bg-background/90 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#2E7D32] shadow-xs">
              m₂ = {m2}kg
            </div>
          </Html>
        )}
      </mesh>
    </group>
  );
}

function getWavelengthHex(nm: number): string {
  if (nm < 420) return "#7c3aed";
  if (nm < 450) return "#8b5cf6";
  if (nm < 485) return "#3b82f6";
  if (nm < 515) return "#06b6d4";
  if (nm < 560) return "#10b981";
  if (nm < 585) return "#eab308";
  if (nm < 620) return "#f97316";
  return "#ef4444";
}

// =========================================================================
// 2.3 YOUNG'S DOUBLE-SLIT EXPERIMENT & WAVE-PARTICLE DUALITY
// =========================================================================
function LiveDoubleSlit({
  simulation,
  graphics,
  isPlaying,
  speedMultiplier,
  resetSignal,
  onTelemetry,
  onObjectPos,
}: {
  simulation: PhysicsSimulationData | null;
  graphics: GraphicsSettings;
  isPlaying: boolean;
  speedMultiplier: number;
  resetSignal: number;
  onTelemetry: (t: LiveTelemetry) => void;
  onObjectPos: (pos: THREE.Vector3) => void;
}) {
  const params = simulation?.parameters || {};
  const lambdaNm = (params.wavelength as number) ?? 532;
  const dMm = (params.slitSeparation as number) ?? 0.25;
  const LM = (params.distanceToScreen as number) ?? 1.2;
  const initialMode = (params.mode as "wave" | "particle") || "wave";

  const [mode, setMode] = useState<"wave" | "particle">(initialMode);
  const [photonHits, setPhotonHits] = useState<{ x: number; y: number; id: number }[]>([]);

  const colorHex = useMemo(() => getWavelengthHex(lambdaNm), [lambdaNm]);
  const fringeSpacingMm = useMemo(() => {
    const dy = (lambdaNm * 1e-3 * LM) / dMm;
    return Number(dy.toFixed(2));
  }, [lambdaNm, dMm, LM]);

  const timeRef = useRef(0);
  const particleTimerRef = useRef(0);

  // Generate dynamic interference fringe texture on canvas for observation screen
  const screenTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const imgData = ctx.createImageData(canvas.width, canvas.height);
      const data = imgData.data;

      // Extract RGB components from hex
      const color = new THREE.Color(colorHex);
      const r = Math.round(color.r * 255);
      const g = Math.round(color.g * 255);
      const b = Math.round(color.b * 255);

      const center = canvas.height / 2;
      const scale = (dMm / (lambdaNm * 1e-3 * LM)) * 14.0; // visual scaling factor

      for (let y = 0; y < canvas.height; y++) {
        const dy = (y - center) / 40.0;
        // Young's double-slit intensity: I = cos^2(pi * d * y / (lambda * L)) * sinc^2(pi * a * y / (lambda * L))
        const phase = dy * scale;
        const cosTerm = Math.cos(phase);
        const sincTerm = dy === 0 ? 1.0 : Math.sin(phase * 0.2) / (phase * 0.2);
        const intensity = Math.max(0, cosTerm * cosTerm * (sincTerm * sincTerm));

        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          data[idx] = Math.round(r * intensity);
          data[idx + 1] = Math.round(g * intensity);
          data[idx + 2] = Math.round(b * intensity);
          data[idx + 3] = Math.round(Math.min(255, 30 + intensity * 225));
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [colorHex, lambdaNm, dMm, LM]);

  useEffect(() => {
    timeRef.current = 0;
    particleTimerRef.current = 0;
    setPhotonHits([]);
  }, [resetSignal, lambdaNm, dMm, LM]);

  // Slit positions in 3D scene (Barrier is at x = -2.5)
  const slit1Pos = useMemo(() => new THREE.Vector3(-2.5, 0.7, 0), []);
  const slit2Pos = useMemo(() => new THREE.Vector3(-2.5, -0.7, 0), []);

  useFrame((_, delta) => {
    if (isPlaying) {
      timeRef.current += delta * speedMultiplier * 3.0;
      particleTimerRef.current += delta * speedMultiplier;

      if (mode === "particle" && particleTimerRef.current > 0.05) {
        particleTimerRef.current = 0;
        // Sample y according to interference probability distribution
        const maxDy = 3.5;
        let sampleY = 0;
        const scale = (dMm / (lambdaNm * 1e-3 * LM)) * 0.35;
        for (let attempt = 0; attempt < 10; attempt++) {
          const testY = (Math.random() - 0.5) * maxDy * 2;
          const prob = Math.pow(Math.cos(testY * scale * Math.PI), 2);
          if (Math.random() < prob) {
            sampleY = testY;
            break;
          }
        }
        setPhotonHits((prev) => [
          ...prev.slice(-180),
          { x: 6.48, y: sampleY, id: Date.now() + Math.random() },
        ]);
      }
    }

    onObjectPos(new THREE.Vector3(6.5, 0, 0));

    onTelemetry({
      time: timeRef.current,
      speed: 299792,
      kineticEnergy: 0,
      potentialEnergy: 0,
      totalEnergy: 0,
      posX: 6.5,
      posY: 0,
      posZ: 0,
      customLabel: "Δy Fringe Spacing",
      customValue: `${fringeSpacingMm} mm`,
    });
  });

  const numRipples = 12;
  const ripples = Array.from({ length: numRipples });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. COHERENT LASER SOURCE (at x = -7.5) */}
      <group position={[-7.5, 0, 0]}>
        <mesh rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.4, 1.6, 24]} />
          <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.8, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.2, 24]} />
          <meshBasicMaterial color={colorHex} />
        </mesh>
        {/* Source Glow */}
        <pointLight position={[0.9, 0, 0]} color={colorHex} intensity={3.0} distance={5} />
      </group>

      {/* Primary Laser Beam to Slits */}
      <Line
        points={[
          [-6.7, 0, 0],
          [-2.5, 0, 0],
        ]}
        color={colorHex}
        lineWidth={5}
      />

      {/* 2. DOUBLE-SLIT BARRIER (at x = -2.5) */}
      <group position={[-2.5, 0, 0]}>
        {/* Upper barrier block */}
        <mesh position={[0, 2.7, 0]}>
          <boxGeometry args={[0.12, 3.4, 3.2]} />
          <meshStandardMaterial color="#0F172A" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Central barrier divider between slits */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.12, 1.1, 3.2]} />
          <meshStandardMaterial color="#0F172A" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Lower barrier block */}
        <mesh position={[0, -2.7, 0]}>
          <boxGeometry args={[0.12, 3.4, 3.2]} />
          <meshStandardMaterial color="#0F172A" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Slit Aperture Glow Highlights */}
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[0.14, 0.25, 0.8]} />
          <meshBasicMaterial color={colorHex} transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, -0.7, 0]}>
          <boxGeometry args={[0.14, 0.25, 0.8]} />
          <meshBasicMaterial color={colorHex} transparent opacity={0.9} />
        </mesh>
      </group>

      {/* 3. EXPANDING COHERENT CIRCULAR WAVEFRONT RIPPLES (Wave Mode) */}
      {mode === "wave" && (
        <group position={[0, 0, 0]}>
          {/* Slit 1 Ripples */}
          {ripples.map((_, i) => {
            const phase = ((timeRef.current * 1.2 + i * (9.0 / numRipples)) % 9.0);
            const radius = Math.max(0.1, phase);
            const opacity = Math.max(0, 1.0 - radius / 9.0) * 0.45;
            return (
              <group key={`s1-${i}`} position={[slit1Pos.x, slit1Pos.y, 0]}>
                <mesh rotation={[0, 0, 0]}>
                  <ringGeometry args={[radius - 0.05, radius + 0.05, 48, 1, -Math.PI / 2, Math.PI]} />
                  <meshBasicMaterial color={colorHex} transparent opacity={opacity} side={THREE.DoubleSide} />
                </mesh>
              </group>
            );
          })}

          {/* Slit 2 Ripples */}
          {ripples.map((_, i) => {
            const phase = ((timeRef.current * 1.2 + i * (9.0 / numRipples)) % 9.0);
            const radius = Math.max(0.1, phase);
            const opacity = Math.max(0, 1.0 - radius / 9.0) * 0.45;
            return (
              <group key={`s2-${i}`} position={[slit2Pos.x, slit2Pos.y, 0]}>
                <mesh rotation={[0, 0, 0]}>
                  <ringGeometry args={[radius - 0.05, radius + 0.05, 48, 1, -Math.PI / 2, Math.PI]} />
                  <meshBasicMaterial color={colorHex} transparent opacity={opacity} side={THREE.DoubleSide} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* 4. QUANTUM SINGLE-PHOTON HITS (Particle Mode) */}
      {mode === "particle" && (
        <group>
          {photonHits.map((hit) => (
            <mesh key={hit.id} position={[hit.x, hit.y, 0]}>
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshBasicMaterial color={colorHex} />
            </mesh>
          ))}
        </group>
      )}

      {/* 5. OBSERVATION SCREEN (at x = 6.5) */}
      <group position={[6.5, 0, 0]}>
        {/* Screen panel */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.15, 8.0, 3.2]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
        </mesh>
        {/* Screen interference fringe texture map */}
        <mesh position={[-0.08, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[3.1, 7.8]} />
          <meshBasicMaterial map={screenTexture} transparent opacity={0.95} />
        </mesh>
      </group>

      {/* 6. 3D FLOATING LABELS & READOUTS */}
      {graphics.showLabels && (
        <>
          {/* Laser Source label */}
          <Html position={[-7.5, 1.2, 0]} center>
            <div className="rounded border border-border bg-background/90 px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-xs">
              Laser Source (λ = {lambdaNm} nm)
            </div>
          </Html>

          {/* Double-slit barrier label */}
          <Html position={[-2.5, 4.4, 0]} center>
            <div className="rounded border border-border bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs">
              Double Slit (d = {dMm} mm)
            </div>
          </Html>

          {/* Observation Screen label */}
          <Html position={[6.5, 4.4, 0]} center>
            <div className="rounded border border-border bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs">
              Observation Screen (L = {LM} m)
            </div>
          </Html>

          {/* Central Maximum m = 0 */}
          <Html position={[6.8, 0, 0]} center>
            <div className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
              m = 0 (Central Peak)
            </div>
          </Html>

          {/* First Order Maxima m = ±1 */}
          <Html position={[6.8, 1.4, 0]} center>
            <div className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              m = +1
            </div>
          </Html>
          <Html position={[6.8, -1.4, 0]} center>
            <div className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              m = -1
            </div>
          </Html>

          {/* Bottom Floating Badge with Mode Toggle & Fringe Equation */}
          <Html position={[2.0, -4.8, 0]} center>
            <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-background/95 px-3.5 py-2 text-xs font-medium text-foreground shadow-md backdrop-blur-sm">
              <div className="font-mono">
                <span className="text-muted-foreground">Fringe Spacing: </span>
                <span className="font-semibold text-primary">Δy = (λ·L)/d = {fringeSpacingMm} mm</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("wave");
                    setPhotonHits([]);
                  }}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    mode === "wave"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Wave Mode
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("particle");
                    setPhotonHits([]);
                  }}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    mode === "particle"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Particle Mode
                </button>
              </div>
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

// =========================================================================
// 2.5 OPTICAL REFRACTION & SNELL'S LAW
// =========================================================================
function LiveRefraction({
  simulation,
  graphics,
  isPlaying,
  speedMultiplier,
  resetSignal,
  onTelemetry,
  onObjectPos,
}: {
  simulation: PhysicsSimulationData | null;
  graphics: GraphicsSettings;
  isPlaying: boolean;
  speedMultiplier: number;
  resetSignal: number;
  onTelemetry: (t: LiveTelemetry) => void;
  onObjectPos: (pos: THREE.Vector3) => void;
}) {
  const params = simulation?.parameters || {};
  const results = simulation?.results || {};

  const theta1Deg = (params.incidentAngle as number) ?? 45;
  const n1 = (params.n1 as number) ?? 1.0;
  const n2 = (params.n2 as number) ?? 1.5;
  const medium1Name = (params.medium1Name as string) || "Air";
  const medium2Name = (params.medium2Name as string) || "Glass";

  const theta1Rad = (theta1Deg * Math.PI) / 180;
  const sinTheta2 = (n1 * Math.sin(theta1Rad)) / n2;
  const isTIR = sinTheta2 > 1.0;
  const theta2Deg = isTIR
    ? null
    : Number(((Math.asin(sinTheta2) * 180) / Math.PI).toFixed(1));
  const theta2Rad = theta2Deg !== null ? (theta2Deg * Math.PI) / 180 : 0;

  const rayLen = 7.0;

  const incStart = useMemo(
    () =>
      new THREE.Vector3(
        -rayLen * Math.sin(theta1Rad),
        rayLen * Math.cos(theta1Rad),
        0
      ),
    [theta1Rad]
  );
  const origin = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  const reflEnd = useMemo(
    () =>
      new THREE.Vector3(
        rayLen * Math.sin(theta1Rad),
        rayLen * Math.cos(theta1Rad),
        0
      ),
    [theta1Rad]
  );

  const refrEnd = useMemo(
    () =>
      isTIR
        ? null
        : new THREE.Vector3(
            rayLen * Math.sin(theta2Rad),
            -rayLen * Math.cos(theta2Rad),
            0
          ),
    [isTIR, theta2Rad]
  );

  const photonRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    timeRef.current = 0;
  }, [resetSignal, theta1Deg, n1, n2]);

  useFrame((_, delta) => {
    if (isPlaying) {
      timeRef.current += delta * speedMultiplier * 2.0;
    }

    const tCycle = (timeRef.current % 3.0) / 3.0; // 0 to 1
    const photonPos = new THREE.Vector3();

    if (tCycle < 0.5) {
      const subT = tCycle / 0.5;
      photonPos.lerpVectors(incStart, origin, subT);
    } else {
      const subT = (tCycle - 0.5) / 0.5;
      if (isTIR || !refrEnd) {
        photonPos.lerpVectors(origin, reflEnd, subT);
      } else {
        photonPos.lerpVectors(origin, refrEnd, subT);
      }
    }

    if (photonRef.current) {
      photonRef.current.position.copy(photonPos);
    }
    onObjectPos(photonPos);

    onTelemetry({
      time: timeRef.current,
      speed: n2 > 0 ? Number((299792458 / n2 / 1e6).toFixed(1)) : 200,
      kineticEnergy: 0,
      potentialEnergy: 0,
      totalEnergy: 0,
      posX: photonPos.x,
      posY: photonPos.y,
      posZ: photonPos.z,
      customLabel: "θ₂ Refracted",
      customValue: isTIR ? "TIR (100% Reflected)" : `${theta2Deg}°`,
    });
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Medium 1: Upper Space (Air / Vacuum) */}
      <mesh position={[0, 4, -0.5]}>
        <planeGeometry args={[18, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.05} />
      </mesh>

      {/* Medium 2: Lower Space (Glass block / Dense medium) */}
      <mesh position={[0, -4, 0]}>
        <boxGeometry args={[18, 8, 3]} />
        <meshPhysicalMaterial
          color="#06b6d4"
          transparent
          opacity={0.22}
          roughness={0.1}
          metalness={0.1}
          transmission={0.6}
          ior={n2}
        />
      </mesh>

      {/* Boundary Interface Line */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[18, 0.08, 3.2]} />
        <meshStandardMaterial color="#0284c7" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Normal Line (Dashed perpendicular line) */}
      <Line
        points={[
          [0, 6, 0],
          [0, -6, 0],
        ]}
        color="#64748B"
        lineWidth={2}
        dashed
        dashSize={0.3}
        gapSize={0.2}
      />

      {/* Incident Beam Ray */}
      <Line points={[incStart, origin]} color="#22c55e" lineWidth={4} />

      {/* Reflected Beam Ray */}
      <Line
        points={[origin, reflEnd]}
        color="#22c55e"
        lineWidth={isTIR ? 4 : 2}
        transparent
        opacity={isTIR ? 1.0 : (results.reflectance || 0.15)}
      />

      {/* Refracted Beam Ray */}
      {!isTIR && refrEnd && (
        <Line
          points={[origin, refrEnd]}
          color="#10b981"
          lineWidth={4}
          transparent
          opacity={results.transmittance || 0.85}
        />
      )}

      {/* Traveling Photon Pulse */}
      <mesh ref={photonRef} position={incStart}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial
          color="#a7f3d0"
          emissive="#34d399"
          emissiveIntensity={1.8}
        />
        <pointLight color="#34d399" intensity={2.5} distance={3} />
      </mesh>

      {/* 3D Floating Labels */}
      {graphics.showLabels && (
        <>
          {/* Medium 1 Label */}
          <Html position={[-6, 2.5, 0]} center>
            <div className="rounded border border-border bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs">
              Medium 1: {medium1Name} (n₁ = {n1.toFixed(2)})
            </div>
          </Html>

          {/* Medium 2 Label */}
          <Html position={[-6, -2.5, 0]} center>
            <div className="rounded border border-cyan-500/30 bg-background/90 px-2.5 py-1 text-xs font-semibold text-cyan-600 shadow-xs">
              Medium 2: {medium2Name} (n₂ = {n2.toFixed(2)})
            </div>
          </Html>

          {/* Incident Angle θ₁ */}
          <Html
            position={[
              -1.2 * Math.sin(theta1Rad / 2),
              1.6 * Math.cos(theta1Rad / 2),
              0,
            ]}
            center
          >
            <div className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
              θ₁ = {theta1Deg}°
            </div>
          </Html>

          {/* Refracted Angle θ₂ or TIR indicator */}
          {!isTIR && theta2Deg !== null ? (
            <Html
              position={[
                1.4 * Math.sin(theta2Rad / 2),
                -1.8 * Math.cos(theta2Rad / 2),
                0,
              ]}
              center
            >
              <div className="rounded bg-teal-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-teal-700">
                θ₂ = {theta2Deg}°
              </div>
            </Html>
          ) : (
            <Html position={[2.5, 1.5, 0]} center>
              <div className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-700">
                Total Internal Reflection
              </div>
            </Html>
          )}

          {/* Snell's Law equation banner */}
          <Html position={[0, -5.2, 0]} center>
            <div className="whitespace-nowrap rounded-lg border border-border/80 bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
              Snell&apos;s Law: n₁ sin(θ₁) = n₂ sin(θ₂)
              {!isTIR && theta2Deg !== null ? ` → θ₂ = ${theta2Deg}°` : " (TIR)"}
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

// =========================================================================
// 3. PROJECTILE MOTION
// =========================================================================
function LiveProjectile({
  simulation,
  graphics,
  isPlaying,
  speedMultiplier,
  resetSignal,
  onTelemetry,
  onObjectPos,
}: {
  simulation: PhysicsSimulationData | null;
  graphics: GraphicsSettings;
  isPlaying: boolean;
  speedMultiplier: number;
  resetSignal: number;
  onTelemetry: (t: LiveTelemetry) => void;
  onObjectPos: (pos: THREE.Vector3) => void;
}) {
  const params = simulation?.parameters || {};
  const v0 = (params.initialVelocity as number) || 20;
  const angleDeg = (params.angle as number) || 45;
  const g = (params.gravity as number) || 9.81;
  const y0 = (params.initialHeight as number) || 0;

  const theta = angleDeg * DEG;
  const v0x = v0 * Math.cos(theta);
  const v0y = v0 * Math.sin(theta);
  const timeOfFlight = (v0y + Math.sqrt(v0y * v0y + 2 * g * y0)) / g;
  const maxH = y0 + (v0y * v0y) / (2 * g);
  const range = v0x * timeOfFlight;

  const timeRef = useRef(0);
  const trailRef = useRef<THREE.Vector3[]>([]);
  const lineRef = useRef<any>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    timeRef.current = 0;
    trailRef.current = [];
    if (lineRef.current) {
      lineRef.current.geometry.setFromPoints([]);
    }
  }, [resetSignal, simulation]);

  useFrame((_, delta) => {
    if (isPlaying) {
      timeRef.current += delta * speedMultiplier;
    }
    const tCycle = (timeOfFlight + 0.6);
    const t = timeRef.current % tCycle;
    const clampedT = Math.min(t, timeOfFlight);

    const x = v0x * clampedT;
    const y = Math.max(0, y0 + v0y * clampedT - 0.5 * g * clampedT * clampedT);
    const z = 0;

    const vx = v0x;
    const vy = v0y - g * clampedT;
    const speed = Math.sqrt(vx * vx + vy * vy);

    const currentPos = new THREE.Vector3(x, y, z);

    if (meshRef.current) {
      meshRef.current.position.copy(currentPos);
    }
    onObjectPos(currentPos);

    if (graphics.showTrail) {
      if (t <= 0.05) {
        trailRef.current = [currentPos];
      } else {
        const last = trailRef.current[trailRef.current.length - 1];
        if (!last || last.distanceTo(currentPos) > 0.12) {
          trailRef.current.push(currentPos.clone());
          if (trailRef.current.length > graphics.trailLength) {
            trailRef.current.shift();
          }
        }
      }
      if (lineRef.current && trailRef.current.length > 1) {
        lineRef.current.geometry.setFromPoints(trailRef.current);
      }
    }

    const mass = 1.0;
    const ke = 0.5 * mass * speed * speed;
    const pe = mass * g * y;

    onTelemetry({
      time: clampedT,
      speed,
      kineticEnergy: ke,
      potentialEnergy: pe,
      totalEnergy: ke + pe,
      posX: x,
      posY: y,
      posZ: z,
    });
  });

  return (
    <group>
      {/* 3D Cannon Barrel */}
      <group position={[0, y0, 0]} rotation={[0, 0, theta]}>
        <mesh position={[0.7, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.28, 1.4, 16]} />
          <meshStandardMaterial color="#1E293B" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* Trajectory Ribbon Trail */}
      {graphics.showTrail && (
        <line ref={lineRef}>
          <bufferGeometry />
          <lineBasicMaterial color="#812834" linewidth={2.5} />
        </line>
      )}

      {/* Projectile Sphere */}
      <mesh ref={meshRef} position={[0, y0, 0]} castShadow>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color="#812834" metalness={0.4} roughness={0.2} />
      </mesh>

      {/* Static Markers */}
      {graphics.showLabels && (
        <>
          <Html position={[range / 2, maxH + 0.6, 0]} center>
            <div className="rounded-md border border-[#812834]/30 bg-background/90 px-2.5 py-1 font-mono text-xs font-semibold text-[#812834] shadow-md backdrop-blur-xs">
              Max Height: {maxH.toFixed(1)}m
            </div>
          </Html>
          <Html position={[range, 0.5, 0]} center>
            <div className="rounded-md border border-[#812834]/30 bg-background/90 px-2.5 py-1 font-mono text-xs font-semibold text-[#812834] shadow-md backdrop-blur-xs">
              Range: {range.toFixed(1)}m
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

// =========================================================================
// 4. PENDULUM SIMULATION
// =========================================================================
function LivePendulum({
  simulation,
  graphics,
  isPlaying,
  speedMultiplier,
  resetSignal,
  onTelemetry,
  onObjectPos,
}: {
  simulation: PhysicsSimulationData | null;
  graphics: GraphicsSettings;
  isPlaying: boolean;
  speedMultiplier: number;
  resetSignal: number;
  onTelemetry: (t: LiveTelemetry) => void;
  onObjectPos: (pos: THREE.Vector3) => void;
}) {
  const params = simulation?.parameters || {};
  const length = (params.length as number) || 3.0;
  const initialAngleDeg = (params.initialAngle as number) || 35;
  const g = (params.gravity as number) || 9.81;
  const mass = (params.mass as number) || 1.0;
  const damping = (params.damping as number) || 0.0;

  const theta0 = initialAngleDeg * DEG;
  const omega0 = Math.sqrt(g / length);

  const timeRef = useRef(0);
  const rodRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Vector3[]>([]);
  const lineRef = useRef<any>(null);

  const pivotY = 5.5;

  useEffect(() => {
    timeRef.current = 0;
    trailRef.current = [];
    if (lineRef.current) {
      lineRef.current.geometry.setFromPoints([]);
    }
  }, [resetSignal, simulation]);

  useFrame((_, delta) => {
    if (isPlaying) {
      timeRef.current += delta * speedMultiplier;
    }
    const t = timeRef.current;
    const decay = Math.exp(-damping * t * 0.15);
    const theta = theta0 * Math.cos(omega0 * t) * decay;
    const omega = -theta0 * omega0 * Math.sin(omega0 * t) * decay;

    if (rodRef.current) {
      rodRef.current.rotation.z = -theta;
    }

    const bobX = length * Math.sin(theta);
    const bobY = pivotY - length * Math.cos(theta);
    const bobZ = 0;
    const currentBobPos = new THREE.Vector3(bobX, bobY, bobZ);

    onObjectPos(currentBobPos);

    if (graphics.showTrail) {
      const last = trailRef.current[trailRef.current.length - 1];
      if (!last || last.distanceTo(currentBobPos) > 0.08) {
        trailRef.current.push(currentBobPos.clone());
        if (trailRef.current.length > graphics.trailLength) {
          trailRef.current.shift();
        }
      }
      if (lineRef.current && trailRef.current.length > 1) {
        lineRef.current.geometry.setFromPoints(trailRef.current);
      }
    }

    const speed = Math.abs(length * omega);
    const ke = 0.5 * mass * speed * speed;
    const pe = mass * g * (length - length * Math.cos(theta));

    onTelemetry({
      time: t,
      speed,
      kineticEnergy: ke,
      potentialEnergy: pe,
      totalEnergy: ke + pe,
      posX: bobX,
      posY: bobY,
      posZ: bobZ,
    });
  });

  return (
    <group>
      {/* Pivot Ceiling Mount */}
      <mesh position={[0, pivotY, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Swinging Rod Group */}
      <group ref={rodRef} position={[0, pivotY, 0]}>
        <mesh position={[0, -length / 2, 0]}>
          <cylinderGeometry args={[0.03, 0.03, length, 16]} />
          <meshStandardMaterial color="#64748B" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, -length, 0]} castShadow>
          <sphereGeometry args={[0.38, 32, 32]} />
          <meshStandardMaterial color="#812834" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>

      {/* Dynamic Trail */}
      {graphics.showTrail && (
        <line ref={lineRef}>
          <bufferGeometry />
          <lineBasicMaterial color="#812834" linewidth={2.5} />
        </line>
      )}
    </group>
  );
}

// =========================================================================
// 5. HARMONIC OSCILLATOR (SPRING-MASS)
// =========================================================================
function LiveHarmonicOscillator({
  simulation,
  graphics,
  isPlaying,
  speedMultiplier,
  resetSignal,
  onTelemetry,
  onObjectPos,
}: {
  simulation: PhysicsSimulationData | null;
  graphics: GraphicsSettings;
  isPlaying: boolean;
  speedMultiplier: number;
  resetSignal: number;
  onTelemetry: (t: LiveTelemetry) => void;
  onObjectPos: (pos: THREE.Vector3) => void;
}) {
  const params = simulation?.parameters || {};
  const k = (params.springConstant as number) || 50;
  const mass = (params.mass as number) || 1.0;
  const initialDisp = (params.initialDisplacement as number) || 2.0;
  const dampingRatio = (params.damping as number) || 0.0;

  const omega0 = Math.sqrt(k / mass);

  const timeRef = useRef(0);
  const blockRef = useRef<THREE.Mesh>(null);
  const springLineRef = useRef<any>(null);

  const wallX = -6;
  const restX = 0;
  const blockY = 1.0;
  const blockWidth = 1.4;

  useEffect(() => {
    timeRef.current = 0;
  }, [resetSignal, simulation]);

  useFrame((_, delta) => {
    if (isPlaying) {
      timeRef.current += delta * speedMultiplier;
    }
    const t = timeRef.current;
    const decay = Math.exp(-dampingRatio * (t % 15));
    const currentDisp = initialDisp * Math.cos(omega0 * t) * decay;
    const currentVel = -initialDisp * omega0 * Math.sin(omega0 * t) * decay;
    const currentBlockX = restX + currentDisp * 2.2;

    const currentPos = new THREE.Vector3(currentBlockX, blockY, 0);

    if (blockRef.current) {
      blockRef.current.position.x = currentBlockX;
    }
    onObjectPos(currentPos);

    if (springLineRef.current) {
      const springStart = new THREE.Vector3(wallX, blockY, 0);
      const springEnd = new THREE.Vector3(
        currentBlockX - blockWidth / 2,
        blockY,
        0
      );
      const span = springEnd.x - springStart.x;
      const coils = 16;
      const points: THREE.Vector3[] = [springStart];
      const coilRadius = 0.5;

      const segments = 120;
      for (let i = 1; i < segments; i++) {
        const u = i / segments;
        const x = springStart.x + span * u;
        const angle = u * coils * Math.PI * 2;
        const y = blockY + Math.sin(angle) * coilRadius;
        const z = Math.cos(angle) * coilRadius;
        points.push(new THREE.Vector3(x, y, z));
      }
      points.push(springEnd);
      springLineRef.current.geometry.setFromPoints(points);
    }

    const ke = 0.5 * mass * currentVel * currentVel;
    const pe = 0.5 * k * currentDisp * currentDisp;

    onTelemetry({
      time: t,
      speed: Math.abs(currentVel),
      kineticEnergy: ke,
      potentialEnergy: pe,
      totalEnergy: ke + pe,
      posX: currentBlockX,
      posY: blockY,
      posZ: 0,
    });
  });

  return (
    <group>
      {/* Wall Bracket */}
      <mesh position={[wallX - 0.4, blockY + 0.5, 0]}>
        <boxGeometry args={[0.8, 3.0, 3.0]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Guide Rail */}
      <mesh position={[0, blockY - 0.7, 0]}>
        <boxGeometry args={[16, 0.15, 0.4]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* 3D Spring Coil */}
      <line ref={springLineRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#334155" linewidth={2.5} />
      </line>

      {/* Mass Block */}
      <mesh ref={blockRef} position={[restX, blockY, 0]} castShadow>
        <boxGeometry args={[blockWidth, blockWidth, blockWidth]} />
        <meshStandardMaterial color="#812834" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

// =========================================================================
// MAIN SIMULATION CANVAS
// =========================================================================
export function SimulationCanvas({
  mode = "orbit",
  resetSignal = 0,
  simulation = null,
  graphics = {
    cameraMode: "free",
    showTrail: true,
    trailLength: 150,
    showGrid: true,
    showAxes: true,
    showLabels: true,
    showShadows: true,
  },
  onUpdateGraphics,
}: {
  mode?: ViewMode;
  resetSignal?: number;
  simulation?: PhysicsSimulationData | null;
  graphics?: GraphicsSettings;
  onUpdateGraphics?: (g: Partial<GraphicsSettings>) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [telemetry, setTelemetry] = useState<LiveTelemetry>({
    time: 0,
    speed: 0,
    kineticEnergy: 0,
    potentialEnergy: 0,
    totalEnergy: 0,
    posX: 0,
    posY: 0,
    posZ: 0,
  });

  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const objectPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleObjectPos = (pos: THREE.Vector3) => {
    objectPosRef.current.copy(pos);
  };

  const cursorClass =
    mode === "pan"
      ? "cursor-grab"
      : mode === "zoom"
        ? "cursor-zoom-in"
        : "cursor-move";

  return (
    <div
      className={`relative h-full w-full touch-none overflow-hidden rounded-xl border border-border bg-white ${cursorClass}`}
      style={{
        backgroundColor: "#ffffff",
      }}
    >
      {/* HUD Telemetry and Playback Toolbar */}
      <div className="pointer-events-auto absolute top-3 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2">
        {/* Live Counters */}
        <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-background/85 px-3 py-1.5 shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
            <span className="text-muted-foreground">t:</span>
            <span>{telemetry.time.toFixed(2)}s</span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5 font-mono text-xs text-foreground">
            <Zap className="size-3.5 text-[#812834]" />
            <span>
              {telemetry.customLabel ? `${telemetry.customLabel}: ` : ""}
              {telemetry.customValue || `${telemetry.speed.toFixed(1)} m/s`}
            </span>
          </div>
          <span className="text-border hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <span>E: {(telemetry.totalEnergy || 0).toFixed(1)}J</span>
          </div>
        </div>

        {/* Live Playback & Camera Mode Controls */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/85 p-1 shadow-xs backdrop-blur-md">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
            className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-ring"
          >
            {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdateGraphics?.({
                cameraMode: graphics.cameraMode === "free" ? "follow" : "free",
              })
            }
            className={`flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${
              graphics.cameraMode === "follow"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Camera className="size-3" />
            <span>{graphics.cameraMode === "follow" ? "Follow: On" : "Free Cam"}</span>
          </button>
          <div className="flex items-center rounded-md bg-secondary/50 p-0.5 text-xs font-mono">
            {[0.5, 1, 2].map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => setSpeedMultiplier(sp)}
                className={`rounded px-1.5 py-0.5 transition-colors ${
                  speedMultiplier === sp
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3D Viewport Canvas */}
      {mounted ? (
        <Canvas
          shadows={graphics.showShadows}
          camera={{ position: [0, 8, 18], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          className="h-full w-full"
        >
          <PerspectiveCamera makeDefault position={[0, 8, 18]} fov={45} />
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.06}
            minDistance={3}
            maxDistance={55}
            maxPolarAngle={Math.PI / 2 + 0.05}
          />

          <CameraController
            cameraMode={graphics.cameraMode}
            objectPos={objectPosRef.current}
            controlsRef={controlsRef}
          />

          {/* Lighting Rig */}
          <ambientLight intensity={0.75} />
          <directionalLight
            position={[12, 22, 14]}
            intensity={1.2}
            castShadow={graphics.showShadows}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight
            position={[-10, 12, -8]}
            intensity={0.4}
            color="#ffffff"
          />

          {/* 3D Depth Grid */}
          {graphics.showGrid && (
            <Grid
              args={[34, 34]}
              cellSize={1}
              cellThickness={0.5}
              cellColor="#812834"
              sectionSize={5}
              sectionThickness={1.1}
              sectionColor="#812834"
              fadeDistance={28}
              fadeStrength={1.4}
              position={[0, -0.01, 0]}
            />
          )}

          {/* 3D Axes */}
          <CoordinateAxes visible={graphics.showAxes} />

          {/* Active Domain Scene Template */}
          {simulation?.type === "double_slit" ? (
            <LiveDoubleSlit
              simulation={simulation}
              graphics={graphics}
              isPlaying={isPlaying}
              speedMultiplier={speedMultiplier}
              resetSignal={resetSignal}
              onTelemetry={setTelemetry}
              onObjectPos={handleObjectPos}
            />
          ) : simulation?.type === "refraction" ? (
            <LiveRefraction
              simulation={simulation}
              graphics={graphics}
              isPlaying={isPlaying}
              speedMultiplier={speedMultiplier}
              resetSignal={resetSignal}
              onTelemetry={setTelemetry}
              onObjectPos={handleObjectPos}
            />
          ) : simulation?.type === "particle_drift" ? (
            <LiveParticleDrift
              simulation={simulation}
              graphics={graphics}
              isPlaying={isPlaying}
              speedMultiplier={speedMultiplier}
              resetSignal={resetSignal}
              onTelemetry={setTelemetry}
              onObjectPos={handleObjectPos}
            />
          ) : simulation?.type === "collision" ? (
            <LiveCollision
              simulation={simulation}
              graphics={graphics}
              isPlaying={isPlaying}
              speedMultiplier={speedMultiplier}
              resetSignal={resetSignal}
              onTelemetry={setTelemetry}
              onObjectPos={handleObjectPos}
            />
          ) : simulation?.type === "pendulum" ? (
            <LivePendulum
              simulation={simulation}
              graphics={graphics}
              isPlaying={isPlaying}
              speedMultiplier={speedMultiplier}
              resetSignal={resetSignal}
              onTelemetry={setTelemetry}
              onObjectPos={handleObjectPos}
            />
          ) : simulation?.type === "harmonic_oscillator" ? (
            <LiveHarmonicOscillator
              simulation={simulation}
              graphics={graphics}
              isPlaying={isPlaying}
              speedMultiplier={speedMultiplier}
              resetSignal={resetSignal}
              onTelemetry={setTelemetry}
              onObjectPos={handleObjectPos}
            />
          ) : (
            <LiveProjectile
              simulation={simulation}
              graphics={graphics}
              isPlaying={isPlaying}
              speedMultiplier={speedMultiplier}
              resetSignal={resetSignal}
              onTelemetry={setTelemetry}
              onObjectPos={handleObjectPos}
            />
          )}
        </Canvas>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground">
            Initializing Real-Time 3D Physics Engine...
          </span>
        </div>
      )}
    </div>
  );
}
