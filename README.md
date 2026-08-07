# Subtext

**Text strips context. Subtext puts some of it back, in both directions.**

Built for [IncludAI](https://includai-2026.devpost.com/), the neurodiversity hackathon run by IncludEDU in partnership with the Stanford Network for K-12 Neurodiversity Education and Advocacy. Track 2: AI for Connection and Wellbeing.

---

## The thesis, and the thing it is not

The obvious version of this product is a tool that teaches autistic teenagers to read subtext. We did not build that, because the premise is false.

Frost et al. (2024) found that autistic adults use discourse context to identify a speaker's intention to request **as accurately as non-autistic adults do**. Given the context, autistic people read indirect requests fine. So a tool built on "you struggle to understand what people mean" would be both wrong and insulting.

What is actually true is narrower and more useful. **Texts, DMs and group chats delete the tone, timing, facial expression and shared situation that make intent legible to anybody.** The person who wrote "can we talk later" was leaning on context they never supplied. The honest answer to "what did they mean" is frequently *nobody could tell you from the text alone, and here are the two live readings.*

Saying that plainly is the feature. A single confident guess would be the bug.

The other half runs the same logic in reverse. Milton's double empathy problem (2012), supported by Crompton et al. (2020), holds that these breakdowns are mutual rather than a one-sided autistic deficit. Crompton found that information passed down an all-autistic chain survives as well as down an all-non-autistic chain, and that only *mixed* chains degrade. The failure is neurotype mismatch. So Subtext translates both directions and never positions the autistic user as the party in need of correction.

## What it does

**A message you received.** Paste it. Subtext returns the literal reading, an honest verdict on how much the text actually determines intent, a ranked spread of plausible meanings with confidence numbers, the specific context the sender left out, and one low-cost question you could send to settle it. No apology, no hedging, in the suggested question.

**A message you are sending.** Write it the way you would actually say it. Subtext forecasts how a non-autistic reader may misread it, and attributes that misreading to the reader, because Sheppard et al. (2019) found non-autistic observers misjudge autistic people's reactions and then rate them unfavourably on the strength of their own error. You get an affirmation that you may send it as written, and optionally one revision that **adds explicit intent without removing any force**.

## The masking guard

This is the part we would ask you to read the code for: [`src/lib/engines/masking-guard.ts`](src/lib/engines/masking-guard.ts).

Camouflaging is associated with anxiety, depression and stress (Cage & Troxell-Whitman, 2019), and onward with thwarted belonging and lifetime suicidality (Cassidy et al., 2020). A tool that quietly rewrites a teenager's words to sound softer is not a communication aid. It is a masking machine with a friendly interface, and it is the single easiest thing to build by accident here.

A language model can be *asked* not to hedge and will hedge anyway; it has read an enormous quantity of corporate email. So the promise is not kept in the prompt. It is kept in code that runs on every suggested revision before the revision is allowed near the screen, and it **fails closed**:

| Change | Verdict |
|---|---|
| "send me the dates" → "sorry, would you maybe be able to send the dates when you get a chance?" | **Blocked.** Adds `sorry`, `maybe`, `whenever you get a chance`. |
| "send me the dates" → "send me the dates. To be clear, I am not annoyed. I need them to plan my half." | **Allowed.** Adds information, subtracts no force. |
| "Hope you're well! Quick question:" wrapped around an unchanged sentence | **Blocked.** The core survived; the padding is still masking. |

The distinction the whole product turns on: **adding explicit intent is self-advocacy. Adding hedges is masking.** When the guard fires, the user sees the block and the phrases it caught, rather than the softened text. A refusal you can see is worth more than a promise in a README.

Verified by 13 tests in [`masking-guard.test.ts`](src/lib/engines/masking-guard.test.ts).

## Designed to be usable, specifically

Every value traces to a source. The full 45-item checklist this was built against is in the research notes; the load-bearing ones:

- 17px body text, 1.65 line-height, capped at 66 characters, left aligned, never justified (British Dyslexia Association, 2023)
- Off-white `#f5f5f0` rather than pure white, charcoal `#2c2c2c` rather than black; maximum contrast causes visual stress
- **No OpenDyslexic and no Comic Sans.** A 2017 study found OpenDyslexic *reduced* reading speed, and dyslexic readers in a 2013 study preferred Arial and Verdana. This is the folk remedy most accessibility demos ship; the evidence does not support it
- Emphasis by weight, never italic or underline, both of which distort letter shapes
- Desaturated palette throughout, nothing above roughly 50% saturation
- Every animation behind `prefers-reduced-motion`, nothing over 180ms, no parallax, no bounce, no loop
- Nothing auto-submits, nothing is timed, no infinite scroll (WCAG 3.2.2, 2.2.1)
- Likelihood is never encoded in colour alone: the number, the bar and the word all appear, so it survives colour blindness and a greyscale screenshot
- Reader controls size, line spacing and ground, applied before first paint so nothing flashes. COGA is clear that this belongs to the user rather than to us
- No emotion-naming entry point anywhere. 66.3% of autistic clinic service-users met the clinical threshold for alexithymia against roughly 10% of the general population (Josyfon et al., 2023), so "how did that make you feel?" fails two thirds of the intended users on the first screen

There is no score, no streak, and nothing to get better at. Social skills programmes that measure success by provider satisfaction rather than the autistic person's wellbeing are exactly what autistic advocates have objected to.

## Honest limitation

**Subtext was built from published research and autistic-authored writing. It has not yet been tested with an autistic teenager.** The hackathon ran one week and we could not arrange a session inside it.

We are not going to dress that up, because the research is unambiguous that building *for* rather than *with* is how tools like this go wrong. Two things follow:

1. Every result in the app carries a **"where this comes from"** panel listing the actual papers behind that screen, marked where the source is autistic-authored, with a one-line statement of what each source changed in the build.
2. Every result carries a **"this does not match my experience"** control. It says outright that the output came from research rather than lived experience, and that if the two disagree, the research is what needs updating. Notes are stored on the reader's own device. There is no server-side collection, so a tester decides whether to hand theirs over.

The testing protocol is written and ready to run: `docs/testing-protocol.md`.

## Privacy

No account, no database, no analytics, no telemetry. Message text is sent to the model provider to be analysed and is not stored by Subtext. Reading preferences and correction notes stay in your browser's local storage. Given the intended users are minors discussing real conversations, anything else would have been indefensible.

## Running it

```bash
npm install
cp .env.example .env.local     # add a free key from https://aistudio.google.com/apikey
npm run dev
```

Subtext defaults to Gemini's free tier specifically so that a teacher, a judge, or a teenager can clone this and have it working without a billing account. `ANTHROPIC_API_KEY` is supported as an alternative; the provider seam is in `src/lib/llm/provider.ts`.

```bash
npm test          # masking guard tests
npm run typecheck # tsc --noEmit, strict
npm run lint
npm run build
```

## Sources

| Claim | Source |
|---|---|
| Breakdown is mutual, not a one-sided autistic deficit | [Milton (2012), *Disability & Society* 27(6)](https://www.tandfonline.com/doi/full/10.1080/09687599.2012.710008) |
| Autistic-to-autistic information transfer matches non-autistic; only mixed chains degrade | [Crompton et al. (2020), *Autism* 24(7)](https://journals.sagepub.com/doi/10.1177/1362361320919286) |
| Autistic adults use discourse context to read indirect requests as accurately as non-autistic adults | [Frost, Nagano & Zane (2024)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11897084/) |
| Non-autistic observers misread autistic reactions, then rate them unfavourably | [Sheppard, Webb & Wilkinson (2019), *JADD* 49(10)](https://link.springer.com/article/10.1007/s10803-019-04101-1) |
| 70% of autistic adults camouflage consistently; associated with anxiety, depression, stress | [Cage & Troxell-Whitman (2019), *JADD* 49(5)](https://link.springer.com/article/10.1007/s10803-018-03878-x) |
| Camouflaging associated with thwarted belonging and lifetime suicidality | [Cassidy et al. (2020), *JADD* 50(10)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6751138/) |
| 66.3% of autistic clinic service-users met the threshold for alexithymia | [Josyfon et al. (2023), *Healthcare* 11(24)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10742835/) |
| Autistic people value directness and are frequently misread as rude | [Hancock, Reframing Autism (autistic-led)](https://reframingautism.org.au/autistic-communication-differences-a-primer/) |
| Social skills training rewards masking and measures the provider's satisfaction | [Therapist Neurodiversity Collective](https://therapistndc.org/training-social-skills-is-dehumanizing-part-1/) |
| Typography, alignment, contrast and background specifications | [British Dyslexia Association Style Guide](https://cdn.bdadyslexia.org.uk/uploads/documents/Advice/style-guide/) |
| Predictability, plain language, user control, freedom from timing | [W3C COGA, Making Content Usable](https://www.w3.org/TR/coga-usable/) |

## Licence

MIT.
