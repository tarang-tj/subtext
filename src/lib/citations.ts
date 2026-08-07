/**
 * The evidence spine.
 *
 * Every claim Subtext makes to a user must point at an entry here. If a design
 * decision cannot cite one of these, it does not ship. The autistic community
 * has been on the receiving end of a great deal of confident, ungrounded advice
 * about how it communicates; this file is the refusal to add more.
 */

export type Citation = {
  id: string;
  authors: string;
  year: number;
  title: string;
  venue: string;
  url: string;
  /** What this source actually establishes, in plain language. */
  finding: string;
  /** The concrete product decision this source forced. */
  constraint: string;
  /** Written by autistic authors or an autistic-led organisation. */
  autisticAuthored: boolean;
};

export const CITATIONS = {
  milton2012: {
    id: "milton2012",
    authors: "Milton, D.",
    year: 2012,
    title:
      "On the ontological status of autism: the 'double empathy problem'",
    venue: "Disability & Society, 27(6), 883-887",
    url: "https://www.tandfonline.com/doi/full/10.1080/09687599.2012.710008",
    finding:
      "Breakdowns between autistic and non-autistic people are a mutual failure of understanding, not a one-sided deficit in autistic empathy.",
    constraint:
      "Subtext translates in both directions. It never positions the autistic user as the party who needs correcting.",
    autisticAuthored: true,
  },

  crompton2020: {
    id: "crompton2020",
    authors: "Crompton, C. J., Ropar, D., Evans-Williams, C. V. M., Flynn, E. G., Fletcher-Watson, S.",
    year: 2020,
    title: "Autistic peer-to-peer information transfer is highly effective",
    venue: "Autism, 24(7)",
    url: "https://journals.sagepub.com/doi/10.1177/1362361320919286",
    finding:
      "Information passed down an all-autistic chain survives as well as it does down an all-non-autistic chain. Only mixed chains degrade.",
    constraint:
      "The failure is neurotype mismatch, not autistic communication. Subtext never describes the user's style as the thing that broke.",
    autisticAuthored: false,
  },

  frost2024: {
    id: "frost2024",
    authors: "Frost, F., Nagano, M., Zane, E.",
    year: 2024,
    title:
      "Autistic and non-autistic adults use discourse context to determine a speaker's intention to request",
    venue: "PMC11897084",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11897084/",
    finding:
      "Given adequate context, autistic adults read indirect requests as accurately as non-autistic adults do.",
    constraint:
      "Subtext exists because text strips context, not because autistic people cannot read subtext. When a message is genuinely underspecified it says so instead of inventing an answer.",
    autisticAuthored: false,
  },

  sheppard2019: {
    id: "sheppard2019",
    authors: "Sheppard, E., Webb, S., Wilkinson, H.",
    year: 2019,
    title:
      "Is There a Link Between Autistic People Being Perceived Unfavorably and Having a Mind That Is Difficult to Read?",
    venue: "Journal of Autism and Developmental Disorders, 49(10)",
    url: "https://link.springer.com/article/10.1007/s10803-019-04101-1",
    finding:
      "Non-autistic observers misread autistic people's reactions, then rate them unfavourably on the basis of their own misreading.",
    constraint:
      "Forecast reports the reader's likely error as the reader's error. It does not ask the user to perform differently to prevent it.",
    autisticAuthored: false,
  },

  cage2019: {
    id: "cage2019",
    authors: "Cage, E., Troxell-Whitman, Z.",
    year: 2019,
    title:
      "Understanding the Reasons, Contexts and Costs of Camouflaging for Autistic Adults",
    venue: "Journal of Autism and Developmental Disorders, 49(5), 1899-1911",
    url: "https://link.springer.com/article/10.1007/s10803-018-03878-x",
    finding:
      "70% of autistic adults surveyed camouflage consistently, and camouflaging is associated with anxiety, depression and stress.",
    constraint:
      "Subtext will not rewrite a message to sound less direct. The masking guard blocks it in code, not in a prompt.",
    autisticAuthored: false,
  },

  cassidy2020: {
    id: "cassidy2020",
    authors: "Cassidy, S. A., Gould, K., Townsend, E., et al.",
    year: 2020,
    title:
      "Is camouflaging autistic traits associated with suicidal thoughts and behaviours?",
    venue: "Journal of Autism and Developmental Disorders, 50(10)",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6751138/",
    finding:
      "Camouflaging is associated with thwarted belonging, which is associated with lifetime suicidality.",
    constraint:
      "This is why the masking guard is a hard block and not a warning the user can dismiss by habit.",
    autisticAuthored: false,
  },

  josyfon2023: {
    id: "josyfon2023",
    authors: "Josyfon, E., Spain, D., Blackmore, C., Murphy, D., Oakley, B.",
    year: 2023,
    title:
      "Alexithymia in Adult Autism Clinic Service-Users: Relationships with Sensory Processing Differences and Mental Health",
    venue: "Healthcare (Basel), 11(24), 3114",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10742835/",
    finding:
      "66.3% of autistic clinic service-users met the clinical threshold for alexithymia, against roughly 10% in the general population.",
    constraint:
      "Subtext never opens with 'how did that make you feel?'. It offers concrete inferences about the message instead of asking the user to introspect.",
    autisticAuthored: false,
  },

  hancock: {
    id: "hancock",
    authors: "Hancock, S., Reframing Autism",
    year: 2023,
    title: "Autistic Communication Differences: A Primer",
    venue: "Reframing Autism (autistic-led)",
    url: "https://reframingautism.org.au/autistic-communication-differences-a-primer/",
    finding:
      "Autistic people tend to value direct exchange of information and are often misconstrued as rude when no rudeness was intended.",
    constraint:
      "Directness is treated throughout as a feature to protect, never a problem to fix.",
    autisticAuthored: true,
  },

  therapistNDC: {
    id: "therapistNDC",
    authors: "Therapist Neurodiversity Collective",
    year: 2022,
    title: "Training Social Skills is Dehumanizing",
    venue: "Therapist Neurodiversity Collective",
    url: "https://therapistndc.org/training-social-skills-is-dehumanizing-part-1/",
    finding:
      "Social skills programmes reinforce masking by rewarding suppression of natural autistic communication, and measure success by the provider's satisfaction rather than the autistic person's wellbeing.",
    constraint:
      "Subtext has no score, no streak, and no measure of improvement. There is nothing here to get better at.",
    autisticAuthored: false,
  },

  bda2023: {
    id: "bda2023",
    authors: "British Dyslexia Association",
    year: 2023,
    title: "Dyslexia Style Guide",
    venue: "British Dyslexia Association",
    url: "https://cdn.bdadyslexia.org.uk/uploads/documents/Advice/style-guide/",
    finding:
      "Readable text means sans-serif faces, generous line spacing, left alignment, and backgrounds that are not pure white.",
    constraint:
      "Body text is 17px minimum at 1.65 line-height on #f5f5f0, left aligned, capped near 66 characters.",
    autisticAuthored: false,
  },

  coga: {
    id: "coga",
    authors: "W3C Cognitive and Learning Disabilities Accessibility Task Force",
    year: 2021,
    title:
      "Making Content Usable for People with Cognitive and Learning Disabilities",
    venue: "W3C",
    url: "https://www.w3.org/TR/coga-usable/",
    finding:
      "Users need predictable behaviour, plain literal language, undo, and freedom from time pressure and unexpected change.",
    constraint:
      "Nothing auto-submits, nothing is timed, nothing animates without a reduced-motion guard, and no copy relies on figures of speech.",
    autisticAuthored: false,
  },
} as const satisfies Record<string, Citation>;

export type CitationId = keyof typeof CITATIONS;

export const ALL_CITATIONS: Citation[] = Object.values(CITATIONS);

export function getCitations(ids: readonly string[]): Citation[] {
  return ids
    .map((id) => CITATIONS[id as CitationId])
    .filter((c): c is (typeof CITATIONS)[CitationId] => Boolean(c));
}
