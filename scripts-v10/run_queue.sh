#!/usr/bin/env bash
# Run specs in priority order, skipping any with a complete jsonl. 7 parallel.
cd "$(dirname "$0")"
export PATH="$HOME/.local/node22/bin:$PATH"
for n in E1_regime_structure E1_regime_structure_cs0 X1_monetary_preset X1_monetary_preset_cs0 E4_shocks_cs0 E4_shocks E6_sensitivity_M_cs0 E3_debt_housing_cs0 E3_debt_housing E2_distribution X2_fixes E6_sensitivity_M E6_sensitivity_S0 E6_sensitivity_S2 E7_hurdle E8_transition E9_ai; do
  [ -s ../data-v10/$n.jsonl ] || echo ../specs-v10/$n.json
done | xargs -P 6 -I{} sh -c 'n=$(basename {} .json); node runner.mjs {} ../data-v10/$n.jsonl.part 2> ../data-v10/$n.log && mv ../data-v10/$n.jsonl.part ../data-v10/$n.jsonl'
echo done
