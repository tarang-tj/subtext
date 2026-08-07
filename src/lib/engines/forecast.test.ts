import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The unit tests next door prove the guard rejects a softened string. These
 * prove the guard is actually WIRED: that a softening revision coming back from
 * a real model call is intercepted inside forecastMessage and never reaches the
 * caller.
 *
 * A guard that works in isolation but is bypassed by the code path that matters
 * is worse than no guard, because it reads as a kept promise in the README.
 */

const generateStructured = vi.hoisted(() => vi.fn());

vi.mock("@/lib/llm/provider", () => ({
  generateStructured,
  LlmError: class extends Error {},
}));

const { forecastMessage } = await import("@/lib/engines/forecast");

const DIRECT = "You didn't send the dates. Send them today so I can finish my part.";

function modelReturns(addContextText: string) {
  generateStructured.mockResolvedValue({
    restated: "You are asking for the dates today.",
    misreadings: [
      { whatTheyMightThink: "that you are angry", whatTriggersIt: "directness", likelihood: 60 },
    ],
    addContextVersion: { text: addContextText, whatItAdds: "context" },
    directnessNote: "You can send this as written.",
  });
}

beforeEach(() => {
  generateStructured.mockReset();
});

describe("forecastMessage masking interception", () => {
  it("suppresses a softened revision and reports the block instead", async () => {
    modelReturns(
      "Sorry to bother you! I was just wondering if you might be able to send the dates whenever you get a chance?",
    );

    const result = await forecastMessage({ message: DIRECT });

    // The softened text must not be reachable by the caller at all.
    expect(result.addContextVersion).toBeNull();
    expect(JSON.stringify(result)).not.toContain("Sorry to bother you");
    expect(result.maskingBlock).not.toBeNull();
    expect(result.maskingBlock?.addedPhrases).toContain("just");
  });

  it("passes through a revision that adds information without weakening", async () => {
    const withContext = `${DIRECT} To be clear, I am not annoyed. I need them to plan my half.`;
    modelReturns(withContext);

    const result = await forecastMessage({ message: DIRECT });

    expect(result.maskingBlock).toBeNull();
    expect(result.addContextVersion?.text).toBe(withContext);
  });

  it("offers no revision when the model returns the message unchanged", async () => {
    modelReturns(DIRECT);

    const result = await forecastMessage({ message: DIRECT });

    expect(result.addContextVersion).toBeNull();
    expect(result.maskingBlock).toBeNull();
  });

  it("always attaches the camouflaging citations to the result", async () => {
    modelReturns(DIRECT);
    const result = await forecastMessage({ message: DIRECT });
    expect(result.citationIds).toContain("cassidy2020");
    expect(result.citationIds).toContain("cage2019");
  });

  it("sorts misreadings by likelihood, highest first", async () => {
    generateStructured.mockResolvedValue({
      restated: "x",
      misreadings: [
        { whatTheyMightThink: "low", whatTriggersIt: "a", likelihood: 10 },
        { whatTheyMightThink: "high", whatTriggersIt: "b", likelihood: 90 },
        { whatTheyMightThink: "mid", whatTriggersIt: "c", likelihood: 50 },
      ],
      addContextVersion: { text: DIRECT, whatItAdds: "" },
      directnessNote: "ok",
    });

    const result = await forecastMessage({ message: DIRECT });
    expect(result.misreadings.map((m) => m.likelihood)).toEqual([90, 50, 10]);
  });
});
