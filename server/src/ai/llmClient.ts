import { env } from '../config/env';
import { logger } from '../config/logger';
import type { WorkbookSpec } from './spec';
import { fallbackSpec } from './fallbackSpec';

export interface LlmResult {
  spec: WorkbookSpec;
  tokensUsed: number;
  costUsd: number;
  provider: 'openai' | 'anthropic' | 'fallback';
}

function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('Model did not return JSON');
  }
  return JSON.parse(text.slice(start, end + 1));
}

function asSpec(raw: unknown, prompt: string): WorkbookSpec {
  const value = raw as WorkbookSpec;
  if (!value?.title || !Array.isArray(value.sheets) || value.sheets.length === 0) {
    return fallbackSpec(prompt);
  }
  return value;
}

async function callOpenAi(system: string, user: string): Promise<{ text: string; tokens: number }> {
  const res = await fetch(`${env.openaiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.openaiModel,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage?: { total_tokens?: number };
  };
  return { text: json.choices[0]?.message?.content ?? '', tokens: json.usage?.total_tokens ?? 0 };
}

async function callAnthropic(system: string, user: string): Promise<{ text: string; tokens: number }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.anthropicModel,
      max_tokens: 4000,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    content: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = json.content.find((part) => part.type === 'text')?.text ?? '';
  const tokens = (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0);
  return { text, tokens };
}

export async function generateWorkbookSpec(input: {
  system: string;
  user: string;
  prompt: string;
}): Promise<LlmResult> {
  try {
    if (env.anthropicApiKey) {
      const { text, tokens } = await callAnthropic(input.system, input.user);
      return {
        spec: asSpec(extractJson(text), input.prompt),
        tokensUsed: tokens,
        costUsd: tokens * 0.000003,
        provider: 'anthropic',
      };
    }
    if (env.openaiApiKey) {
      const { text, tokens } = await callOpenAi(input.system, input.user);
      return {
        spec: asSpec(extractJson(text), input.prompt),
        tokensUsed: tokens,
        costUsd: tokens * 0.0000004,
        provider: 'openai',
      };
    }
  } catch (error) {
    logger.warn('LLM generation failed; using fallback workbook', { error });
  }

  logger.info('Using deterministic ExcelJS fallback (no LLM key or parse failure)');
  return { spec: fallbackSpec(input.prompt), tokensUsed: 0, costUsd: 0, provider: 'fallback' };
}
