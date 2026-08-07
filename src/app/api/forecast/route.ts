import { NextResponse } from "next/server";

import { forecastMessage } from "@/lib/engines/forecast";
import { LlmError } from "@/lib/llm/provider";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 4000;

export async function POST(request: Request) {
  const limit = checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `That is more requests than this shared demo key allows in a minute. Try again in ${limit.retryAfterSeconds} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body was not valid JSON." }, { status: 400 });
  }

  const { message, audience } = (body ?? {}) as Record<string, unknown>;

  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Write the message you are planning to send, then press Forecast." },
      { status: 400 },
    );
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `That message is longer than ${MAX_MESSAGE_LENGTH} characters. Paste a shorter section.` },
      { status: 400 },
    );
  }

  try {
    const result = await forecastMessage({
      message,
      audience: typeof audience === "string" ? audience : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LlmError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("forecast failed", error);
    return NextResponse.json(
      { error: "Something broke on our side. Nothing you did caused this." },
      { status: 500 },
    );
  }
}
