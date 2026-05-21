import { promises as fs } from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import type { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export type PromptName = "extract" | "match" | "draft" | "risk";

type LlmJSONOptions<S extends z.ZodTypeAny> = {
  promptFile: PromptName;
  variables: Record<string, string>;
  model: string;
  schema: S;
  route: string;
  tenderId?: string | null;
  temperature?: number;
  maxTokens?: number;
};

export class RateLimitedError extends Error {
  retryAfterSeconds?: number;
  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = "RateLimitedError";
    this.retryAfterSeconds = retryAfter;
  }
}

export class LlmJSONParseError extends Error {
  raw: string;
  constructor(message: string, raw: string) {
    super(message);
    this.name = "LlmJSONParseError";
    this.raw = raw;
  }
}

const DEFAULTS: Record<PromptName, { temperature: number; maxTokens: number }> = {
  extract: { temperature: 0, maxTokens: 8000 },
  match: { temperature: 0, maxTokens: 4000 },
  draft: { temperature: 0.3, maxTokens: 2000 },
  risk: { temperature: 0, maxTokens: 4000 },
};

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set. Add it to .env.local.");
  }
  _client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_X_TITLE || "Tender Response Assistant",
    },
  });
  return _client;
}

const _promptCache = new Map<PromptName, string>();
async function loadPrompt(name: PromptName): Promise<string> {
  const cached = _promptCache.get(name);
  if (cached) return cached;
  const p = path.join(process.cwd(), "lib", "prompts", `${name}.md`);
  const text = await fs.readFile(p, "utf8");
  _promptCache.set(name, text);
  return text;
}

function substitute(template: string, variables: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(variables)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

/**
 * Strip markdown JSON fences and trailing commas defensively.
 * Models sometimes wrap output in ```json ... ``` despite explicit instructions.
 */
function sanitizeJsonString(raw: string): string {
  let s = raw.trim();

  // Strip code fences if present
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence && fence[1]) s = fence[1].trim();

  // Some models prefix with "Here is the JSON:" — trim until first { or [
  const firstBrace = s.search(/[\[{]/);
  if (firstBrace > 0) s = s.slice(firstBrace);

  // Trim after last closing brace/bracket
  const lastBrace = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (lastBrace >= 0 && lastBrace < s.length - 1) s = s.slice(0, lastBrace + 1);

  // Remove trailing commas before } or ]
  s = s.replace(/,(\s*[}\]])/g, "$1");

  return s;
}

async function logRequest(args: {
  route: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs: number;
  status: "ok" | "parse_error" | "rate_limited" | "error";
  error?: string;
  tenderId?: string | null;
}) {
  try {
    await supabaseServer().from("request_logs").insert({
      route: args.route,
      model: args.model,
      input_tokens: args.inputTokens ?? null,
      output_tokens: args.outputTokens ?? null,
      duration_ms: args.durationMs,
      status: args.status,
      error: args.error ?? null,
      tender_id: args.tenderId ?? null,
    });
  } catch {
    // Logging must never fail the request.
  }
}

async function callOnce(opts: {
  model: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  extraSystem?: string;
}): Promise<{ raw: string; inputTokens?: number; outputTokens?: number }> {
  const messages: { role: "system" | "user"; content: string }[] = [];
  if (opts.extraSystem) {
    messages.push({ role: "system", content: opts.extraSystem });
  }
  messages.push({ role: "user", content: opts.prompt });

  const resp = await client().chat.completions.create({
    model: opts.model,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    messages,
    response_format: { type: "json_object" },
  });

  const choice = resp.choices?.[0];
  const raw = choice?.message?.content ?? "";
  return {
    raw,
    inputTokens: resp.usage?.prompt_tokens,
    outputTokens: resp.usage?.completion_tokens,
  };
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Single entry point for every model call in this app.
 * Validates against a zod schema, retries once on JSON parse failure,
 * retries once after 5s on a 429, logs every attempt.
 */
export async function llmJSON<S extends z.ZodTypeAny>(
  opts: LlmJSONOptions<S>,
): Promise<z.infer<S>> {
  const defaults = DEFAULTS[opts.promptFile];
  const temperature = opts.temperature ?? defaults.temperature;
  const maxTokens = opts.maxTokens ?? defaults.maxTokens;

  const template = await loadPrompt(opts.promptFile);
  const prompt = substitute(template, opts.variables);

  const started = Date.now();
  let lastRaw = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const extraSystem =
        attempt === 1
          ? "Your previous response was not valid JSON. Return ONLY the JSON object, no other text."
          : undefined;

      const { raw, inputTokens, outputTokens } = await callOnce({
        model: opts.model,
        prompt,
        temperature,
        maxTokens,
        extraSystem,
      });

      lastRaw = raw;
      const cleaned = sanitizeJsonString(raw);

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch (err) {
        if (attempt === 0) {
          continue;
        }
        await logRequest({
          route: opts.route,
          model: opts.model,
          inputTokens,
          outputTokens,
          durationMs: Date.now() - started,
          status: "parse_error",
          error: (err as Error).message,
          tenderId: opts.tenderId,
        });
        throw new LlmJSONParseError("Model returned invalid JSON.", raw);
      }

      const validated = opts.schema.safeParse(parsed);
      if (!validated.success) {
        if (attempt === 0) {
          continue;
        }
        await logRequest({
          route: opts.route,
          model: opts.model,
          inputTokens,
          outputTokens,
          durationMs: Date.now() - started,
          status: "parse_error",
          error: validated.error.message,
          tenderId: opts.tenderId,
        });
        throw new LlmJSONParseError(
          `Model output failed schema validation: ${validated.error.message}`,
          raw,
        );
      }

      await logRequest({
        route: opts.route,
        model: opts.model,
        inputTokens,
        outputTokens,
        durationMs: Date.now() - started,
        status: "ok",
        tenderId: opts.tenderId,
      });
      return validated.data;
    } catch (err) {
      const status =
        (err as { status?: number })?.status ??
        (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        if (attempt === 0) {
          await sleep(5000);
          continue;
        }
        await logRequest({
          route: opts.route,
          model: opts.model,
          durationMs: Date.now() - started,
          status: "rate_limited",
          error: "429 from OpenRouter",
          tenderId: opts.tenderId,
        });
        throw new RateLimitedError(
          "Free-tier rate limit reached — try again in a minute.",
          60,
        );
      }
      if (err instanceof LlmJSONParseError) throw err;
      if (attempt === 1) {
        await logRequest({
          route: opts.route,
          model: opts.model,
          durationMs: Date.now() - started,
          status: "error",
          error: (err as Error).message,
          tenderId: opts.tenderId,
        });
        throw err;
      }
    }
  }

  // Defensive: loop guarantees a return or throw above.
  throw new LlmJSONParseError("Model call exhausted retries.", lastRaw);
}
