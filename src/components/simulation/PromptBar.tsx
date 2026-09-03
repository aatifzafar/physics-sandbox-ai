import { useState, type FormEvent } from "react";
import { Loader2, SendHorizonal, Settings2, Sparkles } from "lucide-react";

const EXAMPLES = [
  "Double-slit experiment",
  "Electron drift in wire",
  "Refraction of light",
  "Projectile motion",
  "Pendulum motion",
  "Spring-mass system",
  "Colliding spheres",
];

export function PromptBar({
  onGenerate,
  isLoading = false,
}: {
  onGenerate?: (prompt: string) => void;
  isLoading?: boolean;
}) {
  const [value, setValue] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isLoading) return;
    onGenerate?.(value.trim());
  };

  return (
    <div className="pointer-events-auto w-full max-w-3xl">
      <form
        onSubmit={submit}
        className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 card-shadow"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-5" />
        </span>

        <input
          id="physics-prompt"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Describe the physics simulation you want to create..."
          className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Simulation settings"
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Settings2 className="size-4" />
          </button>

          <button
            type="submit"
            disabled={isLoading || !value.trim()}
            className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizonal className="size-4" />
            )}
            {isLoading ? "Generating..." : "Generate"}
          </button>
        </div>
      </form>

      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">Examples:</span>
        {EXAMPLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setValue(s)}
            className="rounded-full border border-border bg-background px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
