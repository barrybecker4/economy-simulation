#!/usr/bin/env bash
# Sequential review probes for round 5. Outputs ../data-v10/review/<name>.json
cd "$(dirname "$0")"; export PATH="$HOME/.local/node22/bin:$PATH"
R=../data-v10/review
for g in base hybrid resolution flh flhDemand supply channels subsidy hoardNewLoans tenure mortgage; do
  node review_check.mjs $g > $R/$g.json 2> $R/$g.log
done
LIB=patched P_NO_RESERVE_INT=1 node review_check.mjs reserveInt > $R/noReserveInt.json 2> $R/noReserveInt.log
LIB=patched P_MORT_NOMINAL=1 node review_check.mjs mortgage > $R/mortgage_nominal.json 2> $R/mortgage_nominal.log
LIB=patched P_MORT_NO_CAPLOSS=1 node review_check.mjs mortgage > $R/mortgage_nocaploss.json 2> $R/mortgage_nocaploss.log
echo review-done
