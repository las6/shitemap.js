# Expansion and export performance — October 9, 2026

Implemented in local source; the live 0.4.1 release still has 12-child batches and per-character export measurement. Selected-page Kurkelo metadata follows these improvements; keyboard navigation/safe zones and the copy shortcut follow metadata. Favicon exploration is independent polish.

## Expansion

Expanding a section reveals up to 50 immediate children, so ordinary 20–30-page sections need one click. Larger sections reveal another 50 per “show more” action; the final action uses the actual remainder count. Existing nested collapse, search ancestry reveal, root presentation, and export budgets are preserved. This does not recursively open every descendant or establish a new browser capacity guarantee.

## Text measurement decision

Export previously used a DOM Range rectangle for every UTF-16 character and grouped the results into lines. The new `components/exportText.js` reads a whole text range first. Single-line labels need no character scan; wrapped labels use binary searches for each line boundary, then measure each complete line. Comparisons use graph coordinates so tiny viewport zoom does not merge distinct lines. Complete-line rectangles also avoid the previous negative-width accumulation for RTL text; full bidi rendering parity remains broader verification work.

Pretext's published npm package `@chenglou/pretext` **0.0.9** was trialed outside the project's dependencies. Its cached canvas preparation and arithmetic line layout are promising, especially for repeated layouts. The trial used `prepareWithSegments`/`layoutWithLines`, loaded fonts, matching font weight/size/family, width and line height, and CSS `overflow-wrap: anywhere`. One narrow Arabic case wrapped differently from the DOM; raw collapsed-whitespace samples also returned differently normalized line text. These observations concern this package version and trial, not every Pretext release or its general accuracy. [API documentation](https://github.com/chenglou/pretext#readme).

Retain native browser wrapping for this change. No dependency, speculative PNG preparation, image cache, lower-resolution mode, or clipboard shortcut was added. Both download and clipboard paths share the improvement.

## Local evidence

In the Codex in-app browser on this Mac, a font-ready Regular/vertical review contained **549 labels**, including 500 article titles and adversarial wrapped titles/URLs, accented Latin, CJK, Korean, emoji/combining sequences, Arabic, mixed scripts, NBSP, and repeated whitespace. Seven repeated runs had median text-measurement times of **21.3 ms before / 10.5 ms after**. Pretext preparation took 15.3 ms and subsequent layout 1.4 ms in that run. This is a local measurement, not an end-to-end copy speed guarantee; warm-up and workload affect results. Narrow heavily wrapped text can gain less than ordinary single-line labels.

Native line text and vertical positions matched the baseline in the tested Regular/vertical and Bare/horizontal maps and synthetic labels, including normalized zoom checks at 0.01, 0.4, 1 and 2. Whole-line rectangles can differ from accumulated character widths by browser rounding; RTL bounds intentionally correct the previous accumulation. The native method still reads DOM geometry and can incur layout work.

An expanded 17-page accessory section copied successfully at 3,079 × 5,195 pixels. A sampled copy took **126.9 ms**: readiness 25.7 ms, geometry/text measurement 1.1 ms, drawing/PNG encoding 69.3 ms, and another 29.6 ms until clipboard completion. These stages explain why faster measurement alone does not remove all copy latency. SVG downloaded and parsed as native XML with embedded fonts and the expanded accessory labels.

Development-only console records `Map export timing` (readiness, measurement, rendering/encoding) and `Map clipboard timing` (total and time after preparation). They contain durations/format, no page text or URLs, and send nothing to a service. No timing logs are emitted in production.

Expansion tests cover 20/30/50 children in both views/directions, preserved nested collapse, 51-child remainder, and 300-child batching. An isolated committed-baseline snapshot plus these changes passed **148 tests, lint, and a production webpack build**. The build retained the existing package-version named-import warning in Wordmark. The shared working tree's concurrent background preference work had two failing assertions during review; those changes were excluded from the isolated check.

Temporary browser benchmark assets were removed from `public` before completion. Raw results and review assets remain in ignored `output/release-review/`. Safari/Firefox, physical devices, larger real maps and hosted smoke checks remain future verification; the current release was not redeployed.
