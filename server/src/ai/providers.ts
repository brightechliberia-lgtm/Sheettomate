import { env } from '../config/env';

export type AiProviderId = 'openai' | 'anthropic' | 'fallback';
export type AiProviderMode = 'auto' | 'openai' | 'anthropic' | 'fallback';

export function getAiProviderMode(): AiProviderMode {
  const raw = (env.aiProvider || 'auto').toLowerCase();
  if (raw === 'openai' || raw === 'anthropic' || raw === 'fallback' || raw === 'auto') {
    return raw;
  }
  return 'auto';
}

export function openaiConfigured(): boolean {
  return Boolean(env.openaiApiKey?.trim());
}

export function anthropicConfigured(): boolean {
  return Boolean(env.anthropicApiKey?.trim());
}

/** Ordered providers to try for workbook generation. */
export function resolveProviderOrder(): AiProviderId[] {
  const mode = getAiProviderMode();
  if (mode === 'fallback') return ['fallback'];
  if (mode === 'openai') {
    return openaiConfigured() ? ['openai', 'fallback'] : ['fallback'];
  }
  if (mode === 'anthropic') {
    return anthropicConfigured() ? ['anthropic', 'fallback'] : ['fallback'];
  }
  // auto: prefer Anthropic when set, else OpenAI, else fallback
  const order: AiProviderId[] = [];
  if (anthropicConfigured()) order.push('anthropic');
  if (openaiConfigured()) order.push('openai');
  order.push('fallback');
  return order;
}

export function getAiProviderStatus() {
  const mode = getAiProviderMode();
  const openai = openaiConfigured();
  const anthropic = anthropicConfigured();
  const order = resolveProviderOrder();
  const active = order.find((p) => p !== 'fallback') ?? 'fallback';
  return {
    mode,
    active,
    order,
    allowFallback: env.aiAllowFallback,
    openai: {
      configured: openai,
      model: env.openaiModel,
      baseUrl: env.openaiBaseUrl,
    },
    anthropic: {
      configured: anthropic,
      model: env.anthropicModel,
    },
    timeoutMs: env.aiTimeoutMs,
    maxTokens: env.aiMaxTokens,
    live: active !== 'fallback',
    note:
      active === 'fallback'
        ? 'No LLM API key configured (or AI_PROVIDER=fallback). Generations use starter Excel templates.'
        : `Live generations use ${active}. Set OPENAI_API_KEY and/or ANTHROPIC_API_KEY on the API host.`,
  };
}
