# Hexagon — Fleet in Formation

Creative direction memo · November 20, 2026

Status: exploratory direction for future creative work. This document records the visual association raised by the product owner. It does not replace the approved modular H or imply that the concepts below have been implemented.

## The observation

Hexagon's mark strongly resembles the front-facing silhouette of an Imperial TIE fighter from Star Wars: two substantial side structures frame a small central element. The resemblance is especially apparent when the isolated mark is white on black. The previous central-pulse loading animation made that association stronger by leaving the apparent wings still while animating the center.

This is an important part of how the mark may be perceived, rather than an incidental detail to ignore. It is also unusually compatible with the product's central idea: an **Agent fleet** operating under a shared **control plane**.

The starting point is therefore a productive visual ambiguity:

> A letter at rest. An execution unit in motion. A fleet when repeated.

The resemblance is an observation, not a claim that the mark was derived from an authorized franchise asset, that it is unique, or that it has received trademark clearance.

## The conceptual connection

Hexagon is a self-managed Agent fleet control plane with a headless agent API. Users bring their Sandbox, Harness and LLM. The control plane coordinates work across independent execution environments.

Fleet imagery can make that otherwise abstract system easier to recognize:

| Product idea | Visual metaphor | Important boundary |
| --- | --- | --- |
| Agent execution | One modular H as an active unit | An H is not a literal process or resource count |
| Agent fleet | Multiple units with independent movement | Avoid implying every unit shares one lifecycle |
| Control plane | A shared dispatch point or organizing structure | Do not imply all execution happens centrally |
| Sandbox isolation | Space and boundaries between units | Artwork does not certify security isolation |
| Multiple Harnesses and models | Different paths within a common geometric system | Do not imply every combination is supported |
| Task submission and result delivery | Departure, execution, return | A returning shape is not evidence of successful execution |
| Pause and wake | Docking and unfolding | Visuals must not promise provider capabilities beyond evidence |

Use these mappings for storytelling. Product UI must continue to expose real states, labels and errors.

## Creative thesis

**A fleet that becomes a logo—and a logo that becomes a fleet.**

The H establishes identity. Repetition establishes the fleet. Timing, routes and formation establish orchestration. The strongest connection to the cinematic reference is coordinated movement, rather than spacecraft illustration.

Working creative platform:

**HEXAGON — FLEET IN FORMATION**

Candidate supporting lines:

- **Your agent fleet. Your infrastructure stack.** — approved product headline
- **Independent agents. Coordinated execution.** — brand narrative
- **Launch. Orchestrate. Return.** — motion language

These are proposed campaign lines. The shipped wordmark descriptor remains **Agent fleet control plane**, and the current creative headline remains **Your agent fleet. Your infrastructure stack.** Changes to those defaults should be deliberate and versioned.

## Signature concept: Formation / Reformation

A large, quiet field holds one H. Its modules separate just enough to suggest release. Smaller units depart along distinct routes, moving at slightly different times. They then synchronize into a formation whose negative space or arrangement reveals a larger H. The formation eventually resolves back to the original mark.

Suggested narrative sequence:

1. **Identity:** one complete, stationary H.
2. **Dispatch:** boundaries open slightly; independent units emerge.
3. **Execution:** units travel along separate, disciplined paths.
4. **Coordination:** the paths resolve into a coherent formation.
5. **Return:** movement settles into the original identity.

Use this for a website hero, product film or launch sequence. It is too narratively elaborate for a small button spinner. Prefer a finite introduction or a calm resting interval over continuous full-screen movement.

The conceptual sequence does not require a literal H made from dozens of tiny logos. At small sizes, three or four units and a clear route are more legible than a dense swarm.

## Supporting creative directions

### Launch / Return

One module leaves the mark along a precise route and later rejoins it. The motion links an entry point, independent execution and a returned result. Suitable for task-submission illustrations or a short transition.

### Fleet Radar

Small H units occupy a sparse coordinate field. A selected unit gains a locator bracket, a route trace and a concise identifier. Suitable for fleet artwork and observability storytelling. Avoid decorative radar sweeps that suggest live telemetry where none exists.

### Dock / Wake

An inactive unit folds into a compact alignment, then unfolds into the complete H. Suitable for explaining serverless lifecycle behavior, where the selected provider and Harness actually support the represented operation.

### Parallel Maneuvers

Several units depart together, move at different speeds and converge at a common delivery point. Suitable for explaining a unified API over independently configured execution components. Keep the number of units illustrative rather than a count of supported providers.

## Console motion vocabulary

The brand can supply a coherent visual vocabulary without replacing operational semantics:

| State | Possible motion treatment |
| --- | --- |
| Idle | Complete H, stationary |
| Queued | A unit waits at a route entrance |
| Running | A short signal traverses stable boundaries |
| Paused | Modules settle into a compact docking arrangement |
| Waking | The docked structure unfolds |
| Completed | A returning unit settles; motion stops |
| Needs attention | Movement stops at a marked interruption, accompanied by explicit text |

These are proposed treatments, not implemented components. Confirm actual state-machine semantics before applying them. Do not use perpetual motion for completion, or disappearance to imply resource deletion.

For routine waiting, prefer a small sequence of staggered units sharing a route over a complex cinematic scene. Preserve fixed layout bounds. Keep all state information understandable with animation disabled. Use the existing application localization system for status text.

## Visual grammar

- Orthographic geometry and strong alignment.
- Flat monochrome surfaces and generous negative space.
- Short route segments, sparse coordinate ticks and restrained identifiers.
- Independent units with common proportions.
- Controlled acceleration, decisive stopping and deliberate resting intervals.
- Optional signal color in larger illustrations only; the approved identity remains black and white.
- Clear separation between abstract brand illustration and factual product diagrams.

The existing H-to-parallel-lanes loading animation is a first expression of this direction. Its current 2.4-second cycle remains an asset implementation detail, not a mandatory duration for every future sequence.

## Boundaries of the reference

Borrow the sense of formation, coordination and machine precision. Do not reproduce franchise vehicle drawings, insignia, typography, sound effects, music or named factions in shipped product artwork.

Avoid starfields, laser fire, explosions, cockpit decoration, exhaust and battle scenes. Avoid language of domination, enemies or surveillance. The product's story is user control and coordinated execution, not combat or allegiance to an empire.

The similarity remains a brand consideration even with original geometry. This memo does not resolve naming, trademark or visual-clearance questions. If the product later requires less resemblance, explore changes to the side-module proportions and central bridge as a separate identity revision; do not silently alter approved assets during animation work.

## What exists and what comes next

Existing assets:

- Approved modular H and horizontal/vertical lockups.
- Light and dark orchestration loaders, plus a compact pulse variant.
- Hero, social card, repository banner, pattern and motion storyboard using the controlled-divergence concept.

Future exploratory deliverables:

1. A finite Formation / Reformation hero animation, with a reduced-motion composition.
2. A Launch / Return loading study tested at 24, 32 and 48px.
3. A Fleet Radar illustration that remains clearly illustrative, not a mock telemetry screen.
4. Dock / Wake studies aligned with actual supported lifecycle states.

Evaluate each against H recognition, fleet meaning, legibility, motion comfort, similarity to recognizable franchise imagery and faithful product semantics. Keep experiments separate until a direction is selected. No additional execution or asset replacement is implied by this document.

## Related material

- [Visual identity guidelines](BRAND-GUIDELINES.md)
- [Creative applications](creative/README.md)
- [Asset inventory](asset-manifest.json)
- [Loading preview](previews/loading.html)
