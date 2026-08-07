# Devpost submission copy

Paste-ready. Track 2: AI for Connection and Wellbeing.

---

## Tagline

Text strips context. Subtext puts some of it back, in both directions, and it will never make you sound softer than you meant.

---

## Project description

### The problem, stated correctly

The obvious version of this project is a tool that teaches autistic teenagers to read subtext. We did not build that, because the premise is false.

Frost, Nagano and Zane (2024) found that autistic adults use discourse context to work out a speaker's intention to request as accurately as non-autistic adults do. Given the context, autistic people read indirect requests fine. A tool built on "you struggle to understand what people mean" would be both wrong and insulting, and there are already a lot of those.

What is actually true is narrower and more useful. Texts, DMs and group chats delete the tone, timing, facial expression and shared situation that make intent legible to anyone. The person who wrote "can we talk later" was leaning on context they never supplied. So the honest answer to "what did they mean" is frequently that nobody could tell you from the text alone, and here are the two readings that are both still live.

Saying that plainly is the feature. A single confident guess would be the bug.

### Who it is for

Neurodivergent teenagers, autistic and ADHD, who deal with two specific costs every day: working out what an underspecified message meant, and being read as rude when they were only being clear.

### What it does

**A message you received.** Paste it. Subtext gives you the literal reading, an honest verdict on how much the text actually determines intent, a ranked spread of plausible meanings with confidence numbers, the specific context the sender left out, and one low-cost question you could send to settle it. The suggested question never apologises and never hedges.

**A message you are sending.** Write it the way you would actually say it. Subtext forecasts how a non-autistic reader may misread it, and attributes that misreading to the reader, because Sheppard, Webb and Wilkinson (2019) found non-autistic observers misjudge autistic people's reactions and then rate them unfavourably on the strength of their own error. You are told you may send it as written. You are optionally offered one revision that adds explicit intent without removing any force.

Both directions run on the same principle. Milton's double empathy problem (2012), supported by Crompton et al. (2020), holds that these breakdowns are mutual rather than a one-sided autistic deficit. Crompton found information passed down an all-autistic chain survives as well as down an all-non-autistic chain, and that only mixed chains degrade. The failure is neurotype mismatch. So Subtext translates both ways and never positions the autistic user as the party who needs correcting.

### How AI is used meaningfully

Three ways that are not "we called an API".

**It is forced to be uncertain.** The model returns a ranked spread of readings with honest confidence numbers and an explicit ambiguity verdict, rather than one authoritative answer. Confidently telling an autistic teenager "they meant X" when the text genuinely does not determine it is how this category of tool causes harm. The schema makes hedging about the world mandatory while the prose stays direct.

**It is constrained by code it cannot talk its way around.** See below.

**It cites itself.** Every screen carries a panel listing the actual papers behind that output, marked where the source is autistic-authored, with a line on what each source changed in the build.

### The masking guard

This is the part we would ask a judge to read the code for.

Camouflaging is associated with anxiety, depression and stress (Cage and Troxell-Whitman, 2019) and onward with thwarted belonging and lifetime suicidality (Cassidy et al., 2020). A tool that quietly rewrites a teenager's words to sound softer is not a communication aid. It is a masking machine with a friendly interface, and it is the easiest thing to build here by accident.

A language model can be asked not to hedge and will hedge anyway; it has read an enormous quantity of corporate email. So the promise is not kept in the prompt. It is kept in a function that runs on every suggested revision before that revision is allowed near the screen, and it fails closed.

- "send me the dates" becoming "sorry, would you maybe be able to send the dates when you get a chance?" is **blocked**. It added three weakeners.
- "send me the dates. To be clear, I am not annoyed, I need them to plan my half" is **allowed**. It added information and subtracted no force.
- "Hope you're well! Quick question:" wrapped around an unchanged sentence is **blocked**. The core survived; the padding is still masking.

Adding explicit intent is self-advocacy. Adding hedges is masking. When the guard fires the user sees the block and the exact phrases it caught, not the softened text. A refusal you can see is worth more than a promise in a README.

Eighteen tests cover it: thirteen on the guard itself, and five proving it is actually wired into the path that matters, so that a softened revision coming back from a live model call is intercepted and never reaches the caller. We mutation-tested that: bypassing the guard turns the suite red, restoring it turns it green. A green check that cannot fail is not evidence.

### How neurodivergent users were involved, honestly

**Subtext has not yet been tested with an autistic teenager.** The hackathon ran one week and we could not arrange a session inside it. We are stating that plainly rather than dressing up a conversation into a research finding, because the literature is unambiguous that building for rather than with is exactly how tools in this category go wrong, and a vague claim here would be the same failure in miniature.

What we did instead, and what it changed:

- The design was built from published research and from autistic-authored and autistic-led writing (Reframing Autism, NeuroClastic, Therapist Neurodiversity Collective). Every design decision traces to a named source, listed in the README and surfaced inside the product.
- **Frost et al. (2024) killed our original concept.** We started out building a subtext decoder premised on autistic people needing help understanding indirect language. The evidence says that premise is false, so the product was rebuilt around context-stripping instead. That is the single largest change the research made.
- **The autistic community's objection to social skills training removed a feature.** The obvious "make this sound nicer" button was cut, then actively inverted into the masking guard.
- **Josyfon et al. (2023) removed another.** With 66.3% of autistic clinic service-users meeting the threshold for alexithymia, an emotion-naming entry point would fail two thirds of the intended users on the first screen. There is no "how did that make you feel" anywhere in the product.
- Every result carries a "this does not match my experience" control which states outright that the output came from research rather than lived experience, and that where the two disagree it is the research that needs updating. Notes stay on the reader's device; there is no server-side collection.
- The first-session testing protocol is written and in the repo at `docs/testing-protocol.md`, including the four assumptions the build rests on and what would disconfirm each.

### Designed to be usable, specifically

Every value traces to a source: 17px text at 1.65 line-height capped at 66 characters, left aligned, on off-white rather than pure white, charcoal rather than black (British Dyslexia Association). Emphasis by weight, never italic or underline. Desaturated palette throughout. Every animation behind `prefers-reduced-motion`. Nothing auto-submits, nothing is timed, no infinite scroll. Likelihood is never encoded in colour alone. The reader controls size, spacing and background, applied before first paint so nothing flashes.

No OpenDyslexic and no Comic Sans. A 2017 study found OpenDyslexic reduced reading speed, and dyslexic readers in a 2013 study preferred Arial and Verdana. It is the folk remedy most accessibility demos ship and the evidence does not support it.

There is no score, no streak, and nothing to get better at.

### Privacy

No account, no database, no analytics, no telemetry. Message text goes to the model provider to be analysed and is not stored by Subtext. Preferences and correction notes stay in the browser. The intended users are minors pasting real conversations; anything else would have been indefensible.

### Built with

TypeScript, Next.js 16, React 19, Groq (free tier, so anyone can run it without a billing account or a card), Vitest, Vercel.

---

## Track

Track 2: AI for Connection and Wellbeing.

## Repository

Public GitHub link goes here.

## Live demo

Vercel link goes here.
