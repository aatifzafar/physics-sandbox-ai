import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Atom,
  Cpu,
  Info,
  Key,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { SimulationCanvas, type ViewMode } from "../components/simulation/SimulationCanvas";
import { PromptBar } from "../components/simulation/PromptBar";
import { ExplanationSidebar } from "../components/simulation/ExplanationSidebar";
import { ProviderSettingsModal } from "../components/simulation/ProviderSettingsModal";
import {
  generateSimulation,
  getStoredProviderOptions,
  type PhysicsSimulationData,
  type SimulationExplanation,
  type SimulationMetadata,
  type LLMProviderOptions,
} from "../lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PhysicsAI — Universal Text-to-3D Physics Lab" },
      {
        name: "description",
        content:
          "Generate interactive real-time 3D simulations for ANY physics topic automatically with step-by-step mathematical explanations.",
      },
      { property: "og:title", content: "PhysicsAI — Universal Text-to-3D Physics Lab" },
      {
        property: "og:description",
        content:
          "Generate interactive real-time 3D simulations for ANY physics topic automatically with step-by-step mathematical explanations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULT_SIMULATION: PhysicsSimulationData = {
  id: "sim_default_nbody",
  type: "dynamic",
  parameters: {
    gravitationalConstant: 12.0,
    mass1: 25.0,
    mass2: 20.0,
    planetSpeed: 2.1,
  },
  trajectory: [],
  results: {
    topic: "Three-Body Gravitational Orbital Dynamics & Chaos",
    category: "Astrophysics & Celestial Mechanics",
  },
  dynamicDefinition: {
    topic: "Three-Body Gravitational Orbital Dynamics & Chaos",
    category: "Astrophysics & Celestial Mechanics",
    sceneEnvironment: {
      cameraPosition: [0, 14, 22],
      cameraTarget: [0, 0, 0],
      gridVisible: true,
      ambientIntensity: 0.7,
    },
    physics: {
      engineType: "nbody_gravity",
      gravitationalConstant: 12.0,
      damping: 0.0,
      timeStep: 0.016,
    },
    entities: [
      {
        id: "star_alpha",
        name: "Primary Star (Alpha)",
        geometry: "sphere",
        color: "#F59E0B",
        emissive: "#D97706",
        emissiveIntensity: 0.8,
        radius: 1.2,
        position: [-4.0, 0, 0],
        velocity: [0, 0, 1.2],
        mass: 25.0,
        showTrail: true,
        trailColor: "#F59E0B",
        label: "Star Alpha (25 M☉)",
        physicsRole: "body",
      },
      {
        id: "star_beta",
        name: "Secondary Star (Beta)",
        geometry: "sphere",
        color: "#3B82F6",
        emissive: "#1D4ED8",
        emissiveIntensity: 0.8,
        radius: 1.0,
        position: [4.0, 0, 0],
        velocity: [0, 0, -1.2],
        mass: 20.0,
        showTrail: true,
        trailColor: "#3B82F6",
        label: "Star Beta (20 M☉)",
        physicsRole: "body",
      },
      {
        id: "planet_gamma",
        name: "Circumbinary Planet (Gamma)",
        geometry: "sphere",
        color: "#10B981",
        emissive: "#059669",
        emissiveIntensity: 0.6,
        radius: 0.5,
        position: [0, 0, 7.5],
        velocity: [-2.1, 0.4, 0],
        mass: 1.0,
        showTrail: true,
        trailColor: "#10B981",
        label: "Planet Gamma",
        physicsRole: "body",
      },
    ],
    parameters: [
      {
        key: "gravitationalConstant",
        label: "Gravitational Constant (G)",
        value: 12.0,
        min: 1.0,
        max: 30.0,
        step: 0.5,
        unit: "G",
        description: "Mutual gravitational attraction constant",
      },
      {
        key: "mass1",
        label: "Primary Star Mass (M₁)",
        value: 25.0,
        min: 5.0,
        max: 60.0,
        step: 1.0,
        unit: "M☉",
        description: "Mass of primary yellow star",
      },
      {
        key: "mass2",
        label: "Secondary Star Mass (M₂)",
        value: 20.0,
        min: 5.0,
        max: 60.0,
        step: 1.0,
        unit: "M☉",
        description: "Mass of secondary blue star",
      },
      {
        key: "planetSpeed",
        label: "Planet Orbital Speed",
        value: 2.1,
        min: 0.5,
        max: 5.0,
        step: 0.1,
        unit: "km/s",
        description: "Initial orbital tangential velocity of planet",
      },
    ],
    telemetry: [
      { key: "totalEnergy", label: "Hamiltonian Total Energy", unit: "J", format: "0.00" },
      { key: "kineticEnergy", label: "Total Kinetic Energy", unit: "J", format: "0.00" },
      { key: "potentialEnergy", label: "Gravitational Potential Energy", unit: "J", format: "0.00" },
    ],
  },
};

const DEFAULT_EXPLANATION: SimulationExplanation = {
  title: "Three-Body Gravitational Problem & Deterministic Chaos",
  summary:
    "This simulation computes the simultaneous gravitational mutual interactions among three celestial bodies in 3D space. The nonlinear gravitational coupling between two massive stellar cores and an orbiting planet demonstrates sensitive dependence on initial conditions (deterministic chaos).",
  keyConcepts: [
    "Newtonian Universal Gravitation: Every body attracts every other mass with force F = G (m₁ m₂) / r².",
    "Deterministic Chaos: Unlike two-body Keplerian orbits, general three-body systems have no analytical closed-form solution and exhibit chaotic orbital evolution.",
    "Energy & Angular Momentum Conservation: Total mechanical energy E = E_k + E_p remains strictly conserved throughout the mutual orbit.",
  ],
  equations: [
    "\\vec{F}_i = \\sum_{j \\neq i} G \\frac{m_i m_j}{|\\vec{r}_j - \\vec{r}_i|^3} (\\vec{r}_j - \\vec{r}_i)",
    "\\frac{d^2\\vec{r}_i}{dt^2} = \\sum_{j \\neq i} G \\frac{m_j}{|\\vec{r}_j - \\vec{r}_i|^3} (\\vec{r}_j - \\vec{r}_i)",
    "E_{\\text{total}} = \\sum_i \\frac{1}{2} m_i v_i^2 - \\sum_{i < j} \\frac{G m_i m_j}{|\\vec{r}_j - \\vec{r}_i|} = \\text{const}",
  ],
  simulationSteps: [
    "Initialize position and velocity vectors for celestial bodies in 3D space.",
    "Evaluate pairwise gravitational attraction forces between all bodies at each time step Δt.",
    "Symplectically integrate velocity and coordinate updates.",
    "Render real-time 3D orbital trails and verify energy conservation.",
  ],
  observations: [
    "Binary stellar system rotates about their common center of mass.",
    "Planet trajectory precesses non-linearly across orbital cycles.",
    "Total energy remains stable within symplectic numerical tolerance.",
  ],
};

const DEFAULT_METADATA: SimulationMetadata = {
  modelUsed: "universal-physics-engine",
  retries: 0,
  fallbackUsed: false,
  template: "dynamic",
  provider: "ai-synthesis",
};

function Index() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("orbit");
  const [resetSignal, setResetSignal] = useState(0);

  const [providerOptions, setProviderOptions] = useState<LLMProviderOptions>(() =>
    getStoredProviderOptions()
  );

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
    trailLength: 180,
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
      const res = await generateSimulation(prompt, providerOptions);
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
          `Generated via ${res.metadata.modelUsed} (${res.metadata.provider || "procedural engine"}).`
        );
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || "Failed to generate simulation. Please check your prompt or API key settings."
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
      if (!prev) return null;
      return {
        ...prev,
        parameters: { ...prev.parameters, ...newParams },
      };
    });
  };

  const handleUpdateGraphics = (updated: Partial<typeof graphics>) => {
    setGraphics((prev) => ({ ...prev, ...updated }));
  };

  const handleSaveProviderOptions = (newOptions: LLMProviderOptions) => {
    setProviderOptions(newOptions);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas text-foreground">
      {/* Provider & API Key Modal */}
      <ProviderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveProviderOptions}
      />

      {/* Top navbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <Atom className="size-4.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Physics<span className="text-primary">AI</span>
          </span>
          <span className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            universal · dynamic
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Provider / API Key Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Key className="size-3.5 text-primary" />
            <span className="hidden sm:inline">AI Settings:</span>
            <span className="font-mono text-primary capitalize">
              {providerOptions.provider || "gemini"}
            </span>
          </button>

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
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus className="size-3.5" />
            Reset Default
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
            <PromptBar
              onGenerate={handleGenerate}
              onOpenSettings={() => setIsSettingsOpen(true)}
              activeProvider={providerOptions.provider || "gemini"}
              isLoading={isLoading}
            />
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
                simulationType={simulation?.type || "dynamic"}
                metadata={metadata}
                dynamicDefinition={simulation?.dynamicDefinition}
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
