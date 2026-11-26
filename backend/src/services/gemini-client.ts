import { env } from '../config/env.js';

/**
 * Ordered waterfall matching AI Studio rate-limit priority.
 * Automatically cools down models that hit 429 (30m) or 503/timeout (2m).
 */
export const GEMINI_MODEL_CHAIN = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
] as const;

const modelCooldownUntil = new Map<string, number>();

function isModelOnCooldown(model: string): boolean {
  const until = modelCooldownUntil.get(model);
  if (!until) return false;
  if (Date.now() >= until) {
    modelCooldownUntil.delete(model);
    return false;
  }
  return true;
}

function markModelCooldown(model: string, status: number): void {
  const durationMs = status === 429 ? 30 * 60 * 1000 : 2 * 60 * 1000;
  modelCooldownUntil.set(model, Date.now() + durationMs);
}

export async function callGeminiJson<T>(
  parts: Array<Record<string, unknown>>,
  options?: { temperature?: number; maxOutputTokens?: number; timeoutMs?: number },
): Promise<T> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing in backend/.env');
  }

  const activeModels = GEMINI_MODEL_CHAIN.filter((m) => !isModelOnCooldown(m));
  const candidates = activeModels.length > 0 ? activeModels : [...GEMINI_MODEL_CHAIN];

  let lastErr = 'Unknown Gemini error';
  for (const model of candidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const generationConfig: Record<string, unknown> = {
      temperature: options?.temperature ?? 0.35,
      maxOutputTokens: options?.maxOutputTokens ?? 4096,
    };
    if (model.startsWith('gemini-')) {
      generationConfig.responseMimeType = 'application/json';
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig,
        }),
        signal: AbortSignal.timeout(options?.timeoutMs ?? 25000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        lastErr = `${model} HTTP ${res.status}: ${errText.slice(0, 160)}`;
        if (res.status === 429 || res.status === 503 || res.status === 404 || res.status >= 500) {
          markModelCooldown(model, res.status);
          continue;
        }
        throw new Error(lastErr);
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string; thought?: boolean }> };
        }>;
      };
      const allParts = data.candidates?.[0]?.content?.parts ?? [];
      const answerParts = allParts.filter((p) => !p.thought && typeof p.text === 'string');
      const rawText =
        (answerParts.length > 0 ? answerParts : allParts)
          .map((p) => p.text ?? '')
          .join('')
          .trim() || '{}';
      let cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      }
      return JSON.parse(cleaned) as T;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      if (/timeout|fetch|network|abort/i.test(lastErr)) {
        markModelCooldown(model, 503);
      }
    }
  }

  throw new Error(`All Gemini models failed: ${lastErr}`);
}
