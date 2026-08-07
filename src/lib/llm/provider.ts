/**
 * Provider-agnostic structured-JSON client.
 *
 * Subtext runs on a free-tier key so that a judge, a teacher, or a teenager can
 * clone the repo and have it working without a billing account. Groq is the
 * default for that reason alone; Gemini and Anthropic are supported behind the
 * same seam so the model underneath can be swapped without touching either of
 * the two engines that matter.
 *
 * This module is server-only, and that import on the next line is load-bearing:
 * it makes the build fail rather than silently shipping the key to a browser if
 * anyone ever imports this from a client component. No key is read anywhere
 * else, and no key is ever prefixed NEXT_PUBLIC_.
 */

import "server-only";

export type ProviderName = "groq" | "gemini" | "anthropic";

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

/** JSON Schema subset we hand to the provider to constrain output. */
export type JsonSchema = Record<string, unknown>;

/**
 * Note the absence of a temperature knob. Claude 5 rejects non-default sampling
 * parameters outright, and the Gemini interactions endpoint is only documented
 * to take model/input/response_format. Output shape is constrained by the JSON
 * schema instead, which is the guarantee that actually matters here.
 */
type GenerateArgs = {
  system: string;
  user: string;
  schema: JsonSchema;
};

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/interactions";
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";

/** Verified to support response_format json_schema. llama-3.3 does not. */
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";

export function activeProvider(): ProviderName {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  throw new LlmError(
    "No model key configured. Set GROQ_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY.",
    500,
    false,
  );
}

/**
 * Strip anything shaped like a credential out of text that is about to be
 * returned to a browser. Provider error bodies are echoed to the client to make
 * failures debuggable, and one badly behaved provider reflecting a request
 * header back in an error message would otherwise publish the key.
 */
export function redactSecrets(text: string): string {
  return text
    .replace(/\b(gsk|sk|sk-ant|AIza)[A-Za-z0-9_\-]{8,}/g, "[redacted-key]")
    .replace(/Bearer\s+[A-Za-z0-9._\-]{8,}/gi, "Bearer [redacted-key]");
}

/**
 * The raw REST response nests generated text under steps[].content[].text.
 * `output_text` is an SDK convenience that does not appear on the wire, so we
 * walk the documented shape and keep the flat key only as a fallback.
 */
function extractGeminiText(payload: unknown): string {
  const root = payload as {
    output_text?: unknown;
    steps?: Array<{ content?: Array<{ type?: string; text?: unknown }> }>;
  };

  const chunks: string[] = [];
  for (const step of root.steps ?? []) {
    for (const part of step.content ?? []) {
      if (typeof part.text === "string") chunks.push(part.text);
    }
  }
  if (chunks.length > 0) return chunks.join("");
  if (typeof root.output_text === "string") return root.output_text;

  throw new LlmError("Model returned no text content.", 502, true);
}

function extractGroqText(payload: unknown): string {
  const root = payload as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = root.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new LlmError("Model returned no text content.", 502, true);
  }
  return content;
}

function extractAnthropicText(payload: unknown): string {
  const root = payload as { content?: Array<{ type?: string; text?: unknown }> };
  const chunks = (root.content ?? [])
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string);
  if (chunks.length === 0) {
    throw new LlmError("Model returned no text content.", 502, true);
  }
  return chunks.join("");
}

/** Models sometimes wrap JSON in prose or a fenced block. Recover what we can. */
function parseJsonLoosely<T>(raw: string): T {
  const trimmed = raw.trim();
  const candidates = [trimmed];

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // try the next recovery strategy
    }
  }
  throw new LlmError("Model did not return valid JSON.", 502, true);
}

async function callGroq(args: GenerateArgs, signal: AbortSignal): Promise<string> {
  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY as string}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "subtext_result", schema: args.schema },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new LlmError(
      `Groq request failed (${response.status}). ${redactSecrets(detail).slice(0, 300)}`,
      response.status,
      response.status === 429 || response.status >= 500,
    );
  }
  return extractGroqText(await response.json());
}

async function callGemini(args: GenerateArgs, signal: AbortSignal): Promise<string> {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    signal,
    headers: {
      "x-goog-api-key": process.env.GEMINI_API_KEY as string,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
      input: `${args.system}\n\n---\n\n${args.user}`,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: args.schema,
      },
      // Only fields verified against the current API reference are sent. An
      // unrecognised key here is a 400 on the primary path, and determinism is
      // not worth that trade on a schema-constrained call.
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new LlmError(
      `Gemini request failed (${response.status}). ${redactSecrets(detail).slice(0, 300)}`,
      response.status,
      response.status === 429 || response.status >= 500,
    );
  }
  return extractGeminiText(await response.json());
}

async function callAnthropic(args: GenerateArgs, signal: AbortSignal): Promise<string> {
  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    signal,
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL,
      // Claude 5 returns 400 on any non-default sampling parameter, so
      // temperature/top_p/top_k are deliberately absent. Adaptive thinking is
      // on by default and eats the budget, so max_tokens is generous rather
      // than tight: a reasoning model on a small budget returns nothing at all
      // rather than returning less.
      max_tokens: 4096,
      system: `${args.system}\n\nReply with JSON matching this schema and nothing else:\n${JSON.stringify(args.schema)}`,
      messages: [{ role: "user", content: args.user }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new LlmError(
      `Anthropic request failed (${response.status}). ${redactSecrets(detail).slice(0, 300)}`,
      response.status,
      response.status === 429 || response.status >= 500,
    );
  }
  return extractAnthropicText(await response.json());
}

/**
 * Generate a structured object, retrying once on a retryable failure.
 * Callers validate the shape themselves; this guarantees only valid JSON.
 */
export async function generateStructured<T>(args: GenerateArgs): Promise<T> {
  const provider = activeProvider();
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const raw =
        provider === "groq"
          ? await callGroq(args, controller.signal)
          : provider === "gemini"
            ? await callGemini(args, controller.signal)
            : await callAnthropic(args, controller.signal);
      return parseJsonLoosely<T>(raw);
    } catch (error) {
      lastError = error;
      const retryable = error instanceof LlmError ? error.retryable : false;
      if (!retryable || attempt === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 600));
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError instanceof LlmError) throw lastError;
  throw new LlmError(
    lastError instanceof Error ? lastError.message : "Model call failed.",
    502,
    false,
  );
}
