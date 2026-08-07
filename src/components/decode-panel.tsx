"use client";

/**
 * Decode: work out what a received message might mean.
 *
 * Nothing here submits on its own. No timers, no debounced auto-analysis, no
 * surprise. The reader types, the reader presses the button, and the page
 * changes only then (WCAG 3.2.2, COGA).
 */

import { useRef, useState } from "react";

import type { DecodeResult } from "@/lib/types";
import { CitationReceipts, CorrectionNote, LikelihoodBar } from "@/components/result-parts";

const EXAMPLES = [
  {
    label: "We should hang out sometime",
    message: "hey! we should definitely hang out sometime :)",
    relationship: "Someone in my class I have talked to twice",
    situation: "They sent this at the end of a conversation about a group project",
  },
  {
    label: "Can we talk later?",
    message: "can we talk later",
    relationship: "My friend",
    situation: "We had a normal conversation yesterday. Nothing happened that I know of.",
  },
  {
    label: "A teacher's note",
    message:
      "I noticed your last two assignments came in right at the deadline. You might want to think about your approach going forward.",
    relationship: "My history teacher",
    situation: "Sent by email on a Friday afternoon",
  },
] as const;

const AMBIGUITY_COPY: Record<string, string> = {
  clear: "The text mostly pins this down.",
  ambiguous: "The text alone does not settle this.",
  "very ambiguous": "The text alone cannot settle this at all.",
};

export function DecodePanel() {
  const [message, setMessage] = useState("");
  const [relationship, setRelationship] = useState("");
  const [situation, setSituation] = useState("");
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  async function run(): Promise<void> {
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, relationship, situation }),
      });
      const data = (await response.json()) as DecodeResult & { error?: string };
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

  function loadExample(index: number): void {
    const example = EXAMPLES[index]!;
    setMessage(example.message);
    setRelationship(example.relationship);
    setSituation(example.situation);
    setResult(null);
    setError(null);
  }

  return (
    <section aria-labelledby="decode-heading">
      <h2 id="decode-heading">A message you received</h2>
      <p className="hint">
        Paste it exactly as it was sent. Subtext will show you what it could mean, how
        sure that is, and what you could ask to find out.
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
        <label className="label" htmlFor="decode-message">
          The message
        </label>
        <textarea
          id="decode-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Paste the message here"
        />

        <div style={{ marginTop: 16 }}>
          <label className="label" htmlFor="decode-relationship">
            Who sent it (optional)
          </label>
          <p className="hint">For example: my friend, my teacher, someone in my class.</p>
          <input
            id="decode-relationship"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <label className="label" htmlFor="decode-situation">
            What was happening (optional)
          </label>
          <p className="hint">
            Anything the message leaves out. The more of this there is, the less
            guessing anyone has to do.
          </p>
          <input
            id="decode-situation"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn"
          style={{ marginTop: 20 }}
          onClick={run}
          disabled={pending || message.trim().length === 0}
        >
          {pending ? "Working on it" : "Decode this message"}
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
        <div ref={resultRef}>
          <div className="card">
            <h3>Taken literally</h3>
            <p>{result.literalReading}</p>

            <h3>How much the text actually settles</h3>
            <p style={{ marginBottom: 8 }}>
              <strong>{AMBIGUITY_COPY[result.ambiguity] ?? result.ambiguity}</strong>
            </p>
            <p>{result.ambiguityExplanation}</p>
          </div>

          <div className="card">
            <h3>What it could mean</h3>
            {result.readings.map((reading, i) => (
              <div
                key={i}
                style={{
                  paddingBottom: 18,
                  marginBottom: 18,
                  borderBottom:
                    i === result.readings.length - 1 ? "none" : "2px solid var(--rule)",
                }}
              >
                <p style={{ marginBottom: 4 }}>
                  <strong>{reading.meaning}</strong>
                </p>
                <LikelihoodBar value={reading.likelihood} />
                <p style={{ marginBottom: 6 }}>{reading.whyPeopleWriteItThisWay}</p>
                <p style={{ margin: 0 }}>
                  <strong>What would tell you:</strong> {reading.whatWouldConfirmIt}
                </p>
              </div>
            ))}
          </div>

          {result.missingContext.length > 0 ? (
            <div className="card">
              <h3>What the sender left out</h3>
              <p className="hint">
                These are the things that would have made the message unambiguous. They
                are missing from the message, not from you.
              </p>
              <ul style={{ paddingLeft: 20 }}>
                {result.missingContext.map((item, i) => (
                  <li key={i} style={{ marginBottom: 8 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="card" style={{ borderColor: "var(--slate)" }}>
            <h3>You could just ask</h3>
            <p className="hint">
              No apology, no hedging. This is a normal thing to send.
            </p>
            <p
              style={{
                backgroundColor: "var(--slate-wash)",
                padding: 16,
                borderRadius: "var(--radius)",
                margin: 0,
              }}
            >
              {result.clarifyingQuestion}
            </p>
            <CitationReceipts ids={result.citationIds} />
            <CorrectionNote surface="decode" />
          </div>
        </div>
      ) : null}
    </section>
  );
}
