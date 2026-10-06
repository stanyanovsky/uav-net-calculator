# UAV Net Calculator — public portfolio edition

## What is it?

An interactive web prototype for preliminary exploration of scenario parameters and the geometry of a protective enclosure. It demonstrates product thinking, deterministic calculation logic, interaction design and AI-assisted implementation.

This small generic implementation was written anew. It contains no employer source files, branding, internal materials or repository history.

## Problem

Manually comparing vehicle mass, speed, motion energy and enclosure geometry quickly becomes inconvenient and difficult to explain to a user. A formula alone does not show what is missing, what an estimate includes, or what it cannot establish.

## Product approach

One interface turns **inputs → deterministic calculations → interpretation → warnings → readable result**.

- Choose a scenario; enter vehicle mass, speed and optional charge mass.
- Calculate kinetic energy, independently of the illustrative input-profile bands.
- Optionally enter object dimensions and offsets for four walls and a roof, without a floor.
- Supply a generic fabric mass per area to estimate fabric mass.
- Read a current summary with missing-input warnings and limitations.

After the first calculation or summary request, edits update the result automatically. The summary button always reads the current form; invalid edits clear previous results rather than leaving stale numbers visible. Reset clears the result.

Blank charge means not specified. A charge of zero means explicitly absent (0 kg). A positive charge is recorded only as context; it is not added to vehicle mass or converted into an explosive load. Vehicle mass is the total mass used in the kinetic-energy formula.

## My contribution

> I defined the product scope, interaction flow and calculation logic, then iteratively implemented the prototype with ChatGPT/Codex as coding assistants.

## AI-assisted development

ChatGPT/Codex were used as coding/prototyping assistants. There is **no runtime AI or LLM**. All calculations are deterministic and inspectable in `script.js`.

The app uses plain HTML, CSS and JavaScript. It has no backend, authentication, database, analytics, external API calls, dependencies or build step. Form values stay in the page; the app does not persist or transmit them.

## Calculation logic

For vehicle mass `m` in kg and speed `s` in km/h:

```text
v = s / 3.6          (m/s)
E = 0.5 × m × v²    (J)
E_kJ = E / 1000
```

For length `L`, width `W`, height `H`, a perimeter offset `d` on each side, and a top offset `t`, all in metres:

```text
a = L + 2d
b = W + 2d
c = H + t
roof = ab
four walls = 2ac + 2bc
area = ab + 2ac + 2bc        (m², no floor)
fabric mass = area × input mass per area  (kg)
```

Fabric mass excludes overlaps, waste, supports and attachments. No mass-per-area value or material specification is inferred from a named net. The synthetic example uses 1.5 kg/m² solely as a demonstration input.

Mass and dimensions must be positive; speed, charge and offsets must be non-negative. Zero speed is valid and gives zero kinetic energy. Fabric mass per area, when supplied, must be positive. Blank geometry is allowed; incomplete geometry does not produce an area estimate. Invalid supplied fields block the current result. Decimal comma and exponent notation are accepted. Non-finite inputs and non-finite intermediate/results are rejected; no arbitrary engineering upper limits are imposed. JavaScript floating-point precision and rounded display values limit numerical precision.

## Illustrative prototype assumptions

`ASSUMPTIONS` in `script.js` is a separate, frozen configuration block. It contains product hypotheses for A/B/C input-profile bands. These are **illustrative prototype assumptions**, not normative, official or engineering-verified classifications. They do not establish vehicle type, impact severity or protective capacity.

| Input | A | B | C | Outside illustrative range |
| --- | --- | --- | --- | --- |
| Vehicle mass, kg | >0 and <30 | ≥30 and <100 | ≥100 and ≤250 | >250 |
| Speed, km/h | ≥0 and <60 | ≥60 and <120 | ≥120 and ≤200 | >200 |
| Positive charge mass, kg | >0 and <6 | ≥6 and <10 | ≥10 and ≤15 | >15 |

Blank and zero charge have separate states and do not receive a band. Crossing a band threshold affects interpretation only; it does not change or cap the formulas. No normative source or strength value is claimed for these assumptions.

## Limitations

This prototype:

- is not an engineering calculation of a protective structure;
- does not calculate blast loads or fragmentation;
- does not calculate attachments, supports or anchors;
- does not calculate dynamic deflection;
- does not confirm suitability or protection capability of any specific net;
- does not replace specialist engineering review.

## Run locally

Open `index.html` in a modern browser. No installation or server is required.

To run the compact regression checks with Node.js (verified with Node 24):

```sh
node --test tests/calculation.test.js
```

## Verification

Verified on 6 October 2026:

- 10 dependency-free `node:test` checks passed: energy, geometry, mass estimate, missing geometry, negative offsets, empty/zero charge in all scenarios, non-finite inputs, overflow, assumptions and event-driven summary updates.
- Browser interaction checks passed in Chromium 152: synthetic example, rerender after mass/scenario/geometry changes, current-summary CTA, charge blank/zero, negative-offset errors and overflow invalidation. No JavaScript page errors.
- At widths 320, 768, 1024 and 1440 px: no horizontal document overflow or elements extending outside the viewport. Fraction-based grid columns account for the gap; the layout stacks below 850 px.

Synthetic reference case: 12 kg at 72 km/h gives 2.4 kJ. Object 10 × 6 × 4 m, perimeter offset 2 m and top offset 3 m give a 14 × 10 × 7 m enclosure, roof 140 m², walls 336 m², total 476 m². At 1.5 kg/m² the estimated fabric mass is 714 kg.

Manual review checklist:

1. Load the synthetic example, change mass to 24 kg: energy and summary immediately show 4.8 kJ.
2. Change width to 8 m: total area becomes 532 m²; the summary CTA uses these current values.
3. Clear charge, then enter 0: messages switch from not specified to absent without contradiction.
4. Clear a dimension: energy remains available while geometry is incomplete. Enter a negative offset or `1e308` speed: previous results clear and an error is shown.
5. Reset and test the summary CTA before submitting. Check keyboard focus, labels and readable results at each target width.

## License

No license has been copied or automatically assigned. MIT is proposed for this newly authored generic implementation; the repository owner should choose and add a license before inviting reuse. No specific unresolved IP issue was identified in the files included here. This statement does not claim ownership of any earlier implementation.
