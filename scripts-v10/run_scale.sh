#!/usr/bin/env bash
# R7 scale check for v6: M preset, shock 0, seeds 1-5, default scale vs suite scale.
cd "$(dirname "$0")"; export PATH="$HOME/.local/node22/bin:$PATH"
R=../data-v10/review/scale.jsonl; : > $R
for sc in default suite; do for rg in fiat bitcoin; do for s in 1 2 3 4 5; do echo "$rg $s $sc"; done; done; done | xargs -P 10 -L 1 sh -c 'node probe_default_scale.mjs $0 $1 $2 >> '"$R"
echo scale-done
