# Scenarios

`baseline.json` is every slider at its registry default, for 600 ticks.

Named files in `presets/` are compositions of orthogonal category options. The catalog lives in
`packages/core/src/config/presets.ts`. Categories are central bank, public finance, credit, and AI bullishness
(productivity gain, adoption curve, and reach together). Scenario worlds name a regime and one option in every
category (Monetized dividend, Hawkish dividend, Modest dividend, Private surplus, Bitcoin dividend, Bitcoin private
surplus). A file sets only the sliders that differ from registry defaults. See [docs/gallery.md](../docs/gallery.md).
