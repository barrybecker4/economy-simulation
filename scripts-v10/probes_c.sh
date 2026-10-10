#!/usr/bin/env bash
# Rebate-off sensitivity with the P_NO_REBATE code patch (patched-v10), at defaults and choiceSpeed 0; then LEGACY base.
cd "$(dirname "$0")"; export PATH="$HOME/.local/node22/bin:$PATH"; O=../data-v10/review
r() { local tag=$1; shift; env "$@" node review_check.mjs ${G} > $O/$tag.json 2> $O/$tag.log; }
G=base r base_noRebate_cs0 NSEEDS=10 CS0=1 LIB=patched P_NO_REBATE=1
G=base r base_noRebate     NSEEDS=10 LIB=patched P_NO_REBATE=1
G=base r base_legacy       NSEEDS=10 LEGACY=1
echo done
