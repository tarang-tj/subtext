/**
 * The masking guard.
 *
 * Camouflaging is associated with thwarted belonging, and thwarted belonging is
 * associated with lifetime suicidality (Cassidy et al., 2020). A tool that
 * quietly rewrites a young autistic person's words to sound softer is not a
 * communication aid. It is a masking machine with a friendly interface.
 *
 * So this file, not the prompt, is where the promise is kept. A language model
 * can be asked nicely not to hedge and will hedge anyway. This runs on every
 * suggested revision before it is allowed near the screen, and it fails closed.
 *
 * The distinction it enforces:
 *   adding explicit intent  ("to be clear, I am not upset, I want the dates")
 *     -> self-advocacy. The user is saying MORE of what they mean. Allowed.
 *   adding hedges           ("I just sort of thought maybe...")
 *     -> masking. The user is saying LESS of what they mean. Blocked.
 */

import type { CitationId } from "@/lib/citations";

/** Phrases whose job is to make a claim land more weakly than it was meant. */
const HEDGES: readonly string[] = [
  "just",
  "maybe",
  "perhaps",
  "possibly",
  "sort of",
  "kind of",
  "kinda",
  "a bit",
  "a little",
  "somewhat",
  "i think",
  "i guess",
  "i feel like",
  "i could be wrong",
  "i might be wrong",
  "not sure if",
  "if that makes sense",
  "if that's ok",
  "if that is ok",
  "if you don't mind",
  "no worries if not",
  "no rush",
  "whenever you get a chance",
  "you might want to",
  "you may want to",
  "it might be worth",
  "would it be possible",
  "i was wondering if",
  "does that sound ok",
];

/** Apology openers used to buy permission for an ordinary request. */
const APOLOGIES: readonly string[] = [
  "sorry",
  "apologies",
  "i apologise",
  "i apologize",
  "sorry to bother",
  "sorry to be a pain",
  "forgive me",
  "hate to ask",
];

/** Warmth padding added to disguise the shape of a direct statement. */
const SOFTENERS: readonly string[] = [
  "hope you're well",
  "hope you are well",
  "hope this finds you",
  "thanks so much",
  "thank you so much",
  "really appreciate",
  "if you have a sec",
  "quick question",
  "super quick",
];

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "had",
  "has", "have", "he", "her", "his", "i", "if", "in", "is", "it", "its", "me",
  "my", "of", "on", "or", "our", "she", "so", "that", "the", "their", "them",
  "then", "there", "they", "this", "to", "was", "we", "were", "what", "when",
  "which", "who", "will", "with", "you", "your",
]);

export type DirectnessProfile = {
  hedges: string[];
  apologies: string[];
  softeners: string[];
  /** Total number of weakening devices found. Lower is more direct. */
  weakeners: number;
};

export type MaskingVerdict =
  | { allowed: true; profile: DirectnessProfile }
  | {
      allowed: false;
      profile: DirectnessProfile;
      /** The specific phrases the revision tried to add. */
      addedPhrases: string[];
      /** Plain-language explanation shown to the user. */
      reason: string;
      citationIds: CitationId[];
    };

function normalise(text: string): string {
  return text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

/** Counts occurrences of a phrase on word boundaries, so "just" does not match "adjust". */
function countPhrase(haystack: string, phrase: string): number {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = haystack.match(new RegExp(`\\b${escaped}\\b`, "g"));
  return matches ? matches.length : 0;
}

function collect(text: string, phrases: readonly string[]): string[] {
  const found: string[] = [];
  for (const phrase of phrases) {
    for (let i = 0; i < countPhrase(text, phrase); i += 1) found.push(phrase);
  }
  return found;
}

export function profileDirectness(text: string): DirectnessProfile {
  const t = normalise(text);
  const hedges = collect(t, HEDGES);
  const apologies = collect(t, APOLOGIES);
  const softeners = collect(t, SOFTENERS);
  return {
    hedges,
    apologies,
    softeners,
    weakeners: hedges.length + apologies.length + softeners.length,
  };
}

/** Content words present in the revision but absent from the original. */
export function addedContentWords(original: string, revision: string): string[] {
  const originalWords = new Set(
    normalise(original)
      .split(/[^a-z0-9']+/)
      .filter(Boolean),
  );
  const added = new Set<string>();
  for (const word of normalise(revision).split(/[^a-z0-9']+/)) {
    if (!word || STOPWORDS.has(word) || originalWords.has(word)) continue;
    added.add(word);
  }
  return [...added];
}

/**
 * Decide whether a suggested revision may be shown to the user.
 *
 * Fails closed: any net increase in weakening devices is a block, whatever else
 * the revision does. A revision that both adds context and adds hedging is
 * still a block, because the hedging is not necessary to add the context.
 */
export function checkForMasking(
  original: string,
  revision: string,
): MaskingVerdict {
  const before = profileDirectness(original);
  const after = profileDirectness(revision);

  const added: string[] = [];
  const tally = (
    beforeList: string[],
    afterList: string[],
  ): void => {
    const counts = new Map<string, number>();
    for (const phrase of beforeList) counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
    for (const phrase of afterList) {
      const remaining = counts.get(phrase) ?? 0;
      if (remaining > 0) counts.set(phrase, remaining - 1);
      else added.push(phrase);
    }
  };

  tally(before.hedges, after.hedges);
  tally(before.apologies, after.apologies);
  tally(before.softeners, after.softeners);

  if (added.length === 0) return { allowed: true, profile: after };

  const quoted = [...new Set(added)].map((p) => `"${p}"`).join(", ");
  return {
    allowed: false,
    profile: after,
    addedPhrases: [...new Set(added)],
    reason:
      `This rewrite added ${quoted}, which makes your point land more weakly than you wrote it. ` +
      `Subtext does not do that. Adding hedges to sound less direct is masking, and masking is ` +
      `associated with anxiety, depression and thwarted belonging. Your original wording is not the problem here.`,
    citationIds: ["cage2019", "cassidy2020", "hancock"],
  };
}
