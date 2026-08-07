/**
 * Result shapes shared by the server engines and the browser.
 *
 * These live apart from the engines on purpose. The engines pull in the model
 * client, which is marked server-only, and a stray import from a client
 * component would turn that into a build error at an awkward moment.
 */

import type { CitationId } from "@/lib/citations";

export type Reading = {
  meaning: string;
  likelihood: number;
  whyPeopleWriteItThisWay: string;
  whatWouldConfirmIt: string;
};

export type AmbiguityLevel = "clear" | "ambiguous" | "very ambiguous";

export type DecodeResult = {
  literalReading: string;
  ambiguity: AmbiguityLevel;
  ambiguityExplanation: string;
  readings: Reading[];
  missingContext: string[];
  clarifyingQuestion: string;
  citationIds: CitationId[];
};

export type Misreading = {
  whatTheyMightThink: string;
  whatTriggersIt: string;
  likelihood: number;
};

export type ForecastResult = {
  restated: string;
  misreadings: Misreading[];
  addContextVersion: { text: string; whatItAdds: string } | null;
  maskingBlock: { reason: string; addedPhrases: string[] } | null;
  directnessNote: string;
  citationIds: CitationId[];
};
