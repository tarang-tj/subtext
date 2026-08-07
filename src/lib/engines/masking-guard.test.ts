import { describe, expect, it } from "vitest";

import {
  addedContentWords,
  checkForMasking,
  profileDirectness,
} from "@/lib/engines/masking-guard";

/**
 * These tests are the actual promise of the product.
 *
 * Subtext tells a teenager it will never make their words sound softer than
 * they meant. That claim is only worth something if it survives a language
 * model that has been trained on a great deal of corporate email and would,
 * left alone, cheerfully turn "send me the dates" into "sorry, would you maybe
 * be able to send those dates when you get a chance?".
 */

describe("profileDirectness", () => {
  it("finds hedges, apologies and softeners", () => {
    const profile = profileDirectness(
      "Sorry, I think maybe you might want to send the dates if that's ok, I just wanted to check",
    );
    expect(profile.hedges).toContain("just");
    expect(profile.hedges).toContain("maybe");
    expect(profile.hedges).toContain("i think");
    expect(profile.hedges).toContain("you might want to");
    expect(profile.hedges).toContain("if that's ok");
    expect(profile.apologies).toContain("sorry");
    expect(profile.weakeners).toBeGreaterThanOrEqual(6);
  });

  it("reports a direct message as carrying no weakeners", () => {
    const profile = profileDirectness(
      "You did not send the dates. Send them today so I can finish my part.",
    );
    expect(profile.weakeners).toBe(0);
  });

  it("matches on word boundaries so 'just' does not fire inside 'adjust'", () => {
    expect(profileDirectness("Please adjust the margins").hedges).toHaveLength(0);
  });

  it("treats a curly apostrophe the same as a straight one", () => {
    expect(profileDirectness("Send it if that’s ok").hedges).toContain("if that's ok");
  });
});

describe("checkForMasking", () => {
  const direct = "You didn't send the dates. Send them today so I can finish my part.";

  it("blocks a revision that adds hedging", () => {
    const verdict = checkForMasking(
      direct,
      "Sorry to bother you! I was just wondering if you might be able to send the dates whenever you get a chance?",
    );
    expect(verdict.allowed).toBe(false);
    if (verdict.allowed) throw new Error("expected a block");
    expect(verdict.addedPhrases).toContain("just");
    expect(verdict.citationIds).toContain("cassidy2020");
    expect(verdict.reason).toMatch(/masking/i);
  });

  it("allows a revision that only adds explicit intent", () => {
    const verdict = checkForMasking(
      direct,
      "You didn't send the dates. Send them today so I can finish my part. To be clear, I am not annoyed, I just need the dates to plan.",
    );
    // "just" appears once in the addition, so this must still be caught: the
    // guard fails closed even when the intent of the revision is legitimate.
    expect(verdict.allowed).toBe(false);
  });

  it("allows added context that carries no weakening language", () => {
    const verdict = checkForMasking(
      direct,
      "You didn't send the dates. Send them today so I can finish my part. To be clear, I am not annoyed. I need the dates to plan my half.",
    );
    expect(verdict.allowed).toBe(true);
  });

  it("blocks the exact deletion a live model produced", () => {
    // Observed in production before the preservation rule existed. The model
    // added no hedge, so the weakener check cleared it, while it quietly
    // deleted the sentence stating what had happened.
    const verdict = checkForMasking(
      "You did not send the dates. Send them today so I can finish my part.",
      "Send the dates today so I can finish my part by the deadline.",
    );
    expect(verdict.allowed).toBe(false);
    if (verdict.allowed) throw new Error("expected a block");
    expect(verdict.reason).toMatch(/changed or removed/i);
  });

  it("blocks a revision that drops one sentence and keeps the rest", () => {
    const verdict = checkForMasking(
      "You did not send the dates. Send them today so I can finish my part.",
      "Send them today so I can finish my part.",
    );
    expect(verdict.allowed).toBe(false);
  });

  it("blocks a re-wording even when it adds no weakener and loses no meaning", () => {
    // Subtext offers to add context. It does not offer to rewrite people.
    // De-hedging someone's own words is still a rewrite, so it fails closed.
    const verdict = checkForMasking(
      "Sorry, I was just wondering if maybe you could send the dates?",
      "Please send the dates today.",
    );
    expect(verdict.allowed).toBe(false);
  });

  it("ignores punctuation and case when checking preservation", () => {
    const verdict = checkForMasking(
      "Send me the dates.",
      "send me the dates -- I need them to plan my half",
    );
    expect(verdict.allowed).toBe(true);
  });

  it("does not fire when the original already contained the hedge", () => {
    const original = "I think we should move the deadline.";
    const verdict = checkForMasking(original, "I think we should move the deadline to Friday.");
    expect(verdict.allowed).toBe(true);
  });

  it("counts a repeated hedge as added when it appears more often than before", () => {
    const verdict = checkForMasking(
      "I think this is wrong.",
      "I think this is wrong, and I think maybe we should check.",
    );
    expect(verdict.allowed).toBe(false);
  });

  it("blocks a politeness wrapper even when the core sentence is untouched", () => {
    const verdict = checkForMasking(
      "The instructions contradict each other. Which is right?",
      "Hope you're well! Quick question: the instructions contradict each other. Which is right? Thanks so much!",
    );
    expect(verdict.allowed).toBe(false);
    if (verdict.allowed) throw new Error("expected a block");
    expect(verdict.addedPhrases.length).toBeGreaterThan(0);
  });
});

describe("addedContentWords", () => {
  it("reports genuinely new content words and ignores stopwords", () => {
    const added = addedContentWords("Send the dates", "Send the dates for the trip");
    expect(added).toContain("trip");
    expect(added).not.toContain("the");
    expect(added).not.toContain("send");
  });

  it("returns nothing when a revision only reorders existing words", () => {
    expect(addedContentWords("send the dates today", "today send the dates")).toEqual([]);
  });
});
