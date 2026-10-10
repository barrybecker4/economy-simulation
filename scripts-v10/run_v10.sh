#!/usr/bin/env bash
# Round 10 headline queue. Writes .part and renames on completion.
cd "$(dirname "$0")"; export PATH="$HOME/.local/node22/bin:$PATH"
for n in E1_regime_structure X1_monetary_preset E1L_legacy_defaults E4_shocks; do echo ../specs-v10/$n.json; done |
  xargs -P 4 -I{} sh -c 'n=$(basename {} .json); node runner.mjs {} ../data-v10/$n.jsonl.part 2> ../data-v10/$n.log && mv ../data-v10/$n.jsonl.part ../data-v10/$n.jsonl'
echo done
