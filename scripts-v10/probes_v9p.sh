#!/usr/bin/env bash
cd "$(dirname "$0")"; export PATH="$HOME/.local/node22/bin:$PATH"; O=../data-v10/review
G=base LIB=patched NSEEDS=10 node review_check.mjs base > $O/base_excessSign.json 2> $O/base_excessSign.log
G=stimsign LIB=patched NSEEDS=5 node review_check.mjs stimsign > $O/stimsign_excessSign.json 2> $O/stimsign_excessSign.log
