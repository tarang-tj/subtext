"use client";

/**
 * Forecast: how a message you are about to send may land.
 *
 * The screen this produces has no "make it nicer" button, and that absence is
 * the point. When the model tries to smuggle one in, the masking guard catches
 * it server-side and the block is displayed here as a first-class result rather
 * than swallowed. A refusal the user can see is worth more than a promise in a
 * README.
 */

import { useState } from "react";

import type { ForecastResult } from "@/lib/types";
import { CitationReceipts, CorrectionNote, LikelihoodBar } from "@/components/result-parts";

const EXAMPLES = [
  {
    label: "Asking for the dates",
    message: "You didn't send the dates. Send them today so I can finish my part.",
    audience: "A classmate in my group project",
  },
  {
    label: "Turning down plans",
    message: "No. I'm not coming on Saturday, I'll be tired from the thing on Friday.",
    audience: "A friend",
  },
  {
    label: "Telling a teacher the instructions are unclear",
    message:
      "The instructions contradict each other. Question 3 says pick two sources and the rubric says four. Which is right?",
    audience: "My teacher",
  },
] as const;

export function ForecastPanel() {
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("");
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run(): Promise<void> {
    setPending(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const response = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, audience }),
      });
      const data = (await response.json()) as ForecastResult & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "That did not work. Try again.");
        return;
      }
      setResult(data);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function loadExample(index: number): void {
    const example = EXAMPLES[index]!;
    setMessage(example.message);
    setAudience(example.audience);
    setResult(null);
    setError(null);
  }

  return (
    <section aria-labelledby="forecast-heading">
      <h2 id="forecast-heading">A message you are about to send</h2>
      <p className="hint">
        Subtext will tell you how someone might misread it. It will not make it softer.
        Being clear is not the same as being rude.
      </p>

      <div className="card">
        <p className="label" style={{ marginBottom: 8 }}>
          Try one of these
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {EXAMPLES.map((e, i) => (
            <button
              key={e.label}
              type="button"
              className="btn-quiet"
              onClick={() => loadExample(i)}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <label className="label" htmlFor="forecast-message">
          What you want to send
        </label>
        <textarea
          id="forecast-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write it the way you would actually say it"
        />

        <div style={{ marginTop: 16 }}>
          <label className="label" htmlFor="forecast-audience">
            Who will read it (optional)
          </label>
          <input
            id="forecast-audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn"
          style={{ marginTop: 20 }}
          onClick={run}
          disabled={pending || message.trim().length === 0}
        >
          {pending ? "Working on it" : "Forecast how this lands"}
        </button>
        <p aria-live="polite" className="visually-hidden">
          {pending ? "Working on it." : result ? "Results are ready." : ""}
        </p>
      </div>

      {error ? (
        <div className="card" role="alert" style={{ borderColor: "var(--clay)" }}>
          <p style={{ margin: 0 }}>
            <strong>That did not work.</strong> {error}
          </p>
        </div>
      ) : null}

      {result ? (
        <div>
          <div className="card">
            <h3>What you are saying</h3>
            <p>{result.restated}</p>
          </div>

          <div className="card">
            <h3>How a reader might get it wrong</h3>
            <p className="hint">
              These are the reader&apos;s errors, not yours. Non-autistic readers
              misjudge autistic people and then rate them badly on the strength of
              their own misreading.
            </p>
            {result.misreadings.length === 0 ? (
              <p>Nothing here is likely to be misread. Send it.</p>
            ) : (
              result.misreadings.map((m, i) => (
                <div
                  key={i}
                  style={{
                    paddingBottom: 18,
                    marginBottom: 18,
                    borderBottom:
                      i === result.misreadings.length - 1
                        ? "none"
                        : "2px solid var(--rule)",
                  }}
                >
                  <p style={{ marginBottom: 4 }}>
                    <strong>They may read this as: {m.whatTheyMightThink}</strong>
                  </p>
                  <LikelihoodBar value={m.likelihood} />
                  <p style={{ margin: 0 }}>
                    <strong>Set off by:</strong> {m.whatTriggersIt}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="card" style={{ borderColor: "var(--sage)" }}>
            <h3>Send it as it is</h3>
            <p>{result.directnessNote}</p>
          </div>

          {result.maskingBlock ? (
            <div className="card" role="alert" style={{ borderColor: "var(--clay)" }}>
              <h3>Subtext refused a rewrite</h3>
              <p>{result.maskingBlock.reason}</p>
              <p style={{ marginBottom: 0 }}>
                <strong>Blocked because it added:</strong>{" "}
                {result.maskingBlock.addedPhrases.map((p) => `"${p}"`).join(", ")}
              </p>
            </div>
          ) : null}

          {result.addContextVersion ? (
            <div className="card">
              <h3>Optional: say the quiet part out loud</h3>
              <p className="hint">
                This version is not softer. It adds information that was in your head
                and not on the screen. Use it only if you want to.
              </p>
              <p
                style={{
                  backgroundColor: "var(--sage-wash)",
                  padding: 16,
                  borderRadius: "var(--radius)",
                }}
              >
                {result.addContextVersion.text}
              </p>
              <p>
                <strong>What it adds:</strong> {result.addContextVersion.whatItAdds}
              </p>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => copy(result.addContextVersion!.text)}
              >
                {copied ? "Copied" : "Copy this version"}
              </button>
            </div>
          ) : null}

          <div className="card">
            <CitationReceipts ids={result.citationIds} />
            <CorrectionNote surface="forecast" />
          </div>
        </div>
      ) : null}
    </section>
  );
}
