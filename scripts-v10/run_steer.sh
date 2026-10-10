#!/usr/bin/env bash
# Steering checks from strategizer-review-v6 (20 seeds each). Outputs ../data-v10/review/
cd "$(dirname "$0")"; export PATH="$HOME/.local/node22/bin:$PATH"
R=../data-v10/review
for g in wageElast slump realmort gaps; do node review_check.mjs $g > $R/$g.json 2> $R/$g.log & done
wait; echo steer-done
