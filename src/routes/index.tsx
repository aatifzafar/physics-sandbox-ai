import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Atom, Info, PanelRightClose, PanelRightOpen, Plus, X } from "lucide-react";
import { SimulationCanvas, type ViewMode } from "../components/simulation/SimulationCanvas";
import { PromptBar } from "../components/simulation/PromptBar";
import { ExplanationSidebar } from "../components/simulation/ExplanationSidebar";
import {
  generateSimulation,
  type PhysicsSimulationData,
  type SimulationExplanation,
  type SimulationMetadata,
} from "../lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PhysicsAI — Text-to-3D Physics Simulation Lab" },
      {
        name: "description",
        content:
          "Describe any physics scenario in plain language and watch it rendered as an interactive 3D simulation with step-by-step AI explanations.",
      },
      { property: "og:title", content: "PhysicsAI — Text-to-3D Physics Simulation Lab" },
      {
        property: "og:description",
        content:
          "Describe any physics scenario in plain language and watch it rendered as an interactive 3D simulation with step-by-step AI explanations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULT_SIMULATION: PhysicsSimulationData = {
  id: "sim_default_drude",
  type: "particle_drift",
  parameters: {
    electricField: 100,
    carrierDensity: 8.5e28,
    relaxationTime: 2.5e-14,
    temperature: 300,
    wireRadius: 1.4,
    wireLength: 16,
    particleCount: 50,
  },
  trajectory: [],
  results: {
    driftVelocity: 0.4397,
    driftVelocityFormatted: "0.44 mm/s",
    meanFreePath: 2.92e-9,
    meanFreePathFormatted: "2.92 nm",
    conductivity: 5.98e7,
    currentDensity: 5.98e9,
    mobility: 0.0044,
    thermalVelocity: 116800,
  },
};

const DEFAULT_EXPLANATION: SimulationExplanation = {
  title: "Microscopic Electron Drift in a Conducting Wire",
  summary:
    "This simulation visualizes the microscopic motion of conduction electrons inside a metallic wire under the influence of an external electric field. It highlights the stark contrast between rapid, random thermal motion and the slow, collective drift caused by the field amidst frequent ionic lattice collisions.",
  keyConcepts: [
    "Drude Model: A classical framework describing charge carriers undergoing continuous acceleration interrupted by instantaneous scattering events.",
    "Thermal vs. Drift Motion: Random thermal motion occurs at extremely high velocities in all directions, whereas drift velocity is the tiny net directional average caused by the electric field.",
    "Mean Free Path and Relaxation Time: The average distance and average time elapsed between successive electron collisions with lattice ions.",
    "Conductivity and Current Density: Macroscopic properties directly resulting from microscopic carrier density, charge, and electron mobility.",
  ],
  equations: [
    "v_d = \\frac{e E \\tau}{m_e}",
    "J = \\sigma E = n e v_d",
    "\\sigma = \\frac{n e^2 \\tau}{m_e}",
    "v_{\\text{th}} = \\sqrt{\\frac{3 k_B T}{m_e}}",
    "\\lambda = v_{\\text{th}} \\tau",
  ],
  simulationSteps: [
    "Initialize free electrons at random coordinates within the wire geometry with isotropic thermal velocities.",
    "Apply continuous electric field force accelerating electrons along the wire axis.",
    "Compute elastic collision reflections upon contact with stationary metallic copper ions.",
    "Track instantaneous drift velocity, current density, and mean free path in real time.",
  ],
  observations: [
    "Calculated electron drift velocity is ~0.44 mm/s under E = 100 V/m.",
    "Mean free path between lattice ion collisions is ~2.92 nm.",
    "Macroscopic electrical conductivity is ~5.98 × 10⁷ S/m.",
    "Current density flowing through conductor is ~5.98 × 10⁹ A/m².",
  ],
};

const DEFAULT_METADATA: SimulationMetadata = {
  modelUsed: "gemini-3.7-flash",
  retries: 0,
  fallbackUsed: false,
  template: "particle_drift",
};

function Index() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("orbit");
  const [resetSignal, setResetSignal] = useState(0);

  const [simulation, setSimulation] = useState<PhysicsSimulationData | null>(
    DEFAULT_SIMULATION
  );
  const [explanation, setExplanation] = useState<SimulationExplanation | null>(
    DEFAULT_EXPLANATION
  );
  const [metadata, setMetadata] = useState<SimulationMetadata | null>(
    DEFAULT_METADATA
  );
  const [timestamp, setTimestamp] = useState<string | undefined>("10:32:15 AM");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [staleNote, setStaleNote] = useState<string | null>(null);

  const [graphics, setGraphics] = useState({
    cameraMode: "free" as "free" | "follow",
    showTrail: true,
    trailLength: 150,
    showGrid: true,
    showAxes: true,
    showLabels: true,
    showShadows: true,
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setSidebarOpen(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const handleGenerate = async (prompt: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setStaleNote(null);
    try {
      const res = await generateSimulation(prompt);
      setSimulation(res.simulation);
      setExplanation(res.explanation);
      setMetadata(res.metadata || null);
      setTimestamp(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setResetSignal((n) => n + 1);

      if (res.metadata?.fallbackUsed) {
        setStatusMessage(
          `Primary model was busy. Simulation generated via ${res.metadata.modelUsed}.`
        );
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || "Failed to generate simulation. Please check your prompt and try again."
      );
      setStaleNote(`Showing previous simulation — generation failed for "${prompt}"`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSimulation = () => {
    setSimulation(DEFAULT_SIMULATION);
    setExplanation(DEFAULT_EXPLANATION);
    setMetadata(DEFAULT_METADATA);
    setErrorMessage(null);
    setStatusMessage(null);
    setStaleNote(null);
    setResetSignal((n) => n + 1);
  };

  const handleUpdateParameters = (newParams: Record<string, number>) => {
    setSimulation((prev) => {
      if (!prev) {
        return {
          id: `sim_${Date.now()}`,
          type: "particle_drift",
          parameters: newParams,
          trajectory: [],
          results: {},
        };
      }
      return {
        ...prev,
        parameters: newParams,
      };
    });
  };

  const handleUpdateGraphics = (updated: Partial<typeof graphics>) => {
    setGraphics((prev) => ({ ...prev, ...updated }));
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas text-foreground">
      {/* Top navbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Atom className="size-4.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Physics<span className="text-primary">AI</span>
          </span>
          <span className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            lab · v0.9
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "Hide explanation panel" : "Show explanation panel"}
            className="flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
          >
            {sidebarOpen ? (
              <PanelRightClose className="size-4" />
            ) : (
              <PanelRightOpen className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={handleNewSimulation}
            className="flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus className="size-4" />
            New Simulation
          </button>
        </div>
      </header>

      {/* Info status notice banner */}
      {statusMessage && (
        <div className="flex items-center justify-between border-b border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-foreground">
          <div className="flex items-center gap-2">
            <Info className="size-3.5 text-primary shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="rounded p-1 hover:bg-secondary"
            aria-label="Dismiss message"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Error notification banner */}
      {errorMessage && (
        <div className="flex items-center justify-between border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setStaleNote(null);
            }}
            className="rounded p-1 hover:bg-destructive/20"
            aria-label="Dismiss error"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Main region */}
      <div className="relative flex min-h-0 flex-1">
        {/* Canvas + floating prompt */}
        <main className="relative min-w-0 flex-1 p-3 sm:p-4">
          {staleNote && (
            <div className="absolute left-6 top-6 z-20 flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-background/95 px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm backdrop-blur-sm">
              <AlertCircle className="size-3.5 text-amber-600" />
              <span>{staleNote}</span>
            </div>
          )}
          <SimulationCanvas
            mode={viewMode}
            resetSignal={resetSignal}
            simulation={simulation}
            graphics={graphics}
            onUpdateGraphics={handleUpdateGraphics}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center px-4">
            <PromptBar onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
        </main>

        {/* Explanation sidebar — desktop inline, mobile overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-foreground/20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
            <div className="fixed inset-y-14 right-0 z-40 w-[min(24rem,88vw)] lg:static lg:z-auto lg:w-[28%] lg:min-w-80">
              <ExplanationSidebar
                onClose={() => setSidebarOpen(false)}
                explanation={explanation}
                parameters={simulation?.parameters}
                results={simulation?.results}
                timestamp={timestamp}
                simulationType={simulation?.type || "projectile"}
                metadata={metadata}
                onUpdateParameters={handleUpdateParameters}
                graphics={graphics}
                onUpdateGraphics={handleUpdateGraphics}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
