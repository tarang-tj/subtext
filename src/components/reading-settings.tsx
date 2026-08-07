"use client";

/**
 * Reading controls.
 *
 * COGA is explicit that presentation belongs to the reader. Most tools that
 * advertise themselves as dyslexia-friendly instead pick one font and one size
 * on the reader's behalf and call that accessibility. These three controls are
 * the whole feature: bigger text, looser lines, and a ground that is not
 * glaring at you.
 *
 * State lives in an external store rather than an effect, because a script in
 * the document head already applies these before React mounts.
 */

import { useState, useSyncExternalStore } from "react";

import {
  getReadingPrefs,
  getReadingPrefsOnServer,
  setReadingPrefs,
  subscribeToReadingPrefs,
} from "@/lib/reading-prefs";

const SIZES = [
  { label: "Standard", value: "17px" },
  { label: "Large", value: "19px" },
  { label: "Largest", value: "22px" },
] as const;

const LEADINGS = [
  { label: "Standard", value: "1.65" },
  { label: "Loose", value: "1.9" },
] as const;

const THEMES = [
  { label: "Match my device", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
] as const;

const FIELDSET_STYLE = { border: 0, padding: 0, margin: "0 0 16px" } as const;
const ROW_STYLE = { display: "flex", gap: 8, flexWrap: "wrap" } as const;

export function ReadingSettings() {
  const prefs = useSyncExternalStore(
    subscribeToReadingPrefs,
    getReadingPrefs,
    getReadingPrefsOnServer,
  );
  const [open, setOpen] = useState(false);

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <button
        type="button"
        className="btn-quiet"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide reading settings" : "Reading settings"}
      </button>

      {open ? (
        <div style={{ marginTop: 16 }}>
          <p className="hint">
            These change how this page looks for you. They are saved on this device
            only.
          </p>

          <fieldset style={FIELDSET_STYLE}>
            <legend className="label">Text size</legend>
            <div style={ROW_STYLE}>
              {SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className="btn-quiet"
                  aria-pressed={prefs.size === s.value}
                  onClick={() => setReadingPrefs({ size: s.value })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset style={FIELDSET_STYLE}>
            <legend className="label">Space between lines</legend>
            <div style={ROW_STYLE}>
              {LEADINGS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  className="btn-quiet"
                  aria-pressed={prefs.leading === l.value}
                  onClick={() => setReadingPrefs({ leading: l.value })}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset style={{ ...FIELDSET_STYLE, margin: 0 }}>
            <legend className="label">Background</legend>
            <div style={ROW_STYLE}>
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className="btn-quiet"
                  aria-pressed={prefs.theme === t.value}
                  onClick={() => setReadingPrefs({ theme: t.value })}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
