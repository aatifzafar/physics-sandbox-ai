import { GoogleGenAI, Type } from '@google/genai';
import { LLMProvider, LLMProviderOptions } from '../types/simulation.types.js';

export interface LLMRequestOptions {
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
  temperature?: number;
}

export interface LLMResponse {
  text: string;
  provider: string;
  model: string;
}

function cleanJsonString(text: string): string {
  let cleaned = text.trim();
  // Strip markdown code blocks
  if (cleaned.includes('```')) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }
  }

  // Extract outer-most JSON object if there is leading/trailing text
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Replace invalid single backslashes (common in LaTeX like \vec, \Delta, \frac, \sin, \sum)
  // except valid JSON escapes: \", \\, \/, \b, \f, \n, \r, \t
  cleaned = cleaned.replace(/\\([^"\\\/bfnrt])/g, (match, p1) => {
    // Check if it looks like a valid unicode escape \uXXXX
    if (p1 === 'u' && /^u[0-9a-fA-F]{4}/.test(match.slice(1))) {
      return match;
    }
    return '\\\\' + p1;
  });

  return cleaned;
}

export function parseRobustJson<T = any>(text: string): T {
  try {
    return JSON.parse(text);
  } catch {
    try {
      const sanitized = cleanJsonString(text);
      return JSON.parse(sanitized);
    } catch {
      // Fallback: replace any unescaped backslash with double backslash
      const ultraSanitized = text
        .replace(/\\/g, '\\\\')
        .replace(/\\\\"/g, '\\"')
        .replace(/\\\\n/g, '\\n')
        .replace(/\\\\r/g, '\\r')
        .replace(/\\\\t/g, '\\t');
      return JSON.parse(cleanJsonString(ultraSanitized));
    }
  }
}

export class MultiLLMService {
  /**
   * Determine the best available provider and credentials based on request options and environment
   */
  resolveProvider(options?: LLMProviderOptions): {
    provider: LLMProvider;
    apiKey: string;
    model: string;
    baseUrl?: string;
  } | null {
    // 1. Explicit user options
    if (options?.apiKey && options.provider) {
      const isAgentRouterKey = options.apiKey.startsWith('sk-blSek') || options.apiKey.includes('agentrouter');
      const resolvedBaseUrl =
        options.baseUrl && options.baseUrl !== 'http://localhost:11434/v1'
          ? options.baseUrl
          : isAgentRouterKey || options.provider === 'custom'
          ? 'https://agentrouter.org/v1'
          : options.baseUrl;

      return {
        provider: options.provider,
        apiKey: options.apiKey,
        model:
          options.model && options.model !== 'llama3' && options.model !== 'gpt-4o-mini'
            ? options.model
            : isAgentRouterKey
            ? 'deepseek-v4-flash'
            : options.model || this.getDefaultModel(options.provider),
        baseUrl: resolvedBaseUrl,
      };
    }

    // 2. Check for explicit individual API keys in environment or options
    if (options?.apiKey) {
      const provider = options.provider || 'openai';
      return {
        provider,
        apiKey: options.apiKey,
        model: options.model || this.getDefaultModel(provider),
        baseUrl: options.baseUrl || (provider === 'custom' ? 'https://agentrouter.org/v1' : undefined),
      };
    }

    if (process.env.OPENAI_API_KEY) {
      return {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        baseUrl: process.env.OPENAI_BASE_URL,
      };
    }

    if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('AQ.')) {
      return {
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      };
    }

    if (process.env.ANTHROPIC_API_KEY) {
      return {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      };
    }

    if (process.env.GROQ_API_KEY) {
      return {
        provider: 'groq',
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      };
    }

    if (process.env.DEEPSEEK_API_KEY) {
      return {
        provider: 'deepseek',
        apiKey: process.env.DEEPSEEK_API_KEY,
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      };
    }

    if (process.env.OPENROUTER_API_KEY) {
      return {
        provider: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
      };
    }

    return null;
  }

  getDefaultModel(provider: LLMProvider): string {
    switch (provider) {
      case 'gemini':
        return 'gemini-2.5-flash';
      case 'openai':
        return 'deepseek-v4-flash';
      case 'anthropic':
        return 'claude-3-5-sonnet-20241022';
      case 'groq':
        return 'llama-3.3-70b-versatile';
      case 'deepseek':
        return 'deepseek-chat';
      case 'openrouter':
        return 'google/gemini-2.5-flash';
      case 'custom':
        return 'deepseek-v4-flash';
      default:
        return 'gemini-2.5-flash';
    }
  }

  /**
   * Main entrypoint for generating structured completion across any configured provider
   */
  async generateCompletion(
    prompt: string,
    reqOptions: LLMRequestOptions = {},
    providerConfig?: LLMProviderOptions
  ): Promise<LLMResponse> {
    const resolved = this.resolveProvider(providerConfig);
    if (!resolved) {
      throw new Error(
        'No AI API key found. Please provide an API key for Gemini, OpenAI, Anthropic, Groq, DeepSeek, or OpenRouter.'
      );
    }

    const { provider, apiKey, model, baseUrl } = resolved;

    switch (provider) {
      case 'gemini':
        return this.generateGemini(prompt, apiKey, model, reqOptions);
      case 'openai':
        return this.generateOpenAICompatible(
          prompt,
          apiKey,
          model,
          baseUrl || 'https://api.openai.com/v1',
          'openai',
          reqOptions
        );
      case 'anthropic':
        return this.generateAnthropic(prompt, apiKey, model, reqOptions);
      case 'groq':
        return this.generateOpenAICompatible(
          prompt,
          apiKey,
          model,
          'https://api.groq.com/openai/v1',
          'groq',
          reqOptions
        );
      case 'deepseek':
        return this.generateOpenAICompatible(
          prompt,
          apiKey,
          model,
          'https://api.deepseek.com/v1',
          'deepseek',
          reqOptions
        );
      case 'openrouter':
        return this.generateOpenAICompatible(
          prompt,
          apiKey,
          model,
          'https://openrouter.ai/api/v1',
          'openrouter',
          reqOptions
        );
      case 'custom':
        return this.generateOpenAICompatible(
          prompt,
          apiKey,
          model,
          baseUrl || 'http://localhost:11434/v1',
          'custom',
          reqOptions
        );
      default:
        return this.generateGemini(prompt, apiKey, model, reqOptions);
    }
  }

  // -------------------------------------------------------------------------
  // GEMINI PROVIDER
  // -------------------------------------------------------------------------
  private async generateGemini(
    prompt: string,
    apiKey: string,
    modelName: string,
    options: LLMRequestOptions
  ): Promise<LLMResponse> {
    const candidateModels = Array.from(
      new Set([
        modelName,
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-2.5-pro',
        'gemini-1.5-pro',
      ].filter(Boolean))
    );

    const client = new GoogleGenAI({ apiKey });
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const config: any = {};
        if (options.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }
        if (options.responseMimeType) {
          config.responseMimeType = options.responseMimeType;
        }
        if (options.responseSchema) {
          config.responseSchema = options.responseSchema;
        }

        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config,
        });

        const text = response.text || '';
        if (text) {
          return {
            text,
            provider: 'gemini',
            model,
          };
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[LLM Service: Gemini] Model ${model} failed (${err.message})`);
        if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('PERMISSION_DENIED')) {
          throw err;
        }
      }
    }

    throw lastError || new Error('All Gemini candidate models failed to generate content');
  }

  // -------------------------------------------------------------------------
  // OPENAI & OPENAI-COMPATIBLE (Groq, DeepSeek, OpenRouter, Custom)
  // -------------------------------------------------------------------------
  private async generateOpenAICompatible(
    prompt: string,
    apiKey: string,
    model: string,
    baseUrl: string,
    providerName: string,
    options: LLMRequestOptions
  ): Promise<LLMResponse> {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const url = `${cleanBaseUrl}/chat/completions`;

    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const isAgentRouter = baseUrl.includes('agentrouter.org');

    const candidateModels = isAgentRouter
      ? ['deepseek-v4-flash', 'claude-opus-4-8', 'gpt-5.6-sol', 'glm-5.3']
      : Array.from(
          new Set([
            model,
            'deepseek-v4-flash',
            'gpt-4o-mini',
            'gpt-4o',
            'claude-opus-4-8',
          ].filter(Boolean))
        );

    let lastError: any = null;

    for (const candidateModel of candidateModels) {
      try {
        const payload: any = {
          model: candidateModel,
          messages,
          temperature: options.temperature ?? 0.3,
        };

        if (options.responseMimeType === 'application/json' || options.responseSchema) {
          payload.response_format = { type: 'json_object' };
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': 'Cline/3.0.0',
        };

        if (providerName === 'openrouter') {
          headers['HTTP-Referer'] = 'https://physicsai.local';
          headers['X-Title'] = 'PhysicsAI Lab';
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`[${providerName}] API Error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(`[${providerName}] ${data.error.message || JSON.stringify(data.error)}`);
        }

        const text = data.choices?.[0]?.message?.content || '';
        if (text) {
          return {
            text,
            provider: providerName,
            model: candidateModel,
          };
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[LLM Service: ${providerName}] Model ${candidateModel} failed: ${err.message}`);
      }
    }

    throw lastError || new Error(`[${providerName}] Failed to generate completion across candidate models`);
  }

  // -------------------------------------------------------------------------
  // ANTHROPIC CLAUDE PROVIDER
  // -------------------------------------------------------------------------
  private async generateAnthropic(
    prompt: string,
    apiKey: string,
    model: string,
    options: LLMRequestOptions
  ): Promise<LLMResponse> {
    const url = 'https://api.anthropic.com/v1/messages';

    const payload: any = {
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.4,
    };

    if (options.systemInstruction) {
      payload.system = options.systemInstruction;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[Anthropic] API Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    return {
      text,
      provider: 'anthropic',
      model,
    };
  }
}

export const llmService = new MultiLLMService();
