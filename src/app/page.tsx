"use client";

import { useState } from "react";

import { DecodePanel } from "@/components/decode-panel";
import { ForecastPanel } from "@/components/forecast-panel";
import { ReadingSettings } from "@/components/reading-settings";

type Surface = "decode" | "forecast";

export default function Home() {
  const [surface, setSurface] = useState<Surface>("decode");

  return (
    <main className="shell">
      <a href="#main-tabs" className="skip-link">
        Skip to the tool
      </a>

      <header style={{ marginBottom: 28 }}>
        <h1>Subtext</h1>
        <p style={{ fontSize: "1.1rem" }}>
          Texts, DMs and group chats strip out the tone, timing and shared situation
          that make a message make sense. Subtext puts some of that back, in both
          directions.
        </p>
        <p className="hint">
          Built for the IncludAI hackathon. Nothing you type is stored on a server, and
          there is no account, no score, and nothing to get better at.
        </p>
      </header>

      <ReadingSettings />

      <div
        id="main-tabs"
        role="tablist"
        aria-label="Which direction do you need"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}
      >
        <button
          type="button"
          role="tab"
          className="btn-quiet"
          aria-selected={surface === "decode"}
          onClick={() => setSurface("decode")}
        >
          A message you received
        </button>
        <button
          type="button"
          role="tab"
          className="btn-quiet"
          aria-selected={surface === "forecast"}
          onClick={() => setSurface("forecast")}
        >
          A message you are sending
        </button>
      </div>

      {surface === "decode" ? <DecodePanel /> : <ForecastPanel />}

      <footer
        style={{
          marginTop: 56,
          paddingTop: 24,
          borderTop: "2px solid var(--rule)",
          color: "var(--ink-soft)",
        }}
      >
        <h2 style={{ fontSize: "1.05rem" }}>What this will not do</h2>
        <p>
          Subtext will not rewrite your words to sound softer, gentler, or more
          apologetic. Camouflaging is associated with anxiety, depression and thwarted
          belonging, so a tool that quietly trains you to mask is not a neutral one.
          When the model behind Subtext tries to hedge your message anyway, the server
          blocks it and shows you what it tried to add.
        </p>
        <p>
          The premise is not that autistic people cannot read subtext. Given decent
          context, they read indirect requests about as accurately as anyone. The
          premise is that text throws that context away.
        </p>
      </footer>
    </main>
  );
}
