import { useState, useEffect } from "react";
import {
  Key,
  Server,
  Sparkles,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import {
  type LLMProvider,
  type LLMProviderOptions,
  getStoredProviderOptions,
  setStoredProviderOptions,
} from "../../lib/api";

interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: LLMProviderOptions) => void;
}

const PROVIDER_INFO: Record<
  LLMProvider,
  {
    name: string;
    description: string;
    keyPlaceholder: string;
    getKeyUrl: string;
    models: string[];
    defaultModel: string;
  }
> = {
  gemini: {
    name: "Google Gemini",
    description: "Ultra-fast multimodal model family by Google AI Studio.",
    keyPlaceholder: "AIzaSy...",
    getKeyUrl: "https://aistudio.google.com/app/apikey",
    models: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-pro"],
    defaultModel: "gemini-2.5-flash",
  },
  openai: {
    name: "OpenAI",
    description: "Industry-leading intelligence with GPT-4o and o3-mini.",
    keyPlaceholder: "sk-proj-...",
    getKeyUrl: "https://platform.openai.com/api-keys",
    models: ["gpt-4o-mini", "gpt-4o", "o3-mini", "gpt-4-turbo"],
    defaultModel: "gpt-4o-mini",
  },
  anthropic: {
    name: "Anthropic Claude",
    description: "Advanced reasoning with Claude 3.5 Sonnet & Claude 3.7 Sonnet.",
    keyPlaceholder: "sk-ant-...",
    getKeyUrl: "https://console.anthropic.com/settings/keys",
    models: ["claude-3-5-sonnet-20241022", "claude-3-7-sonnet-20250219", "claude-3-haiku-20240307"],
    defaultModel: "claude-3-5-sonnet-20241022",
  },
  groq: {
    name: "Groq (Ultra-Fast LPU)",
    description: "Sub-second inference for open models (Llama 3.3 70B).",
    keyPlaceholder: "gsk_...",
    getKeyUrl: "https://console.groq.com/keys",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    defaultModel: "llama-3.3-70b-versatile",
  },
  deepseek: {
    name: "DeepSeek",
    description: "High-reasoning DeepSeek-V3 and DeepSeek-R1 models.",
    keyPlaceholder: "sk-...",
    getKeyUrl: "https://platform.deepseek.com/api_keys",
    models: ["deepseek-chat", "deepseek-reasoner"],
    defaultModel: "deepseek-chat",
  },
  openrouter: {
    name: "OpenRouter",
    description: "Universal gateway to 100+ open and proprietary models.",
    keyPlaceholder: "sk-or-v1-...",
    getKeyUrl: "https://openrouter.ai/keys",
    models: ["google/gemini-2.5-flash", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "deepseek/deepseek-chat"],
    defaultModel: "google/gemini-2.5-flash",
  },
  custom: {
    name: "Custom / Agent Router / Local",
    description: "Agent Router (https://agentrouter.org/v1), Ollama, LM Studio, or vLLM.",
    keyPlaceholder: "sk-blSek... or custom key",
    getKeyUrl: "https://agentrouter.org",
    models: ["deepseek-v4-flash", "claude-opus-4-8", "gpt-5.6-sol", "glm-5.3", "llama3", "mistral"],
    defaultModel: "deepseek-v4-flash",
  },
};

export function ProviderSettingsModal({
  isOpen,
  onClose,
  onSave,
}: ProviderSettingsModalProps) {
  const [provider, setProvider] = useState<LLMProvider>("custom");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredProviderOptions();
      const initialProvider = stored.provider || "custom";
      setProvider(initialProvider);
      setApiKey(stored.apiKey || "sk-blSekDI7Ylra64k9eu38bBghPUZueGe5S3ju62iKz6cxTYrN");
      setModel(stored.model || PROVIDER_INFO[initialProvider]?.defaultModel || "deepseek-v4-flash");
      setBaseUrl(stored.baseUrl || (initialProvider === "custom" ? "https://agentrouter.org/v1" : ""));
      setSavedSuccess(false);
    }
  }, [isOpen]);

  const handleProviderChange = (newProvider: LLMProvider) => {
    setProvider(newProvider);
    setModel(PROVIDER_INFO[newProvider].defaultModel);
    if (newProvider === "custom" && !baseUrl) {
      setBaseUrl("https://agentrouter.org/v1");
    }
  };

  const handleSave = () => {
    const finalBaseUrl =
      provider === "custom"
        ? (baseUrl.trim() || "https://agentrouter.org/v1")
        : undefined;

    const options: LLMProviderOptions = {
      provider,
      apiKey: apiKey.trim() || "sk-blSekDI7Ylra64k9eu38bBghPUZueGe5S3ju62iKz6cxTYrN",
      model: model.trim() || PROVIDER_INFO[provider].defaultModel,
      baseUrl: finalBaseUrl,
    };
    setStoredProviderOptions(options);
    onSave(options);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleClearKey = () => {
    setApiKey("");
    const options: LLMProviderOptions = {
      provider,
      apiKey: "",
      model: PROVIDER_INFO[provider].defaultModel,
    };
    setStoredProviderOptions(options);
    onSave(options);
  };

  if (!isOpen) return null;

  const currentInfo = PROVIDER_INFO[provider];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl text-foreground">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Key className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                AI Provider & API Key Settings
              </h2>
              <p className="text-xs text-muted-foreground">
                Run dynamic simulations with any LLM provider or offline procedural engine
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Provider Selector */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Select AI Provider
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(PROVIDER_INFO) as LLMProvider[]).map((pKey) => {
                const info = PROVIDER_INFO[pKey];
                const isSelected = provider === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => handleProviderChange(pKey)}
                    className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-border/80 hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <span className="text-xs font-semibold">{info.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate w-full">
                      {info.defaultModel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider Description */}
          <div className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>{currentInfo.description}</span>
            {currentInfo.getKeyUrl && (
              <a
                href={currentInfo.getKeyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline shrink-0 ml-2"
              >
                Get Key
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-foreground">
                {currentInfo.name} API Key
              </label>
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="text-[11px] text-destructive hover:underline"
                >
                  Clear Key
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={currentInfo.keyPlaceholder}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-2 focus-visible:outline-primary"
              />
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <span>Stored locally in your browser. Never persisted to external servers.</span>
            </div>
          </div>

          {/* Custom Base URL (if Custom endpoint) */}
          {provider === "custom" && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                API Base URL (OpenAI Compatible)
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:11434/v1"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-2 focus-visible:outline-primary"
              />
            </div>
          )}

          {/* Model Name Selection */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Model Name / Preset
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={currentInfo.defaultModel}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {currentInfo.models.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModel(m)}
                  className={`rounded border px-2 py-0.5 font-mono text-[10px] transition-colors ${
                    model === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <div className="text-[11px] text-muted-foreground">
            {apiKey ? "Using custom API key" : "Using server environment / fallback"}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {savedSuccess ? (
                <>
                  <Check className="size-3.5" />
                  Saved!
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
