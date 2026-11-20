# Agent production guide

## Brand contract

Read `../brand-copy.json`, `../BRAND-GUIDELINES.md`, `CHANNELS.md` and `claims.json` before composing. The only brand headline is:

Your agent fleet.
Your infrastructure stack.

Use Hexagon for the displayed name. Haxegon is the repository spelling. Use the approved modular H without redrawing its proportions. Use Funnel Display for editorial headlines, IBM Plex Mono for chapter labels, routing annotations and code, and Geist for brand furniture and product context. Read `WEBSITE-REUSE.md` before inventing a new visual treatment. Dark and light artwork are monochrome, with ordered-dither atmosphere, original ASCII execution units, routing geometry and deliberate negative space. Avoid decorative gradients, glowing circuits, stock robots, space battles and franchise imagery. Supporting feature headings may vary; the brand headline must not.

## Select a deliverable

1. Choose one audience, one problem and one supported outcome.
2. Select the channel canvas from `CHANNELS.md`.
3. Select a template and one concept from `index.generated.json`. For campaign heroes, start with the website-derived launch template. For technical explanations, start with the six-chapter website story. Transparent ASCII and dither layers are in `components/`. Keep illustrative aircraft separate from the unchanged official logo.
4. If making an implementation claim, select a product story and read its `limits` and evidence links. A screenshot is an observation of a UI, not a universal compatibility test.
5. Edit `templates/content.json`. Each headline has 1-3 lines, at most 38 characters each; description at most 100 characters; kicker at most 28. Do not shrink text to make a paragraph fit.
6. Run the build and render commands in README. Inspect actual PNGs, not just SVG syntax.
7. Check spelling, line breaks, safe areas, logo proportions, screenshot legibility and the smallest destination preview. Open the gallery and inspect the source image at full size.
8. Run the structural checks and source-language check. Record what was inspected, including unverified claims or missing evidence.
9. Deliver the artwork, alt text, caption and source references. Publishing requires a separate explicit user instruction.

## Editing behavior

- SVG text is outlined for distribution; edit strings in the source/configuration and rebuild. Never paint text over exported PNGs.
- Transparent concept components have a 720 x 420 coordinate system. Place them inside a larger layout without stretching.
- The render pipeline rejects template copy outside its limits. Change the layout or shorten the copy; do not bypass the checks.
- Product images must keep the original captured pixels. Framing, clearly declared crops and external annotations are allowed. Do not edit metrics, status, names, task text or error messages to improve a claim.
- Do not paste credential files, tokens, private resource logs or full initialization dumps into campaign inputs. The approved captures have been reviewed for visible secrets.
- Tool logos visible in actual Console captures are product UI context, not endorsement or partnership badges.
- Code examples must match the actual SDK. The supplied code card is a shortened API excerpt: it assumes an existing Session, imports and configuration, and a Run lookup may still report an unfinished Run.

## Caption skeleton

Title: one concrete observation.
Body: the problem, the feature and the context in two sentences.
Evidence: actual source, date, combination and material limitation.
CTA: one destination, normally the repository or a specific documentation page.
Alt: describe the idea or demonstrated UI without repeating the entire caption.

Example: "Inspect the definition behind a Session. Hexagon retains the resolved initialization and exposes it in Console for inspection and reuse. This screenshot shows a retained local-control-plane test Session; it does not establish live cloud availability. Explore the first-Session guide in the repository."

## Claim rules

Never infer zero billing from paused state, arbitrary memory survival from file retention, universal compatibility from a catalog, or successful side effects from an Agent's final answer. No invented adoption counts, customer logos, speedups, availability guarantees or fresh cloud tests. A historical evidence file must retain its date and exact scope. For unsupported assertions, revise the story or mark the missing evidence explicitly.

## Repository ownership

This folder contains shared masters and a local asset workbench. It is not the marketing website. Website implementation lives only in NexusFox88/Haxegon-Website. Do not recreate a website directory in the product repository. Do not commit, push, deploy, send outreach or post content unless the user explicitly authorizes those actions.
