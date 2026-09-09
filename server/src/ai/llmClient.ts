import { env } from '../config/env';
import { logger } from '../config/logger';
import type { CellValue, SheetSpec, WorkbookSpec } from './spec';
import { fallbackSpec } from './fallbackSpec';
import {
  getAiProviderStatus,
  openaiConfigured,
  anthropicConfigured,
  resolveProviderOrder,
  type AiProviderId,
} from './providers';

export interface LlmResult {
  spec: WorkbookSpec;
  tokensUsed: number;
  costUsd: number;
  provider: AiProviderId;
}

function estimateCost(provider: AiProviderId, tokens: number): number {
  if (provider === 'anthropic') return Number((tokens * 0.000003).toFixed(6));
  if (provider === 'openai') return Number((tokens * 0.0000004).toFixed(6));
  return 0;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Model did not return JSON');
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function asCell(value: unknown): CellValue {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

function normalizeSheet(raw: unknown, index: number): SheetSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const sheet = raw as Record<string, unknown>;
  const headers = Array.isArray(sheet.headers)
    ? sheet.headers.map((h) => String(h ?? '')).filter(Boolean)
    : [];
  if (!headers.length) return null;
  const rows = Array.isArray(sheet.rows)
    ? sheet.rows
        .slice(0, 50)
        .map((row) => (Array.isArray(row) ? row.map(asCell) : []))
        .filter((row) => row.length)
    : [];
  const formulas = Array.isArray(sheet.formulas)
    ? sheet.formulas
        .map((f) => {
          const item = f as { cell?: string; formula?: string };
          if (!item?.cell || !item?.formula) return null;
          return { cell: String(item.cell), formula: String(item.formula).replace(/^=/, '') };
        })
        .filter(Boolean)
    : [];
  const currencyColumns = Array.isArray(sheet.currencyColumns)
    ? sheet.currencyColumns.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 1)
    : [];
  const columnWidths = Array.isArray(sheet.columnWidths)
    ? sheet.columnWidths.map((n) => Number(n) || 16)
    : undefined;

  return {
    name: String(sheet.name || `Sheet${index + 1}`)
      .replace(/[\\/?*[\]]/g, '')
      .slice(0, 31),
    headers,
    rows,
    formulas: formulas as SheetSpec['formulas'],
    columnWidths,
    freezeHeader: sheet.freezeHeader !== false,
    currencyColumns,
    conditionalRules: Array.isArray(sheet.conditionalRules)
      ? (sheet.conditionalRules as SheetSpec['conditionalRules'])
      : undefined,
  };
}

export function normalizeWorkbookSpec(raw: unknown, prompt: string): WorkbookSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const sheets = Array.isArray(value.sheets)
    ? value.sheets.map((s, i) => normalizeSheet(s, i)).filter(Boolean)
    : [];
  if (!sheets.length) return null;
  const title = String(value.title || 'Sheettomate workbook').slice(0, 120);
  return {
    title,
    description: String(value.description || prompt).slice(0, 2000),
    category: String(value.category || 'Finance'),
    industry: String(value.industry || 'Finance'),
    tags: Array.isArray(value.tags) ? value.tags.map((t) => String(t)).slice(0, 12) : ['ai-generated'],
    sheets: sheets as SheetSpec[],
  };
}

async function callOpenAi(system: string, user: string): Promise<{ text: string; tokens: number }> {
  if (!openaiConfigured()) throw new Error('OpenAI is not configured');
  const res = await fetchWithTimeout(
    `${env.openaiBaseUrl.replace(/\/$/, '')}/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.openaiModel,
        temperature: 0.25,
        max_tokens: env.aiMaxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `${user}\n\nRespond with a single JSON object only.` },
        ],
      }),
    },
    env.aiTimeoutMs,
  );
  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage?: { total_tokens?: number };
  };
  return { text: json.choices[0]?.message?.content ?? '', tokens: json.usage?.total_tokens ?? 0 };
}

async function callAnthropic(system: string, user: string): Promise<{ text: string; tokens: number }> {
  if (!anthropicConfigured()) throw new Error('Anthropic is not configured');
  const res = await fetchWithTimeout(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'x-api-key': env.anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.anthropicModel,
        max_tokens: env.aiMaxTokens,
        temperature: 0.25,
        system: `${system}\n\nYou must reply with a single valid JSON object and no markdown.`,
        messages: [{ role: 'user', content: `${user}\n\nReturn JSON only.` }],
      }),
    },
    env.aiTimeoutMs,
  );
  if (!res.ok) {
    throw new Error(`Anthropic error ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    content: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = json.content.find((part) => part.type === 'text')?.text ?? '';
  const tokens = (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0);
  return { text, tokens };
}

async function callProvider(
  provider: 'openai' | 'anthropic',
  system: string,
  user: string,
): Promise<{ text: string; tokens: number }> {
  const attempts = 2;
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return provider === 'anthropic' ? await callAnthropic(system, user) : await callOpenAi(system, user);
    } catch (error) {
      lastError = error;
      logger.warn(`${provider} attempt ${i + 1} failed`, { error });
      if (i + 1 < attempts) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${provider} failed`);
}

export async function generateWorkbookSpec(input: {
  system: string;
  user: string;
  prompt: string;
}): Promise<LlmResult> {
  const order = resolveProviderOrder();
  const errors: string[] = [];

  for (const provider of order) {
    if (provider === 'fallback') break;
    try {
      const { text, tokens } = await callProvider(provider, input.system, input.user);
      const normalized = normalizeWorkbookSpec(extractJson(text), input.prompt);
      if (!normalized) {
        throw new Error(`${provider} returned an invalid workbook spec`);
      }
      return {
        spec: normalized,
        tokensUsed: tokens,
        costUsd: estimateCost(provider, tokens),
        provider,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${provider}: ${message}`);
      logger.warn('LLM provider failed; trying next', { provider, message });
    }
  }

  if (!env.aiAllowFallback) {
    throw new Error(
      `AI generation failed and fallback is disabled. ${errors.join(' | ') || 'No providers available.'}`,
    );
  }

  logger.info('Using deterministic ExcelJS fallback', {
    reason: errors.length ? errors.join(' | ') : 'no live provider',
    status: getAiProviderStatus(),
  });
  return { spec: fallbackSpec(input.prompt), tokensUsed: 0, costUsd: 0, provider: 'fallback' };
}

/** Lightweight connectivity check for admin. */
export async function pingAiProvider(provider: 'openai' | 'anthropic'): Promise<{
  ok: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  message: string;
}> {
  const started = Date.now();
  try {
    if (provider === 'openai') {
      const { text } = await callOpenAi(
        'Reply with JSON only.',
        'Return {"ok":true,"service":"openai"} as JSON.',
      );
      extractJson(text);
      return {
        ok: true,
        provider,
        model: env.openaiModel,
        latencyMs: Date.now() - started,
        message: 'OpenAI responded successfully',
      };
    }
    const { text } = await callAnthropic(
      'Reply with JSON only.',
      'Return {"ok":true,"service":"anthropic"} as JSON.',
    );
    extractJson(text);
    return {
      ok: true,
      provider,
      model: env.anthropicModel,
      latencyMs: Date.now() - started,
      message: 'Anthropic responded successfully',
    };
  } catch (error) {
    return {
      ok: false,
      provider,
      model: provider === 'openai' ? env.openaiModel : env.anthropicModel,
      latencyMs: Date.now() - started,
      message: error instanceof Error ? error.message : 'Provider ping failed',
    };
  }
}
