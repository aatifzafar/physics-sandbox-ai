import { useState, type FormEvent } from "react";
import { Loader2, SendHorizonal, Settings2, Sparkles, Cpu } from "lucide-react";
import type { LLMProvider } from "../../lib/api";

const EXAMPLES = [
  "Three-body chaotic orbital dynamics",
  "Lorentz force on ions in helical magnetic field",
  "3D fluid vortex streamlines",
  "Quantum wave packet dispersion",
  "Double-slit wave interference",
  "Mass-spring harmonic oscillator",
  "Elastic billiard impact collision",
];

export function PromptBar({
  onGenerate,
  onOpenSettings,
  activeProvider = "gemini",
  isLoading = false,
}: {
  onGenerate?: (prompt: string) => void;
  onOpenSettings?: () => void;
  activeProvider?: LLMProvider | string;
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
        className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 card-shadow"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="size-5" />
        </span>

        <input
          id="physics-prompt"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask for ANY physics topic (e.g., 3-body gravity, Lorentz force, fluid vortex, black hole, optics)..."
          className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        <div className="flex shrink-0 items-center gap-2">
          {/* Quick Provider Badge & Settings Trigger */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="Configure AI Model & API Keys"
            className="flex h-9 items-center gap-1.5 rounded-md border border-border/80 bg-secondary/50 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-secondary hover:text-foreground"
          >
            <Cpu className="size-3.5 text-primary" />
            <span className="font-mono text-[11px] capitalize">{activeProvider}</span>
            <Settings2 className="size-3 text-muted-foreground" />
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
            {isLoading ? "Simulating..." : "Simulate"}
          </button>
        </div>
      </form>

      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground mr-1">Quick Topics:</span>
        {EXAMPLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setValue(s);
              onGenerate?.(s);
            }}
            className="rounded-full border border-border/80 bg-background/90 px-2.5 py-0.5 text-[11px] text-muted-foreground transition-all hover:border-primary/50 hover:bg-secondary hover:text-foreground active:scale-95"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
