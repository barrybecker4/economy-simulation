#!/usr/bin/env bash
# Round-5 probes, run in parallel after the suite. Outputs ../data-v10/review/
cd "$(dirname "$0")"; export PATH="$HOME/.local/node22/bin:$PATH"
R=../data-v10/review
node probe_reserve_int.mjs > $R/reserve_int.json 2> $R/reserve_int.log &
node probe_channel_rates.mjs > $R/channel_rates.json 2> $R/channel_rates.log &
node probe_channel_rates_h3.mjs > $R/channel_rates_h3.json 2> $R/channel_rates_h3.log &
(node probe_supply_du.mjs > $R/supply_du.json 2> $R/supply_du.log; node probe_supply_path.mjs > $R/supply_path.json 2> $R/supply_path.log) &
(node probe_crash_localize.mjs > $R/crash_localize.json 2> $R/crash_localize.log; node probe_flh.mjs > $R/firm_hiring_identity.json 2> $R/flh_identity.log) &
node probe_benchmarks.mjs > $R/benchmarks.json 2> $R/benchmarks.log &
(P_NO_REBATE=1 node probe_rebate_off_patched.mjs > $R/rebate_off_patched.json 2> $R/rebate_off_patched.log; node probe_rebate_off_patched.mjs > $R/rebate_on_patched.json 2>> $R/rebate_off_patched.log) &
node probe_mortgage_legacy.mjs legacy > $R/legacy_book.json 2> $R/legacy_book.log &
node probe_mortgage_legacy.mjs modes > $R/mortgage_modes.json 2> $R/mortgage_modes.log &
node probe_mortgage_legacy.mjs s0modes > $R/mortgage_modes_s0.json 2> $R/mortgage_modes_s0.log &
wait
node x2_transition_cost.mjs > $R/x2_transition.json 2> $R/x2_transition.log &
node x3_good_bad_deflation.mjs > $R/x3_deflation.json 2> $R/x3_deflation.log &
wait
echo probes2-done
