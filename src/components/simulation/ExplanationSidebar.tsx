import { useEffect, useState } from "react";
import {
  Activity,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Cpu,
  Eye,
  Layers,
  Settings,
  Sliders,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import katex from "katex";

import type { SimulationExplanation, SimulationMetadata, SimulationType } from "../../lib/api";
import type { GraphicsSettings } from "./SimulationCanvas";

type Tab = "explanation" | "equations" | "physics" | "graphics";

const DEFAULT_KEY_CONCEPTS = [
  "Drude Model: A classical framework describing charge carriers undergoing continuous acceleration interrupted by instantaneous scattering events.",
  "Thermal vs. Drift Motion: Random thermal motion occurs at high velocities in all directions, whereas drift velocity is the tiny net directional average caused by the electric field.",
  "Mean Free Path and Relaxation Time: The average distance and average time elapsed between successive electron collisions with lattice ions.",
  "Conductivity and Current Density: Macroscopic properties directly resulting from microscopic carrier density, charge, and electron mobility.",
];

const DEFAULT_STEPS = [
  "Initialize free electrons at random coordinates within the wire geometry with isotropic thermal velocities.",
  "Apply continuous electric field force accelerating electrons along the wire axis.",
  "Compute elastic collision reflections upon contact with stationary metallic copper ions.",
  "Track instantaneous drift velocity, current density, and mean free path in real time.",
];

const DEFAULT_OBSERVATIONS = [
  "Calculated electron drift velocity is ~0.44 mm/s under E = 100 V/m.",
  "Mean free path between lattice ion collisions is ~2.92 nm.",
  "Macroscopic electrical conductivity is ~5.98 × 10⁷ S/m.",
  "Current density flowing through conductor is ~5.98 × 10⁹ A/m².",
];

function sanitizeLaTeX(str: string): string {
  if (!str) return "";
  let s = str.trim();
  // Strip enclosing $ or $$ delimiters
  s = s.replace(/^\$\$?/, "").replace(/\$\$?$/, "");
  // Replace literal tab escapes from JSON
  s = s.replace(/\t/g, " ");
  // Replace escaped \c which KaTeX misinterprets as cedilla text accent
  s = s.replace(/\\c\s*o\s*s/gi, "\\cos");
  // Normalize unbraced frac expressions
  s = s.replace(/\\frac\s*2\s*v_?0\s*\\?sin\s*\(?\\?theta\)?\s*g/gi, "\\frac{2 v_0 \\sin\\theta}{g}");
  s = s.replace(/\\frac\s*v_?0\^?2?\s*\\?sin\s*\(?2\\?theta\)?\s*g/gi, "\\frac{v_0^2 \\sin(2\\theta)}{g}");
  s = s.replace(/\\frac\s*1\s*2\s*g\s*t\^?2?/gi, "\\frac{1}{2} g t^2");
  // Standardize common trigonometric functions
  s = s.replace(/\\?cos\s*\(?\\?theta\)?/gi, "\\cos\\theta");
  s = s.replace(/\\?sin\s*\(?\\?theta\)?/gi, "\\sin\\theta");
  s = s.replace(/\\?sin\s*\(?2\\?theta\)?/gi, "\\sin(2\\theta)");
  return s;
}

function SafeMath({ math }: { math: string }) {
  const clean = sanitizeLaTeX(math);
  try {
    const html = katex.renderToString(clean, {
      displayMode: true,
      throwOnError: false,
      strict: false,
    });
    return (
      <div
        className="katex-equation flex w-full items-center justify-center overflow-x-auto py-1"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return <span className="font-mono text-xs text-foreground">{math}</span>;
  }
}

const DEFAULT_EQUATIONS = [
  "v_d = \\frac{e E \\tau}{m_e}",
  "J = \\sigma E = n e v_d",
  "\\sigma = \\frac{n e^2 \\tau}{m_e}",
  "v_{\\text{th}} = \\sqrt{\\frac{3 k_B T}{m_e}}",
  "\\lambda = v_{\\text{th}} \\tau",
];

function SectionTitle({ title, time }: { title: string; time: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <span className="shrink-0 font-mono text-[10px] text-primary">{time}</span>
    </div>
  );
}

export interface ExplanationSidebarProps {
  onClose: () => void;
  explanation?: SimulationExplanation | null;
  parameters?: Record<string, any> | null;
  results?: Record<string, any> | null;
  timestamp?: string;
  simulationType?: SimulationType;
  metadata?: SimulationMetadata | null;
  onUpdateParameters?: (params: Record<string, number>) => void;
  graphics?: GraphicsSettings;
  onUpdateGraphics?: (g: Partial<GraphicsSettings>) => void;
}

export function ExplanationSidebar({
  onClose,
  explanation,
  parameters,
  results,
  timestamp,
  simulationType = "particle_drift",
  metadata,
  onUpdateParameters,
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
}: ExplanationSidebarProps) {
  const [tab, setTab] = useState<Tab>("explanation");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayTime = timestamp || "10:32:15 AM";

  const title =
    explanation?.title || "Microscopic Electron Drift in a Conducting Wire";
  const summary =
    explanation?.summary ||
    "This simulation visualizes the microscopic motion of conduction electrons inside a metallic wire under the influence of an external electric field. It highlights the stark contrast between rapid, random thermal motion and the slow, collective drift caused by the field amidst frequent ionic lattice collisions.";
  const keyConcepts = explanation?.keyConcepts?.length
    ? explanation.keyConcepts
    : DEFAULT_KEY_CONCEPTS;
  const equations = explanation?.equations?.length
    ? explanation.equations
    : DEFAULT_EQUATIONS;
  const steps = explanation?.simulationSteps?.length
    ? explanation.simulationSteps
    : DEFAULT_STEPS;
  const observations = explanation?.observations?.length
    ? explanation.observations
    : DEFAULT_OBSERVATIONS;

  const currentParams = parameters || {};

  const handleParamChange = (key: string, value: number) => {
    if (onUpdateParameters) {
      onUpdateParameters({
        ...currentParams,
        [key]: value,
      });
    }
  };

  const domainLabel =
    simulationType === "double_slit"
      ? "Double-Slit Interference"
      : simulationType === "refraction"
        ? "Snell's Law & Refraction"
        : simulationType === "particle_drift"
          ? "Drude Electron Transport"
          : simulationType === "collision"
            ? "2-Body Impact Collision"
            : simulationType === "pendulum"
              ? "Harmonic Pendulum"
              : simulationType === "harmonic_oscillator"
                ? "Spring-Mass Oscillator"
                : "Kinematic Projectile";

  return (
    <aside className="flex h-full flex-col border-l border-border bg-panel text-panel-foreground shadow-lg">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Simulation Lab</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <X className="size-4" />
        </button>
      </header>

      {/* Model & Domain Template Transparency Badge */}
      <div className="flex items-center justify-between border-b border-border/80 bg-secondary/40 px-3.5 py-2 text-[11px]">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{domainLabel}</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <Cpu className="size-3 text-primary" />
          <span>{metadata?.modelUsed || "gemini-3.7-flash"}</span>
          {metadata?.retries ? (
            <span className="rounded bg-amber-500/10 px-1 text-[9px] font-semibold text-amber-600">
              {metadata.retries} retries
            </span>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex shrink-0 border-b border-border bg-secondary/30 px-2 pt-1 text-xs">
        <button
          type="button"
          onClick={() => setTab("explanation")}
          className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 font-medium transition-colors ${
            tab === "explanation"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="size-3" />
          <span>AI Insights</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("physics")}
          className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 font-medium transition-colors ${
            tab === "physics"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sliders className="size-3" />
          <span>Physics</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("graphics")}
          className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 font-medium transition-colors ${
            tab === "graphics"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye className="size-3" />
          <span>Graphics</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("equations")}
          className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 font-medium transition-colors ${
            tab === "equations"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Math</span>
        </button>
      </nav>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        {/* TAB 1: AI EXPLANATION */}
        {tab === "explanation" && (
          <div className="space-y-5">
            <section className="space-y-1.5">
              <SectionTitle title={title} time={displayTime} />
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {summary}
              </p>
            </section>

            <section className="space-y-1.5">
              <SectionTitle title="Core Principles" time={displayTime} />
              <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-muted-foreground">
                {keyConcepts.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <SectionTitle title="Equations Used" time={displayTime} />
              <ul className="space-y-2 text-foreground">
                {equations.map((m, i) => (
                  <li
                    key={m + i}
                    className="flex items-center gap-3 rounded-md bg-secondary px-3 py-2 text-[13px]"
                  >
                    {mounted ? (
                      <SafeMath math={m} />
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">
                        {m}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <SectionTitle title="Simulation Steps" time={displayTime} />
              <ol className="list-decimal space-y-1 pl-4 text-[13px] leading-relaxed text-muted-foreground">
                {steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </section>

            <section className="space-y-1.5">
              <SectionTitle title="Calculated Observations" time={displayTime} />
              <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-muted-foreground">
                {observations.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {/* TAB 2: LIVE PHYSICS PARAMETERS */}
        {tab === "physics" && (
          <div className="space-y-5">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">Live Engine Active:</span>{" "}
              Adjusting parameters updates the simulation motion in real time.
            </div>

            {simulationType === "double_slit" ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Wavelength (λ)</span>
                    <span className="font-mono text-primary">
                      {Math.round(currentParams.wavelength ?? 532)} nm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="380"
                    max="720"
                    step="5"
                    value={currentParams.wavelength ?? 532}
                    onChange={(e) =>
                      handleParamChange("wavelength", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Slit Separation (d)</span>
                    <span className="font-mono text-primary">
                      {(currentParams.slitSeparation ?? 0.25).toFixed(2)} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.80"
                    step="0.02"
                    value={currentParams.slitSeparation ?? 0.25}
                    onChange={(e) =>
                      handleParamChange("slitSeparation", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Screen Distance (L)</span>
                    <span className="font-mono text-primary">
                      {(currentParams.distanceToScreen ?? 1.2).toFixed(2)} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={currentParams.distanceToScreen ?? 1.2}
                    onChange={(e) =>
                      handleParamChange(
                        "distanceToScreen",
                        parseFloat(e.target.value)
                      )
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                {/* Derived live fringe spacing readout */}
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Derived Fringe Spacing (Δy)
                  </span>
                  <div className="mt-1 font-mono text-sm font-bold text-primary">
                    Δy = (λ·L)/d ={" "}
                    {(
                      ((currentParams.wavelength ?? 532) *
                        1e-3 *
                        (currentParams.distanceToScreen ?? 1.2)) /
                      (currentParams.slitSeparation ?? 0.25)
                    ).toFixed(2)}{" "}
                    mm
                  </div>
                </div>
              </div>
            ) : simulationType === "refraction" ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Incident Angle (θ₁)</span>
                    <span className="font-mono text-primary">
                      {Math.round(currentParams.incidentAngle ?? 45)}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="85"
                    step="1"
                    value={currentParams.incidentAngle ?? 45}
                    onChange={(e) =>
                      handleParamChange("incidentAngle", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Medium 1 Index (n₁)</span>
                    <span className="font-mono text-primary">
                      {(currentParams.n1 ?? 1.0).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.00"
                    max="2.50"
                    step="0.01"
                    value={currentParams.n1 ?? 1.0}
                    onChange={(e) =>
                      handleParamChange("n1", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Medium 2 Index (n₂)</span>
                    <span className="font-mono text-primary">
                      {(currentParams.n2 ?? 1.5).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.00"
                    max="2.50"
                    step="0.01"
                    value={currentParams.n2 ?? 1.5}
                    onChange={(e) =>
                      handleParamChange("n2", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>
              </div>
            ) : simulationType === "particle_drift" ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Electric Field (E)</span>
                    <span className="font-mono text-primary">
                      {Math.round(currentParams.electricField || 100)} V/m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={currentParams.electricField || 100}
                    onChange={(e) =>
                      handleParamChange("electricField", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Particle Count (Electrons)</span>
                    <span className="font-mono text-primary">
                      {Math.round(currentParams.particleCount || 40)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={currentParams.particleCount || 40}
                    onChange={(e) =>
                      handleParamChange("particleCount", parseInt(e.target.value, 10))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Temperature (T)</span>
                    <span className="font-mono text-primary">
                      {Math.round(currentParams.temperature || 300)} K
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="600"
                    step="20"
                    value={currentParams.temperature || 300}
                    onChange={(e) =>
                      handleParamChange("temperature", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>
              </div>
            ) : simulationType === "collision" ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Mass 1 (m₁)</span>
                    <span className="font-mono text-primary">
                      {(currentParams.mass1 || 2.0).toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="8"
                    step="0.5"
                    value={currentParams.mass1 || 2.0}
                    onChange={(e) =>
                      handleParamChange("mass1", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Mass 2 (m₂)</span>
                    <span className="font-mono text-primary">
                      {(currentParams.mass2 || 1.0).toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="8"
                    step="0.5"
                    value={currentParams.mass2 || 1.0}
                    onChange={(e) =>
                      handleParamChange("mass2", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Velocity 1 (v₁)</span>
                    <span className="font-mono text-primary">
                      {(currentParams.velocity1 || 4.0).toFixed(1)} m/s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-8"
                    max="8"
                    step="0.5"
                    value={currentParams.velocity1 || 4.0}
                    onChange={(e) =>
                      handleParamChange("velocity1", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Velocity 2 (v₂)</span>
                    <span className="font-mono text-primary">
                      {(currentParams.velocity2 || -3.0).toFixed(1)} m/s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-8"
                    max="8"
                    step="0.5"
                    value={currentParams.velocity2 || -3.0}
                    onChange={(e) =>
                      handleParamChange("velocity2", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Elasticity (e)</span>
                    <span className="font-mono text-primary">
                      {(currentParams.elasticity ?? 1.0).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={currentParams.elasticity ?? 1.0}
                    onChange={(e) =>
                      handleParamChange("elasticity", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>
              </div>
            ) : simulationType === "pendulum" ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Rod Length</span>
                    <span className="font-mono text-primary">
                      {(currentParams.length || 3).toFixed(1)} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="8"
                    step="0.1"
                    value={currentParams.length || 3}
                    onChange={(e) =>
                      handleParamChange("length", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Initial Release Angle</span>
                    <span className="font-mono text-primary">
                      {Math.round(currentParams.initialAngle || 35)}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-80"
                    max="80"
                    step="1"
                    value={currentParams.initialAngle || 35}
                    onChange={(e) =>
                      handleParamChange("initialAngle", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Bob Mass</span>
                    <span className="font-mono text-primary">
                      {(currentParams.mass || 1.0).toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="10"
                    step="0.2"
                    value={currentParams.mass || 1.0}
                    onChange={(e) =>
                      handleParamChange("mass", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Damping (Friction)</span>
                    <span className="font-mono text-primary">
                      {(currentParams.damping || 0).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.02"
                    value={currentParams.damping || 0}
                    onChange={(e) =>
                      handleParamChange("damping", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Gravity</span>
                    <span className="font-mono text-primary">
                      {(currentParams.gravity || 9.81).toFixed(2)} m/s²
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.62"
                    max="24.79"
                    step="0.1"
                    value={currentParams.gravity || 9.81}
                    onChange={(e) =>
                      handleParamChange("gravity", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>
              </div>
            ) : simulationType === "harmonic_oscillator" ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Spring Constant (k)</span>
                    <span className="font-mono text-primary">
                      {Math.round(currentParams.springConstant || 50)} N/m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={currentParams.springConstant || 50}
                    onChange={(e) =>
                      handleParamChange("springConstant", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Mass</span>
                    <span className="font-mono text-primary">
                      {(currentParams.mass || 1.0).toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="10"
                    step="0.2"
                    value={currentParams.mass || 1.0}
                    onChange={(e) =>
                      handleParamChange("mass", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Initial Displacement</span>
                    <span className="font-mono text-primary">
                      {(currentParams.initialDisplacement || 2.0).toFixed(1)} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-4"
                    max="4"
                    step="0.2"
                    value={currentParams.initialDisplacement || 2.0}
                    onChange={(e) =>
                      handleParamChange(
                        "initialDisplacement",
                        parseFloat(e.target.value)
                      )
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Damping Coefficient</span>
                    <span className="font-mono text-primary">
                      {(currentParams.damping || 0).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={currentParams.damping || 0}
                    onChange={(e) =>
                      handleParamChange("damping", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Initial Velocity (v₀)</span>
                    <span className="font-mono text-primary">
                      {Math.round(currentParams.initialVelocity || 20)} m/s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="1"
                    value={currentParams.initialVelocity || 20}
                    onChange={(e) =>
                      handleParamChange("initialVelocity", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Launch Angle (θ)</span>
                    <span className="font-mono text-primary">
                      {Math.round(currentParams.angle || 45)}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="85"
                    step="1"
                    value={currentParams.angle || 45}
                    onChange={(e) =>
                      handleParamChange("angle", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Gravity (g)</span>
                    <span className="font-mono text-primary">
                      {(currentParams.gravity || 9.81).toFixed(2)} m/s²
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.62"
                    max="24.79"
                    step="0.1"
                    value={currentParams.gravity || 9.81}
                    onChange={(e) =>
                      handleParamChange("gravity", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span>Initial Launch Height</span>
                    <span className="font-mono text-primary">
                      {(currentParams.initialHeight || 0).toFixed(1)} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={currentParams.initialHeight || 0}
                    onChange={(e) =>
                      handleParamChange("initialHeight", parseFloat(e.target.value))
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GRAPHICS & CAMERA CONTROLS */}
        {tab === "graphics" && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Camera Tracking
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateGraphics?.({ cameraMode: "free" })
                  }
                  className={`flex items-center justify-center gap-1.5 rounded-md border p-2 text-xs font-medium transition-colors ${
                    graphics.cameraMode === "free"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <Camera className="size-3.5" />
                  Free Orbit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateGraphics?.({ cameraMode: "follow" })
                  }
                  className={`flex items-center justify-center gap-1.5 rounded-md border p-2 text-xs font-medium transition-colors ${
                    graphics.cameraMode === "follow"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <Activity className="size-3.5" />
                  Lock / Follow
                </button>
              </div>
            </div>

            <div className="space-y-3 divide-y divide-border/60">
              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-xs font-medium">Trajectory Trail</div>
                  <div className="text-[11px] text-muted-foreground">
                    Live ribbon tracing path
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={graphics.showTrail}
                  onChange={(e) =>
                    onUpdateGraphics?.({ showTrail: e.target.checked })
                  }
                  className="size-4 accent-primary"
                />
              </div>

              {graphics.showTrail && (
                <div className="pt-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Trail Length</span>
                    <span className="font-mono text-primary">
                      {graphics.trailLength} pts
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="300"
                    step="10"
                    value={graphics.trailLength}
                    onChange={(e) =>
                      onUpdateGraphics?.({
                        trailLength: parseInt(e.target.value, 10),
                      })
                    }
                    className="mt-1.5 w-full accent-primary"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs font-medium">3D Ground Grid</div>
                <input
                  type="checkbox"
                  checked={graphics.showGrid}
                  onChange={(e) =>
                    onUpdateGraphics?.({ showGrid: e.target.checked })
                  }
                  className="size-4 accent-primary"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs font-medium">3D Coordinate Axes</div>
                <input
                  type="checkbox"
                  checked={graphics.showAxes}
                  onChange={(e) =>
                    onUpdateGraphics?.({ showAxes: e.target.checked })
                  }
                  className="size-4 accent-primary"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs font-medium">Floating Stat Labels</div>
                <input
                  type="checkbox"
                  checked={graphics.showLabels}
                  onChange={(e) =>
                    onUpdateGraphics?.({ showLabels: e.target.checked })
                  }
                  className="size-4 accent-primary"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs font-medium">Volumetric Shadows</div>
                <input
                  type="checkbox"
                  checked={graphics.showShadows}
                  onChange={(e) =>
                    onUpdateGraphics?.({ showShadows: e.target.checked })
                  }
                  className="size-4 accent-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MATHEMATICAL EQUATIONS */}
        {tab === "equations" && (
          <div className="space-y-3">
            {equations.map((math, i) => (
              <div
                key={math + i}
                className="rounded-md border border-border p-3"
              >
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Equation {i + 1}
                </p>
                {mounted ? (
                  <SafeMath math={math} />
                ) : (
                  <span className="font-mono text-xs text-muted-foreground">
                    {math}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
