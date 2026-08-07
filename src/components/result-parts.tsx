"use client";

/**
 * Shared pieces of a result: the likelihood meter, the citation receipts, and
 * the disagreement control.
 *
 * The meter never encodes meaning in colour alone. It prints the number, draws
 * the bar, and says the word, so it survives colour blindness and a greyscale
 * screenshot.
 *
 * The disagreement control is the honest part of this project. Subtext was
 * built from published research rather than from sustained work with autistic
 * teenagers, and pretending otherwise would be its own small act of the thing
 * the research warns about. So every result says where it came from and invites
 * the reader to say it is wrong.
 */

import { useState } from "react";

import { getCitations } from "@/lib/citations";

export function LikelihoodBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const word = pct >= 66 ? "Likely" : pct >= 34 ? "Possible" : "Less likely";

  return (
    <div style={{ margin: "8px 0 10px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontWeight: 700,
          fontSize: "0.92rem",
        }}
      >
        <span>
          {word}, {pct} out of 100
        </span>
      </div>
      <div
        role="img"
        aria-label={`${word}, ${pct} out of 100`}
        style={{
          height: 10,
          borderRadius: 5,
          backgroundColor: "var(--rule)",
          overflow: "hidden",
          marginTop: 6,
          maxWidth: 320,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: "var(--slate)",
          }}
        />
      </div>
    </div>
  );
}

export function CitationReceipts({ ids }: { ids: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const citations = getCitations(ids);
  if (citations.length === 0) return null;

  return (
    <div style={{ marginTop: 20, borderTop: "2px solid var(--rule)", paddingTop: 14 }}>
      <button
        type="button"
        className="btn-quiet"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide the research behind this" : "Where this comes from"}
      </button>

      {open ? (
        <ul style={{ marginTop: 14, paddingLeft: 20 }}>
          {citations.map((c) => (
            <li key={c.id} style={{ marginBottom: 16 }}>
              <p style={{ margin: "0 0 4px" }}>
                <strong>
                  {c.authors} ({c.year}).
                </strong>{" "}
                {c.title}. <span style={{ color: "var(--ink-soft)" }}>{c.venue}.</span>
                {c.autisticAuthored ? (
                  <>
                    {" "}
                    <span
                      style={{
                        backgroundColor: "var(--sage-wash)",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      autistic-authored
                    </span>
                  </>
                ) : null}
              </p>
              <p style={{ margin: "0 0 4px", color: "var(--ink-soft)" }}>{c.finding}</p>
              <p style={{ margin: "0 0 4px" }}>
                <strong>What it changed here:</strong> {c.constraint}
              </p>
              <a href={c.url} target="_blank" rel="noreferrer noopener">
                Read the source
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function CorrectionNote({ surface }: { surface: "decode" | "forecast" }) {
  const [state, setState] = useState<"idle" | "open" | "saved">("idle");
  const [text, setText] = useState("");

  function save(): void {
    // Kept on the device. Subtext has no account, no database, and no analytics,
    // so this is a note to the person who builds the next version, exported by
    // the reader if and only if they choose to.
    try {
      const key = "subtext.corrections";
      const existing = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
      existing.push({ surface, text, at: new Date().toISOString() });
      window.localStorage.setItem(key, JSON.stringify(existing));
    } catch {
      // Nothing to recover. The acknowledgement below is still honest: we asked.
    }
    setState("saved");
  }

  if (state === "saved") {
    return (
      <p
        role="status"
        style={{
          marginTop: 16,
          padding: 14,
          backgroundColor: "var(--sage-wash)",
          borderRadius: "var(--radius)",
        }}
      >
        Saved on this device. Thank you. If you are testing this with the person who
        built it, the note is in your browser storage under subtext.corrections and
        you decide whether to hand it over.
      </p>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <p className="hint" style={{ marginBottom: 8 }}>
        This came from published research, not from lived experience. If it does not
        match yours, the research is what needs updating, not you.
      </p>

      {state === "idle" ? (
        <button type="button" className="btn-quiet" onClick={() => setState("open")}>
          This does not match my experience
        </button>
      ) : (
        <div>
          <label className="label" htmlFor={`correction-${surface}`}>
            What did it get wrong?
          </label>
          <textarea
            id={`correction-${surface}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ minHeight: 100 }}
          />
          <button
            type="button"
            className="btn"
            style={{ marginTop: 10 }}
            onClick={save}
            disabled={text.trim().length === 0}
          >
            Save this note
          </button>
        </div>
      )}
    </div>
  );
}
